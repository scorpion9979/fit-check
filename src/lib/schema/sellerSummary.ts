import { z } from "zod";
import { CONDITION_GRADES, SUPPLIER_BADGES } from "./enums";

export const SaleRecordSchema = z.object({
  sale_id: z.string(),
  seller_id: z.string(),
  category: z.string(),
  brand: z.string(),
  price_gbp: z.number().positive(),
  condition_grade: z.enum(CONDITION_GRADES),
  sold_at: z.string(),
  buyer_country: z.string(),
  buyer_rating: z.number().min(1).max(5),
});

export type SaleRecord = z.infer<typeof SaleRecordSchema>;

export const SellerSummaryCardSchema = z.object({
  seller_id: z.string(),
  name: z.string(),
  location: z.string(),
  avatar_url: z.string(),
  member_since: z.string(),
  trust_score: z.number().min(0).max(100),
  avg_rating: z.number().min(0).max(5),
  total_sales: z.number().int().nonnegative(),
  specialty_line: z.string(),
  top_categories: z.array(
    z.object({
      category: z.string(),
      label: z.string(),
      count: z.number().int().nonnegative(),
      share: z.number().min(0).max(1),
    }),
  ),
  top_brands: z.array(
    z.object({
      brand: z.string(),
      count: z.number().int().nonnegative(),
      share: z.number().min(0).max(1),
    }),
  ),
  price_range: z.object({
    min: z.number(),
    max: z.number(),
    avg: z.number(),
  }),
  ships_to: z.array(
    z.object({
      country: z.string(),
      count: z.number().int().nonnegative(),
      share: z.number().min(0).max(1),
    }),
  ),
  badges: z.array(z.enum(SUPPLIER_BADGES)),
  recent_sales: z.array(SaleRecordSchema),
  generated_at: z.string(),
});

export type SellerSummaryCard = z.infer<typeof SellerSummaryCardSchema>;
