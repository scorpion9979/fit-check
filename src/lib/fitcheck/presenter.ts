import { Bid } from "@/lib/schema/bid";
import { ItemMetadata } from "@/lib/schema/item";
import { SupplierProfile } from "@/lib/schema/supplier";
import { hardFilter } from "@/lib/matching/hardFilter";
import { softScore } from "@/lib/matching/softScore";
import { supplierMultiplier } from "@/lib/matching/supplierMultiplier";
import { ConditionGrade } from "@/lib/schema/enums";
import { Glyph, categoryLeaf, glyphFor } from "./glyph";

export type { Glyph };
export { categoryLeaf, glyphFor };

/** Deterministic resale multiplier by grade — no randomness, so cards are stable. */
const RESALE_MULTIPLIER: Record<ConditionGrade, number> = { A: 3.8, B: 3.4, C: 3.0, D: 2.4 };

/** Rough sustainability figures keyed off the garment category leaf. */
const IMPACT_TABLE: { test: (leaf: string) => boolean; co2: number; water: number }[] = [
  { test: (l) => l.includes("jean") || l.includes("denim"), co2: 23, water: 3700 },
  { test: (l) => l.includes("coat"), co2: 18, water: 3100 },
  { test: (l) => l.includes("jacket"), co2: 11, water: 2300 },
  { test: (l) => l.includes("sweater") || l.includes("knit"), co2: 9, water: 1100 },
  { test: (l) => l.includes("dress"), co2: 9, water: 1800 },
  { test: (l) => l.includes("t-shirt") || l.includes("tee") || l.includes("top"), co2: 6, water: 2700 },
];

export interface Economics {
  cost: number;
  resale: number;
  margin: number;
  impact: string;
}

export function estimateEconomics(item: ItemMetadata): Economics {
  const cost = item.listing_type === "bundle" && item.bundle ? item.bundle.price_per_unit_gbp : item.price_gbp;
  const resale = Math.round(cost * (RESALE_MULTIPLIER[item.condition.grade] ?? 3.2));
  const margin = cost > 0 ? Math.round(((resale - cost) / cost) * 100) : 0;
  const leaf = categoryLeaf(item.category).toLowerCase();
  const row = IMPACT_TABLE.find((r) => r.test(leaf)) ?? { co2: 10, water: 2000 };
  return {
    cost,
    resale,
    margin,
    impact: `${row.co2}kg CO₂ · ${row.water.toLocaleString()}L water saved / unit`,
  };
}

/** How many of the supplied open bids this item clears (hard pass + soft ≥ threshold). */
export function countMatchingBids(item: ItemMetadata, bids: Bid[]): number {
  let n = 0;
  for (const bid of bids) {
    if (!hardFilter(bid, item).pass) continue;
    if (softScore(bid, item) >= bid.match_threshold) n++;
  }
  return n;
}

export interface DeckCard {
  item_id: string;
  glyph: Glyph;
  tile: string;
  brand: string;
  brand_confidence: string;
  title: string;
  grade: ConditionGrade;
  grade_variant: "" | "out" | "g";
  category: string;
  size: string;
  gender: string;
  soft: { key: string; value: string; note: string }[];
  measurements: string;
  defect: string;
  cost: string;
  resale: string;
  margin: string;
  impact: string;
  qty: string;
  matches: number;
}

const TILE_COLORS = ["#fff386", "#f3f3f3"];

function formatMeasurements(item: ItemMetadata): string {
  const m = item.measurements_cm;
  const parts: string[] = [];
  if (m.pit_to_pit) parts.push(`${m.pit_to_pit}cm pit-to-pit`);
  if (m.waist) parts.push(`${m.waist}cm waist`);
  if (m.length) parts.push(`${m.length}cm length`);
  if (m.inseam) parts.push(`${m.inseam}cm inseam`);
  return parts.join(" · ") || "measurements pending";
}

function formatDefect(item: ItemMetadata): string {
  if (!item.defects.length) return "none flagged";
  const d = item.defects[0];
  return `${d.type.replace(/_/g, " ")} · ${d.location} · ${d.severity}`;
}

