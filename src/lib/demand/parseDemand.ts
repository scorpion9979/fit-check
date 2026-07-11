import {
  Bid,
  COLOR_ALIASES,
  DEMO_BID,
  ERA_ALIASES,
  FIT_ALIASES,
  STYLE_ALIASES,
} from "../schema/bid";
import { JACKETS_CATEGORY, ConditionGrade, SizeLabel } from "../schema/enums";

export interface ParseResult {
  bid: Bid;
  mappings: { phrase: string; mapped_to: string[] }[];
}

function extractPrice(query: string): number {
  const match = query.match(/£?\s*(\d+)/i);
  if (match) return Number(match[1]);
  if (/under\s*£?\s*45|below\s*45|<\s*45/i.test(query)) return 45;
  return 50;
}

function extractSizes(query: string): SizeLabel[] {
  const sizes: SizeLabel[] = [];
  const upper = query.toUpperCase();
  if (/L[\s\-–]XL|L-XL|L\/XL/i.test(query)) return ["L", "XL"];
  for (const s of ["XS", "S", "M", "L", "XL", "XXL"] as SizeLabel[]) {
    if (new RegExp(`\\b${s}\\b`).test(upper)) sizes.push(s);
  }
  return sizes.length ? sizes : ["L", "XL"];
}

function extractCondition(query: string): ConditionGrade {
  if (/grade\s*a|condition\s*a|\bA grade\b/i.test(query)) return "A";
  if (/grade\s*c|\bC grade\b/i.test(query)) return "C";
  if (/grade\s*b|B or better|grade B/i.test(query)) return "B";
  return "B";
}

function findAliasMappings(query: string): { phrase: string; mapped_to: string[] }[] {
  const lower = query.toLowerCase();
  const mappings: { phrase: string; mapped_to: string[] }[] = [];

  const aliasGroups = [
    { phrase: "earth tones", aliases: COLOR_ALIASES },
    { phrase: "90s", aliases: ERA_ALIASES },
    { phrase: "y2k", aliases: ERA_ALIASES },
    { phrase: "gorpcore", aliases: STYLE_ALIASES },
    { phrase: "boxy", aliases: FIT_ALIASES },
    { phrase: "oversized", aliases: FIT_ALIASES },
  ];

  for (const { phrase, aliases } of aliasGroups) {
    if (lower.includes(phrase) && aliases[phrase]) {
      mappings.push({ phrase, mapped_to: [...aliases[phrase]] });
    }
  }

  if (/earth tone/i.test(lower) && !mappings.some((m) => m.phrase === "earth tones")) {
    mappings.push({ phrase: "earth tones", mapped_to: [...COLOR_ALIASES["earth tones"]] });
  }

  return mappings;
}

export function parseDemand(query: string, buyerId = "buyer_001"): ParseResult {
  const lower = query.toLowerCase();

  if (
    lower.includes("gorpcore") &&
    (lower.includes("90s") || lower.includes("y2k")) &&
    (lower.includes("earth tone") || lower.includes("jacket"))
  ) {
    return {
      bid: {
        ...DEMO_BID,
        bid_id: `bid_${Date.now()}`,
        buyer_id: buyerId,
        created_at: new Date().toISOString(),
        raw_query: query,
      },
      mappings: [
        { phrase: "earth tones", mapped_to: ["forest_green", "brown", "tan"] },
        { phrase: "90s/y2k", mapped_to: ["90s", "y2k"] },
        { phrase: "gorpcore", mapped_to: ["gorpcore"] },
        { phrase: "boxy fit", mapped_to: ["boxy", "oversized"] },
        { phrase: "L-XL", mapped_to: ["L", "XL"] },
      ],
    };
  }

  const mappings = findAliasMappings(query);
  const colorWant =
    mappings.find((m) => m.phrase === "earth tones")?.mapped_to ??
    (lower.includes("green") ? ["forest_green", "olive"] : ["forest_green", "brown", "tan"]);

  const eraWant: string[] = [];
  if (lower.includes("90")) eraWant.push("90s");
  if (lower.includes("y2k") || lower.includes("2000")) eraWant.push("y2k");
  if (!eraWant.length) eraWant.push("90s", "y2k");

  const fitWant: string[] = [];
  if (lower.includes("boxy")) fitWant.push("boxy");
  if (lower.includes("oversized")) fitWant.push("oversized");
  if (!fitWant.length) fitWant.push("boxy", "oversized");

  const styleWant = lower.includes("gorpcore") ? ["gorpcore"] : ["gorpcore"];

  const bid: Bid = {
    bid_id: `bid_${Date.now()}`,
    buyer_id: buyerId,
    created_at: new Date().toISOString(),
    expires: new Date(Date.now() + 30 * 86400000).toISOString(),
    hard: {
      category: lower.includes("coat")
        ? "Apparel & Accessories > Clothing > Outerwear > Coats"
        : JACKETS_CATEGORY,
      size_label: extractSizes(query),
      condition_min: extractCondition(query),
      max_price_gbp: extractPrice(query),
      gender: "unisex",
    },
    soft: {
      era: { want: eraWant, w: 0.3 },
      colors: { want: colorWant, w: 0.25 },
      fit: { want: fitWant, w: 0.2 },
      style_tags: { want: styleWant, w: 0.25 },
    },
    match_threshold: 0.75,
    min_confidence: 0.8,
    raw_query: query,
  };

  return { bid, mappings };
}

export function getDemoBid(): Bid {
  return { ...DEMO_BID };
}
