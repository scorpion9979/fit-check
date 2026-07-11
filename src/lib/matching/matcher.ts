import { Bid } from "../schema/bid";
import { ItemMetadata } from "../schema/item";
import {
  MatchCard,
  MatchResult,
  getMatchLabel,
} from "../schema/match";
import { SupplierProfile, getCategoryStats } from "../schema/supplier";
import { hardFilter } from "./hardFilter";
import { softScore, getTraitBreakdown } from "./softScore";
import { hasSpecializationMatch, supplierMultiplier } from "./supplierMultiplier";
import { generateNarrative } from "../narrative/templates";

const MAX_RESULTS = 10;

function generateTitle(item: ItemMetadata): string {
  const parts = [item.era !== "unknown" ? item.era : null, item.brand.name, item.fit, "Jacket"];
  return parts.filter(Boolean).join(" ");
}

function avgConfidence(item: ItemMetadata): number {
  const values = Object.values(item.confidence);
  if (values.length === 0) return 0.85;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function toMatchCard(
  result: MatchResult,
  bid: Bid,
  item: ItemMetadata,
  supplier: SupplierProfile,
): MatchCard {
  const categoryStats = getCategoryStats(supplier, bid.hard.category);
  const traitBreakdown = getTraitBreakdown(bid, item);
  const pricing = supplier.pricing_history.find(
    (p) => p.category === bid.hard.category && p.condition_grade === item.condition.grade,
  );

  const narrative = generateNarrative({
    item,
    supplier,
    result,
    categoryStats,
    pricing,
    traitBreakdown,
  });

  return {
    match_id: result.match_id,
    bid_id: result.bid_id,
    rank: result.rank,
    match_score: Math.round(result.composite_score * 100),
    match_label: getMatchLabel(result.composite_score),
    item: {
      item_id: item.item_id,
      image_url: item.image_url,
      title: generateTitle(item),
      category: item.category,
      size: item.size,
      condition: item.condition,
      price_gbp: item.price_gbp,
      era: item.era,
      style_tags: item.style_tags,
      listing_type: item.listing_type,
      bundle: item.bundle,
    },
    supplier: {
      supplier_id: supplier.supplier_id,
      name: supplier.name,
      avatar_url: supplier.avatar_url,
      trust_score: supplier.overall_trust_score,
      category_fill_rate: categoryStats?.fill_rate ?? 0,
      category_grade_accuracy: categoryStats?.avg_grade_accuracy ?? 0,
      avg_response_hours: categoryStats?.avg_response_hours ?? 24,
      specialization_match: hasSpecializationMatch(bid, supplier),
    },
    narrative,
    confidence: {
      item_extraction: avgConfidence(item),
      match_certainty: result.soft_score,
    },
    created_at: result.matched_at,
  };
}

export function runMatcher(
  bid: Bid,
  items: ItemMetadata[],
  suppliers: SupplierProfile[],
): { results: MatchResult[]; cards: MatchCard[] } {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s]));
  const matchedAt = new Date().toISOString();
  const results: MatchResult[] = [];

  for (const item of items) {
    const { pass, details } = hardFilter(bid, item);
    if (!pass) continue;

    const soft = softScore(bid, item);
    if (soft < bid.match_threshold) continue;

    const supplier = supplierMap.get(item.supplier_id);
    if (!supplier) continue;

    const multiplier = supplierMultiplier(bid, supplier);
    const composite = soft * multiplier;

    results.push({
      match_id: `match_${bid.bid_id}_${item.item_id}`,
      bid_id: bid.bid_id,
      item_id: item.item_id,
      supplier_id: item.supplier_id,
      hard_pass: true,
      hard_details: details,
      soft_score: soft,
      supplier_multiplier: multiplier,
      composite_score: composite,
      rank: 0,
      matched_at: matchedAt,
    });
  }

  results.sort((a, b) => b.composite_score - a.composite_score);
  const top = results.slice(0, MAX_RESULTS);
  top.forEach((r, i) => {
    r.rank = i + 1;
  });

  const itemMap = new Map(items.map((i) => [i.item_id, i]));
  const cards = top
    .map((result) => {
      const item = itemMap.get(result.item_id)!;
      const supplier = supplierMap.get(result.supplier_id)!;
      return toMatchCard(result, bid, item, supplier);
    });

  return { results: top, cards };
}