function gradeVariant(grade: ConditionGrade): "" | "out" | "g" {
  if (grade === "A") return "out";
  if (grade === "C" || grade === "D") return "g";
  return "";
}

export function toDeckCard(item: ItemMetadata, bids: Bid[], index: number): DeckCard {
  const econ = estimateEconomics(item);
  const size = `${item.size.label} / ${item.size.system}`;
  const soft = [
    { key: "era", value: item.era, note: item.confidence.era ? `·${Math.round(item.confidence.era * 100)}%` : "" },
    { key: "fit", value: item.fit, note: "" },
    { key: "colours", value: item.colors.primary.replace(/_/g, " "), note: "" },
    { key: "style", value: (item.style_tags[0] ?? "—").replace(/_/g, " "), note: "" },
  ];
  const qty =
    item.listing_type === "bundle" && item.bundle ? `lot of ${item.bundle.qty}` : "single unit";
  return {
    item_id: item.item_id,
    glyph: glyphFor(item.category),
    tile: TILE_COLORS[index % TILE_COLORS.length],
    brand: item.brand.name,
    brand_confidence: item.brand.confidence.toFixed(2),
    title: `${item.era !== "unknown" ? item.era + " " : ""}${item.brand.name} — ${categoryLeaf(item.category)}`,
    grade: item.condition.grade,
    grade_variant: gradeVariant(item.condition.grade),
    category: categoryLeaf(item.category),
    size,
    gender: item.gender,
    soft,
    measurements: formatMeasurements(item),
    defect: formatDefect(item),
    cost: `£${econ.cost}`,
    resale: `£${econ.resale}`,
    margin: `+${econ.margin}%`,
    impact: econ.impact,
    qty,
    matches: countMatchingBids(item, bids),
  };
}

export interface BookEntry {
  bid_id: string;
  price: string;
  unit: string;
  hard: { key: string; value: string }[];
  soft: { key: string; value: string; weight: string }[];
  score: number;
  threshold: number;
  status: "open" | "cleared";
  stat: string;
  raw_query?: string;
}

/** Order-book view of a bid: best weighted-overlap score + how many live lots clear it. */
export function toBookEntry(bid: Bid, items: ItemMetadata[], suppliers: SupplierProfile[]): BookEntry {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s]));
  let candidates = 0;
  let cleared = 0;
  let bestScore = 0;

  for (const item of items) {
    if (!hardFilter(bid, item).pass) continue;
    candidates++;
    const soft = softScore(bid, item);
    const supplier = supplierMap.get(item.supplier_id);
    const composite = supplier ? soft * supplierMultiplier(bid, supplier) : soft;
    if (composite > bestScore) bestScore = composite;
    if (soft >= bid.match_threshold) cleared++;
  }

  const score = Math.min(1, Math.round(bestScore * 100) / 100);
  const status: "open" | "cleared" = cleared > 0 ? "cleared" : "open";

  const softLabels: Record<string, string> = {
    era: "era",
    colors: "colours",
    fit: "fit",
    style_tags: "style",
    brand: "brand",
    material: "material",
  };
  const soft = Object.entries(bid.soft)
    .filter(([, v]) => v)
    .map(([k, v]) => ({
      key: softLabels[k] ?? k,
      value: v!.want.map((w) => w.replace(/_/g, " ")).join(" · "),
      weight: `·${Math.round(v!.w * 100)}`,
    }));

  return {
    bid_id: bid.bid_id,
    price: `£${bid.hard.max_price_gbp}`,
    unit: `/unit · ${candidates} candidate${candidates === 1 ? "" : "s"}`,
    hard: [
      { key: "category", value: categoryLeaf(bid.hard.category) },
      { key: "size", value: bid.hard.size_label.join(" / ") },
      { key: "grade", value: `≥ ${bid.hard.condition_min}` },
      { key: "max", value: `£${bid.hard.max_price_gbp}` },
    ],
    soft,
    score,
    threshold: bid.match_threshold,
    status,
    stat: `${cleared} / ${candidates} cleared`,
    raw_query: bid.raw_query,
  };
}
