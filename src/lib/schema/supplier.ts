import { z } from "zod";
import { CONDITION_GRADES, STYLE_TAGS, SUPPLIER_BADGES } from "./enums";

export const CategoryStatsSchema = z.object({
  category: z.string(),
  items_listed: z.number().int().nonnegative(),
  items_sold: z.number().int().nonnegative(),
  fill_rate: z.number().min(0).max(1),
  avg_grade_accuracy: z.number().min(0).max(1),
  avg_response_hours: z.number().nonnegative(),
  dispute_rate: z.number().min(0).max(1),
  repeat_buyer_rate: z.number().min(0).max(1),
});

export const PricingHistorySchema = z.object({
  category: z.string(),
  condition_grade: z.enum(CONDITION_GRADES),
  avg_price_gbp: z.number().positive(),
  min_price_gbp: z.number().positive(),
  max_price_gbp: z.number().positive(),
  sample_size: z.number().int().positive(),
  period: z.enum(["30d", "90d", "1y"]),
});

export const SupplierProfileSchema = z.object({
  supplier_id: z.string(),
  name: z.string(),
  location: z.string(),
  avatar_url: z.string(),
  member_since: z.string(),
  specialization: z.array(z.enum(STYLE_TAGS)),
  category_stats: z.array(CategoryStatsSchema),
  pricing_history: z.array(PricingHistorySchema),
  overall_trust_score: z.number().min(0).max(100),
  badges: z.array(z.enum(SUPPLIER_BADGES)),
});

export type CategoryStats = z.infer<typeof CategoryStatsSchema>;
export type PricingHistory = z.infer<typeof PricingHistorySchema>;
export type SupplierProfile = z.infer<typeof SupplierProfileSchema>;

export function computeTrustScore(stats: CategoryStats): number {
  const responseScore = Math.max(0, Math.min(1, 1 - stats.avg_response_hours / 48));
  const trust =
    40 * stats.fill_rate +
    30 * stats.avg_grade_accuracy +
    20 * (1 - stats.dispute_rate) +
    10 * responseScore;
  return Math.round(Math.min(100, Math.max(0, trust)));
}

export function getCategoryStats(
  supplier: SupplierProfile,
  category: string,
): CategoryStats | undefined {
  return supplier.category_stats.find((s) => s.category === category);
}
