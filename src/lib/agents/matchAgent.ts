import { z } from "zod";
import { Bid } from "@/lib/schema/bid";
import { ItemMetadata } from "@/lib/schema/item";
import { MatchCard, MatchResult, getMatchLabel } from "@/lib/schema/match";
import { SupplierProfile, getCategoryStats } from "@/lib/schema/supplier";
import { MATCH_LABELS, RECOMMENDED_ACTIONS } from "@/lib/schema/enums";
import { hardFilter } from "@/lib/matching/hardFilter";
import { runMatcher } from "@/lib/matching/matcher";
import { generateJSON } from "./gateway";

const AssessmentSchema = z.object({
  match_score: z.number().min(0).max(100),
  match_label: z.enum(MATCH_LABELS),
  match_reason: z.string(),
  supplier_note: z.string(),
  pricing_note: z.string(),
  recommended_action: z.enum(RECOMMENDED_ACTIONS),
  risk_flags: z.array(z.string()),
});

const SYSTEM = [
  "You are a resale sourcing match agent for Fleek.",
  "You judge how well a supplier's lot fits a buyer's trait bid. The lot has already passed the buyer's hard filters (category, size, condition, price, gender).",
  "Score the SOFT-TRAIT fit 0..100 using weighted overlap of the buyer's weighted preferences (era, colours, fit, style) against the item's actual traits — higher weight traits matter more.",
  "Write a concise, factual match_reason grounded only in the given traits; a supplier_note from the supplier's stats; and a pricing_note comparing the ask to the supplier's category average when available.",
  "risk_flags: short factual warnings (e.g. low grade accuracy, high dispute rate, weak trait overlap) or an empty list.",
  "recommended_action: make_offer (strong fit + reliable supplier), handpick (bundle listings), save_for_later, or pass (weak fit).",
  "Be precise and non-promotional. Do not invent facts beyond the provided data.",
].join(" ");

function itemFacts(item: ItemMetadata): string {
  return JSON.stringify({
    brand: item.brand.name,
    era: item.era,
    fit: item.fit,
    colors: [item.colors.primary, ...item.colors.secondary],
    style_tags: item.style_tags,
    material: item.material,
    condition_grade: item.condition.grade,
    price_gbp: item.price_gbp,
    listing_type: item.listing_type,
    defects: item.defects.map((d) => `${d.type}/${d.severity}`),
  });
}

function generateTitle(item: ItemMetadata): string {
  return [item.era !== "unknown" ? item.era : null, item.brand.name, item.fit, "Jacket"]
    .filter(Boolean)
    .join(" ");
}

function avgConfidence(item: ItemMetadata): number {
  const values = Object.values(item.confidence);
  if (!values.length) return 0.85;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function assess(bid: Bid, item: ItemMetadata, supplier: SupplierProfile) {
  const stats = getCategoryStats(supplier, bid.hard.category);
  const pricing = supplier.pricing_history.find(
    (p) => p.category === bid.hard.category && p.condition_grade === item.condition.grade,
  );
  const prompt = [
    `Buyer soft preferences (with weights): ${JSON.stringify(bid.soft)}`,
    `Item traits: ${itemFacts(item)}`,
    `Supplier: ${supplier.name}, trust ${supplier.overall_trust_score}/100` +
      (stats
        ? `, category fill_rate ${stats.fill_rate}, grade_accuracy ${stats.avg_grade_accuracy}, response_hrs ${stats.avg_response_hours}, dispute_rate ${stats.dispute_rate}`
        : ", no category stats"),
    pricing
      ? `Supplier 90d ${item.condition.grade}-grade avg price: £${pricing.avg_price_gbp}`
      : "No pricing history for this grade.",
    "Assess the match.",
  ].join("\n");

  return generateJSON({
    schema: AssessmentSchema,
    feature: "match",
    system: SYSTEM,
    prompt,
    maxOutputTokens: 512,
  });
}

/**
 * LLM matcher: hard-filter (objective gate), then the match agent scores + narrates
 * each candidate. Falls back to the deterministic matcher if the gateway is down.
 */
export async function runMatcherLLM(
  bid: Bid,
  items: ItemMetadata[],
  suppliers: SupplierProfile[],
): Promise<{ results: MatchResult[]; cards: MatchCard[] }> {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s]));
  const matchedAt = new Date().toISOString();

  const candidates = items
    .filter((item) => hardFilter(bid, item).pass)
    .map((item) => ({ item, supplier: supplierMap.get(item.supplier_id) }))
    .filter((c): c is { item: ItemMetadata; supplier: SupplierProfile } => Boolean(c.supplier));

  if (!candidates.length) return { results: [], cards: [] };

  let scored: {
    item: ItemMetadata;
    supplier: SupplierProfile;
    a: z.infer<typeof AssessmentSchema>;
  }[];
  try {
    scored = await Promise.all(
      candidates.map(async ({ item, supplier }) => ({ item, supplier, a: await assess(bid, item, supplier) })),
    );
  } catch {
    // Any candidate failing means the gateway is unhealthy — fall back wholesale.
    return runMatcher(bid, items, suppliers);
  }

  scored.sort((x, y) => y.a.match_score - x.a.match_score);
  const top = scored.slice(0, 10);

  const cards: MatchCard[] = [];
  const results: MatchResult[] = [];

  top.forEach(({ item, supplier, a }, i) => {
    const rank = i + 1;
    const score01 = a.match_score / 100;
    const stats = getCategoryStats(supplier, bid.hard.category);

    results.push({
      match_id: `match_${bid.bid_id}_${item.item_id}`,
      bid_id: bid.bid_id,
      item_id: item.item_id,
      supplier_id: item.supplier_id,
      hard_pass: true,
      hard_details: hardFilter(bid, item).details,
      soft_score: score01,
      supplier_multiplier: 1,
      composite_score: score01,
      rank,
      matched_at: matchedAt,
    });

    cards.push({
      match_id: `match_${bid.bid_id}_${item.item_id}`,
      bid_id: bid.bid_id,
      rank,
      match_score: Math.round(a.match_score),
      match_label: a.match_label ?? getMatchLabel(score01),
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
        category_fill_rate: stats?.fill_rate ?? 0,
        category_grade_accuracy: stats?.avg_grade_accuracy ?? 0,
        avg_response_hours: stats?.avg_response_hours ?? 24,
        specialization_match: bid.soft.style_tags
          ? bid.soft.style_tags.want.some((t) => supplier.specialization.includes(t as never))
          : false,
      },
      narrative: {
        match_reason: a.match_reason,
        supplier_note: a.supplier_note,
        pricing_note: a.pricing_note,
        recommended_action: a.recommended_action,
        risk_flags: a.risk_flags,
      },
      confidence: {
        item_extraction: avgConfidence(item),
        match_certainty: score01,
      },
      created_at: matchedAt,
    });
  });

  return { results, cards };
}
