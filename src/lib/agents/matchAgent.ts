import { z } from "zod";
import { Bid } from "@/lib/schema/bid";
import { ItemMetadata } from "@/lib/schema/item";
import { MatchCard, MatchResult, getMatchLabel } from "@/lib/schema/match";
import { SupplierProfile, getCategoryStats } from "@/lib/schema/supplier";
import { MATCH_LABELS, RECOMMENDED_ACTIONS } from "@/lib/schema/enums";
import { hardFilter } from "@/lib/matching/hardFilter";
import { runMatcher } from "@/lib/matching/matcher";
import { generateJSON } from "./gateway";

// Cap how many hard-filter survivors the agent scores in one batched call.
const MAX_CANDIDATES = 10;

// Compact per-item judgment — keeps output small so one batched call stays fast.
const AssessmentSchema = z.object({
  item_id: z.string(),
  match_score: z.number().min(0).max(100),
  match_label: z.enum(MATCH_LABELS),
  match_reason: z.string(),
  recommended_action: z.enum(RECOMMENDED_ACTIONS),
  risk_flags: z.array(z.string()),
});
const BatchSchema = z.object({ assessments: z.array(AssessmentSchema) });

const SYSTEM = [
  "You are a resale sourcing match agent for Fleek.",
  "You are given ONE buyer trait bid and a LIST of candidate lots that already passed the buyer's hard filters (category, size, condition, price, gender).",
  "For EACH candidate, score the SOFT-TRAIT fit 0..100 as a weighted overlap of the buyer's weighted preferences (era, colours, fit, style) against that item's actual traits — higher-weighted traits matter more.",
  "Return one assessment per candidate, keyed by its exact item_id. Keep match_reason to one concise sentence grounded only in the given traits.",
  "risk_flags: short factual warnings (low grade accuracy, high dispute rate, weak overlap) or an empty list.",
  "recommended_action: make_offer (strong fit + reliable supplier), handpick (bundle listing), save_for_later, or pass (weak fit).",
  "Be precise and non-promotional. Never invent facts beyond the provided data.",
].join(" ");

/** Factual supplier line — a stat lookup, computed rather than generated. */
function supplierNote(supplier: SupplierProfile, stats: ReturnType<typeof getCategoryStats>): string {
  if (stats) {
    return `${supplier.name} has ${Math.round(stats.fill_rate * 100)}% fill rate in this category with ${Math.round(
      stats.avg_grade_accuracy * 100,
    )}% grade accuracy.`;
  }
  return `${supplier.name} — trust score ${supplier.overall_trust_score}/100.`;
}

/** Factual pricing line — compares the ask to the supplier's 90d average. */
function pricingNote(item: ItemMetadata, avg?: number): string {
  if (avg == null) return `£${item.price_gbp} listed.`;
  if (item.price_gbp < avg) return `£${item.price_gbp} — below the £${avg} 90d average.`;
  if (item.price_gbp > avg) return `£${item.price_gbp} — above the £${avg} 90d average.`;
  return `£${item.price_gbp} — matches the 90d average.`;
}

function candidateFacts(bid: Bid, item: ItemMetadata, supplier: SupplierProfile) {
  const stats = getCategoryStats(supplier, bid.hard.category);
  const pricing = supplier.pricing_history.find(
    (p) => p.category === bid.hard.category && p.condition_grade === item.condition.grade,
  );
  return {
    item_id: item.item_id,
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
    supplier: {
      name: supplier.name,
      trust: supplier.overall_trust_score,
      fill_rate: stats?.fill_rate,
      grade_accuracy: stats?.avg_grade_accuracy,
      response_hours: stats?.avg_response_hours,
      dispute_rate: stats?.dispute_rate,
      category_avg_price_gbp: pricing?.avg_price_gbp,
    },
  };
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

/**
 * LLM matcher: hard-filter (objective gate), then ONE batched agent call scores +
 * narrates every candidate. Falls back to the deterministic matcher if the gateway
 * is down or returns nothing usable.
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
    .filter((c): c is { item: ItemMetadata; supplier: SupplierProfile } => Boolean(c.supplier))
    .slice(0, MAX_CANDIDATES);

  if (!candidates.length) return { results: [], cards: [] };

  let assessments: z.infer<typeof AssessmentSchema>[];
  try {
    const facts = candidates.map(({ item, supplier }) => candidateFacts(bid, item, supplier));
    const out = await generateJSON({
      schema: BatchSchema,
      feature: "match",
      system: SYSTEM,
      prompt: [
        `Buyer soft preferences (with weights): ${JSON.stringify(bid.soft)}`,
        `Candidate lots (${facts.length}):`,
        JSON.stringify(facts),
        "Return an assessment for every candidate, keyed by item_id.",
      ].join("\n"),
      maxOutputTokens: 1600,
      timeoutMs: 60000,
    });
    assessments = out.assessments;
    if (!assessments.length) return runMatcher(bid, items, suppliers);
  } catch {
    return runMatcher(bid, items, suppliers);
  }

  const byId = new Map(assessments.map((a) => [a.item_id, a]));
  const scored = candidates
    .map(({ item, supplier }) => {
      const a = byId.get(item.item_id);
      return a ? { item, supplier, a } : null;
    })
    .filter((s): s is { item: ItemMetadata; supplier: SupplierProfile; a: z.infer<typeof AssessmentSchema> } =>
      Boolean(s),
    );

  if (!scored.length) return runMatcher(bid, items, suppliers);

  scored.sort((x, y) => y.a.match_score - x.a.match_score);
  const top = scored.slice(0, 10);

  const cards: MatchCard[] = [];
  const results: MatchResult[] = [];

  top.forEach(({ item, supplier, a }, i) => {
    const rank = i + 1;
    const score01 = a.match_score / 100;
    const stats = getCategoryStats(supplier, bid.hard.category);
    const pricing = supplier.pricing_history.find(
      (p) => p.category === bid.hard.category && p.condition_grade === item.condition.grade,
    );

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
        supplier_note: supplierNote(supplier, stats),
        pricing_note: pricingNote(item, pricing?.avg_price_gbp),
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
