import { z } from "zod";
import { Bid } from "@/lib/schema/bid";
import { ItemMetadata } from "@/lib/schema/item";
import { SupplierProfile, getCategoryStats } from "@/lib/schema/supplier";
import { RECOMMENDED_ACTIONS } from "@/lib/schema/enums";
import { hardFilter } from "@/lib/matching/hardFilter";
import { runMatcher } from "@/lib/matching/matcher";
import { ScoredMatch } from "@/lib/fitcheck/matchView";
import { categoryLeaf } from "@/lib/fitcheck/glyph";
import { generateJSON } from "./gateway";

// Cap how many hard-filter survivors the agent scores in one batched call.
const MAX_CANDIDATES = 8;

// --- Scoring agent: lean per-item judgment (kept small so the batch stays fast) ---
const ScoreSchema = z.object({
  item_id: z.string(),
  match_score: z.number().min(0).max(100),
  match_reason: z.string(),
  recommended_action: z.enum(RECOMMENDED_ACTIONS),
  risk_flags: z.array(z.string()),
});
const ScoreBatchSchema = z.object({ assessments: z.array(ScoreSchema) });

const SCORE_SYSTEM = [
  "You are a resale sourcing match agent for Fleek.",
  "You get ONE buyer trait bid and a LIST of candidate lots that already passed the buyer's hard filters.",
  "For EACH candidate, score the SOFT-TRAIT fit 0..100 as a weighted overlap of the buyer's weighted preferences (era, colours, fit, style) against the item's actual traits — higher-weighted traits matter more.",
  "Return one assessment per candidate keyed by its exact item_id. match_reason: ONE short sentence grounded only in the given traits.",
  "risk_flags: short factual warnings or an empty list. recommended_action: make_offer, handpick (bundles), save_for_later, or pass.",
  "Be precise. Never invent facts beyond the provided data.",
].join(" ");

// --- Seller-profile agent: one short prose profile per unique supplier ---
const ProfileSchema = z.object({
  profiles: z.array(z.object({ supplier_id: z.string(), profile: z.string() })),
});
const PROFILE_SYSTEM = [
  "You write short buyer-facing 'AI seller profiles' for a resale marketplace.",
  "For each supplier, write ONE or TWO sentences describing what they specialize in and how they operate, grounded ONLY in the given stats (specialization, fill rate, grade accuracy, response time, dispute rate, trust).",
  "Neutral, factual, non-promotional. Return one entry per supplier, keyed by supplier_id.",
].join(" ");

function scoreFacts(item: ItemMetadata, supplier: SupplierProfile) {
  return {
    item_id: item.item_id,
    brand: item.brand.name,
    era: item.era,
    fit: item.fit,
    colors: [item.colors.primary, ...item.colors.secondary],
    style_tags: item.style_tags,
    material: item.material,
    grade: item.condition.grade,
    price_gbp: item.price_gbp,
    listing_type: item.listing_type,
    defects: item.defects.map((d) => `${d.type}/${d.severity}`),
    supplier: { name: supplier.name, trust: supplier.overall_trust_score },
  };
}

function profileFacts(bid: Bid, supplier: SupplierProfile) {
  const stats = getCategoryStats(supplier, bid.hard.category);
  return {
    supplier_id: supplier.supplier_id,
    name: supplier.name,
    specialization: supplier.specialization,
    trust: supplier.overall_trust_score,
    fill_rate: stats?.fill_rate,
    grade_accuracy: stats?.avg_grade_accuracy,
    response_hours: stats?.avg_response_hours,
    dispute_rate: stats?.dispute_rate,
  };
}

/** Grounded, factual fallback profile when the profile agent is unavailable. */
function deterministicProfile(bid: Bid, supplier: SupplierProfile): string {
  const stats = getCategoryStats(supplier, bid.hard.category);
  const leaf = categoryLeaf(bid.hard.category).toLowerCase();
  if (stats) {
    return `${supplier.name} — ${Math.round(stats.fill_rate * 100)}% fill rate in ${leaf} at ${Math.round(
      stats.avg_grade_accuracy * 100,
    )}% grade accuracy, replies in ~${stats.avg_response_hours}h.`;
  }
  return `${supplier.name} — trust score ${supplier.overall_trust_score}/100.`;
}

/** Map the deterministic matcher's cards into ScoredMatch[] for a uniform fallback. */
function fallbackScored(bid: Bid, items: ItemMetadata[], suppliers: SupplierProfile[]): ScoredMatch[] {
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
        seller_profile: deterministicProfile(bid, supplier),
      } satisfies ScoredMatch;
    })
    .filter((s): s is ScoredMatch => Boolean(s));
}

async function scoreCandidates(bid: Bid, candidates: { item: ItemMetadata; supplier: SupplierProfile }[]) {
  const out = await generateJSON({
    schema: ScoreBatchSchema,
    feature: "match",
    system: SCORE_SYSTEM,
    prompt: [
      `Buyer soft preferences (with weights): ${JSON.stringify(bid.soft)}`,
      `Candidate lots (${candidates.length}):`,
      JSON.stringify(candidates.map(({ item, supplier }) => scoreFacts(item, supplier))),
      "Return an assessment for every candidate, keyed by item_id.",
    ].join("\n"),
    maxOutputTokens: 1200,
    timeoutMs: 35000,
    maxRetries: 0,
  });
  return out.assessments;
}

async function profileSuppliers(bid: Bid, suppliers: SupplierProfile[]): Promise<Map<string, string>> {
  try {
    const out = await generateJSON({
      schema: ProfileSchema,
      feature: "seller-profile",
      system: PROFILE_SYSTEM,
      prompt: `Suppliers:\n${JSON.stringify(suppliers.map((s) => profileFacts(bid, s)))}\n\nWrite one profile per supplier_id.`,
      maxOutputTokens: 700,
      timeoutMs: 25000,
      maxRetries: 0,
    });
    return new Map(out.profiles.map((p) => [p.supplier_id, p.profile]));
  } catch {
    return new Map();
  }
}

/**
 * LLM matcher: hard-filter (objective gate), then TWO small parallel agent calls —
 * one scores + narrates the candidates, one writes an AI profile per unique supplier.
 * Falls back to the deterministic matcher if scoring is unavailable.
 */
export async function runMatchAgent(
  bid: Bid,
  items: ItemMetadata[],
  suppliers: SupplierProfile[],
): Promise<ScoredMatch[]> {
  const supplierMap = new Map(suppliers.map((s) => [s.supplier_id, s]));

  const candidates = items
    .filter((item) => hardFilter(bid, item).pass)
    .map((item) => ({ item, supplier: supplierMap.get(item.supplier_id) }))
    .filter((c): c is { item: ItemMetadata; supplier: SupplierProfile } => Boolean(c.supplier))
    .slice(0, MAX_CANDIDATES);

  if (!candidates.length) return [];

  const uniqueSuppliers = [...new Map(candidates.map((c) => [c.supplier.supplier_id, c.supplier])).values()];

  // Score (required) and profile (optional) run concurrently — just two calls, no rate-limit risk.
  const [assessments, profiles] = await Promise.all([
    scoreCandidates(bid, candidates).catch(() => null),
    profileSuppliers(bid, uniqueSuppliers),
  ]);

  if (!assessments || !assessments.length) {
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
        seller_profile: profiles.get(supplier.supplier_id) ?? deterministicProfile(bid, supplier),
      } satisfies ScoredMatch;
    })
    .filter((s): s is ScoredMatch => Boolean(s));

  if (!scored.length) return fallbackScored(bid, items, suppliers);

  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, 10);
}
