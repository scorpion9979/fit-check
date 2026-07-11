import { z } from "zod";
import { RECOMMENDED_ACTIONS } from "./enums";
import { BundleSchema, ConditionSchema, SizeSchema } from "./item";
import { STYLE_TAGS, ERAS } from "./enums";

export const MatchResultSchema = z.object({
  match_id: z.string(),
  bid_id: z.string(),
  item_id: z.string(),
  supplier_id: z.string(),
  hard_pass: z.boolean(),
  hard_details: z.object({
    category_match: z.boolean(),
    size_match: z.boolean(),
    condition_match: z.boolean(),
    price_match: z.boolean(),
    min_confidence_met: z.boolean(),
  }),
  soft_score: z.number().min(0).max(1),
  supplier_multiplier: z.number().min(0.8).max(1.2),
  composite_score: z.number().min(0).max(1.2),
  rank: z.number().int().positive(),
  matched_at: z.string(),
});

export const MatchNarrativeSchema = z.object({
  match_reason: z.string(),
  supplier_note: z.string(),
  pricing_note: z.string(),
  recommended_action: z.enum(RECOMMENDED_ACTIONS),
  risk_flags: z.array(z.string()),
});

export const MatchCardSchema = z.object({
  match_id: z.string(),
  bid_id: z.string(),
  rank: z.number().int().positive(),
  match_score: z.number().min(0).max(100),
  match_label: z.enum(["Strong", "Good", "Fair"]),
  item: z.object({
    item_id: z.string(),
    image_url: z.string(),
    title: z.string(),
    category: z.string(),
    size: SizeSchema,
    condition: ConditionSchema,
    price_gbp: z.number(),
    era: z.enum(ERAS),
    style_tags: z.array(z.enum(STYLE_TAGS)),
    listing_type: z.enum(["single", "bundle"]),
    bundle: BundleSchema.optional(),
  }),
  supplier: z.object({
    supplier_id: z.string(),
    name: z.string(),
    avatar_url: z.string(),
    trust_score: z.number(),
    category_fill_rate: z.number(),
    category_grade_accuracy: z.number(),
    avg_response_hours: z.number(),
    specialization_match: z.boolean(),
  }),
  narrative: MatchNarrativeSchema,
  confidence: z.object({
    item_extraction: z.number(),
    match_certainty: z.number(),
  }),
  created_at: z.string(),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;
export type MatchNarrative = z.infer<typeof MatchNarrativeSchema>;
export type MatchCard = z.infer<typeof MatchCardSchema>;

export function getMatchLabel(score: number): "Strong" | "Good" | "Fair" {
  if (score >= 0.85) return "Strong";
  if (score >= 0.75) return "Good";
  return "Fair";
}
