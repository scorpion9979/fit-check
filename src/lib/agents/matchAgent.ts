import { z } from "zod";
import { Bid } from "@/lib/schema/bid";
import { ItemMetadata } from "@/lib/schema/item";
import { getCategoryStats } from "@/lib/schema/supplier";
import { RECOMMENDED_ACTIONS } from "@/lib/schema/enums";
import { hardFilter } from "@/lib/matching/hardFilter";
import { runMatcher } from "@/lib/matching/matcher";
import { ScoredMatch } from "@/lib/fitcheck/matchView";
import { generateJSON } from "./gateway";

// Cap how many hard-filter survivors the agent scores in one batched call.
const MAX_CANDIDATES = 10;

// Compact per-item judgment — keeps output small so one batched call stays fast.
const AssessmentSchema = z.object({
  item_id: z.string(),
  match_score: z.number().min(0).max(100),
  match_reason: z.string(),
  seller_profile: z.string(),
  recommended_action: z.enum(RECOMMENDED_ACTIONS),
  risk_flags: z.array(z.string()),
});
const BatchSchema = z.object({ assessments: z.array(AssessmentSchema) });

const SYSTEM = [
  "You are a resale sourcing match agent for Fleek.",
  "You are given ONE buyer trait bid and a LIST of candidate lots that already passed the buyer's hard filters (category, size, condition, price, gender).",
  "For EACH candidate, score the SOFT-TRAIT fit 0..100 as a weighted overlap of the buyer's weighted preferences (era, colours, fit, style) against that item's actual traits — higher-weighted traits matter more.",
  "Return one assessment per candidate, keyed by its exact item_id. match_reason: one concise sentence grounded only in the given traits.",
  "seller_profile: one or two sentences describing what this supplier specializes in and how they operate, grounded ONLY in their given stats (trust, fill rate, grade accuracy, response time, dispute rate). This is the buyer-facing 'AI seller profile'.",
  "risk_flags: short factual warnings (low grade accuracy, high dispute rate, weak overlap) or an empty list.",
  "recommended_action: make_offer (strong fit + reliable supplier), handpick (bundle listing), save_for_later, or pass (weak fit).",
  "Be precise and non-promotional. Never invent facts beyond the provided data.",
].join(" ");

function candidateFacts(bid: Bid, item: ItemMetadata, supplier: ScoredMatch["supplier"]) {
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

/** Map the deterministic matcher's cards into ScoredMatch[] for a uniform fallback. */
function fallbackScored(
  bid: Bid,
  items: ItemMetadata[],
  suppliers: ScoredMatch["supplier"][],
): ScoredMatch[] {
  const itemMap = new Map(items.map((i) => [i.item_id, i]));
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s]));
  const { cards } = runMatcher(bid, items, suppliers);
  return cards
    .map((c) => {
      const item = itemMap.get(c.item.item_id);
      const supplier = supplierMap.get(c.supplier.supplier_id);
      if (!item || !supplier) return null;
      return {
        item,
        supplier,
        score: c.match_score,
        reason: c.narrative.match_reason,
        action: c.narrative.recommended_action,
        risks: c.narrative.risk_flags,
        seller_profile: c.narrative.supplier_note,
      } satisfies ScoredMatch;
    })
    .filter((s): s is ScoredMatch => Boolean(s));
}

/**
 * LLM matcher: hard-filter (objective gate), then ONE batched agent call scores +
 * narrates every candidate (incl. an AI seller profile). Falls back to the
 * deterministic matcher if the gateway is down or returns nothing usable.
 */
export async function runMatchAgent(
  bid: Bid,
  items: ItemMetadata[],
  suppliers: ScoredMatch["supplier"][],
): Promise<ScoredMatch[]> {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s]));

  const candidates = items
    .filter((item) => hardFilter(bid, item).pass)
    .map((item) => ({ item, supplier: supplierMap.get(item.supplier_id) }))
    .filter((c): c is { item: ItemMetadata; supplier: ScoredMatch["supplier"] } => Boolean(c.supplier))
    .slice(0, MAX_CANDIDATES);

  if (!candidates.length) return [];

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
      maxOutputTokens: 2000,
      timeoutMs: 60000,
    });
    assessments = out.assessments;
    if (!assessments.length) return fallbackScored(bid, items, suppliers);
  } catch {
    return fallbackScored(bid, items, suppliers);
  }

  const byId = new Map(assessments.map((a) => [a.item_id, a]));
  const scored = candidates
    .map(({ item, supplier }) => {
      const a = byId.get(item.item_id);
      if (!a) return null;
      return {
        item,
        supplier,
        score: a.match_score,
        reason: a.match_reason,
        action: a.recommended_action,
        risks: a.risk_flags,
        seller_profile: a.seller_profile,
      } satisfies ScoredMatch;
    })
    .filter((s): s is ScoredMatch => Boolean(s));

  if (!scored.length) return fallbackScored(bid, items, suppliers);

  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, 10);
}
