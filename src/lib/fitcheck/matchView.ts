import { Bid } from "@/lib/schema/bid";
import { ItemMetadata } from "@/lib/schema/item";
import { SupplierProfile, getCategoryStats } from "@/lib/schema/supplier";
import { RecommendedAction } from "@/lib/schema/enums";
import { getTraitBreakdown } from "@/lib/matching/softScore";
import { categoryLeaf } from "./glyph";

/** The exact card shape the Matches tab renders (photo gallery + breakdowns + AI profile). */
export interface MatchView {
  id: string;
  gallery: string[];
  title: string;
  price: string;
  lot: string;
  lotVal: number;
  units: number;
  match: number;
  grade: string;
  hard: { want: string; got: string }[];
  soft: { t: string; m: number }[];
  supplier: string;
  rating: number;
  reviews: number;
  aiProfile: string;
  action: RecommendedAction;
  risks: string[];
}

/** A ranked, scored + narrated match, produced by the LLM matcher (or deterministic fallback). */
export interface ScoredMatch {
  item: ItemMetadata;
  supplier: SupplierProfile;
  score: number; // 0..100
  reason: string;
  action: RecommendedAction;
  risks: string[];
  seller_profile: string;
}

/** No real multi-shot photos in the demo — derive gallery frames via Unsplash crop anchors. */
function galleryFor(imageUrl: string): string[] {
  if (!imageUrl) return [];
  if (!imageUrl.includes("images.unsplash.com")) return [imageUrl];
  const sep = imageUrl.includes("?") ? "&" : "?";
  return [imageUrl, `${imageUrl}${sep}crop=top`, `${imageUrl}${sep}crop=bottom`];
}

const humanize = (s: string) => s.replace(/_/g, " ");

function softLabel(trait: string, want: string[]): string {
  const list = want.map(humanize).join(" / ");
  switch (trait) {
    case "fit":
      return `${list} fit`;
    case "colors":
      return list;
    case "brand":
      return `brand: ${list}`;
    default:
      return list;
  }
}

function title(item: ItemMetadata): string {
  return [item.era !== "unknown" ? item.era : null, item.brand.name, item.fit, categoryLeaf(item.category)]
    .filter(Boolean)
    .join(" ");
}

export function toMatchView(bid: Bid, m: ScoredMatch): MatchView {
  const { item, supplier } = m;
  const bundle = item.listing_type === "bundle" ? item.bundle : undefined;
  const unitPrice = bundle ? bundle.price_per_unit_gbp : item.price_gbp;
  const units = bundle ? bundle.moq : 10;
  const lotVal = Math.round(unitPrice * units);
  const stats = getCategoryStats(supplier, bid.hard.category);

  const hard = [
    { want: `Category · ${categoryLeaf(bid.hard.category)}`, got: categoryLeaf(item.category) },
    { want: `Size · ${bid.hard.size_label.join("/")}`, got: item.size.label },
    { want: `Grade · ≥ ${bid.hard.condition_min}`, got: item.condition.grade },
    { want: `Price · ≤ £${bid.hard.max_price_gbp}`, got: `£${item.price_gbp}` },
  ];

  const soft = getTraitBreakdown(bid, item).map((b) => ({
    t: softLabel(b.trait, b.want),
    m: b.overlap,
  }));

  const rating = Math.min(5, Math.max(3, Math.round((supplier.overall_trust_score / 20) * 10) / 10));
  const reviews = stats?.items_sold ?? supplier.category_stats.reduce((a, c) => a + c.items_sold, 0) ?? 0;

  return {
    id: item.item_id,
    gallery: galleryFor(item.image_url),
    title: title(item),
    price: `£${unitPrice}/unit`,
    lot: `£${lotVal} lot · MOQ ${units}`,
    lotVal,
    units,
    match: Math.round(m.score),
    grade: item.condition.grade,
    hard,
    soft,
    supplier: supplier.name,
    rating,
    reviews,
    aiProfile: m.seller_profile,
    action: m.action,
    risks: m.risks,
  };
}
