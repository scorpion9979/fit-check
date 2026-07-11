import { Bid } from "../schema/bid";
import { SupplierProfile, getCategoryStats } from "../schema/supplier";

export function supplierMultiplier(
  bid: Bid,
  supplier: SupplierProfile,
): number {
  const categoryStats = getCategoryStats(supplier, bid.hard.category);
  if (!categoryStats) return 1.0;

  let base = 1.0;

  if (categoryStats.fill_rate >= 0.9) base += 0.05;
  if (categoryStats.avg_grade_accuracy >= 0.85) base += 0.05;
  if (categoryStats.avg_response_hours <= 12) base += 0.05;
  if (categoryStats.dispute_rate > 0.1) base -= 0.1;

  const bidStyleTags = bid.soft.style_tags?.want ?? [];
  const specializationMatch = bidStyleTags.some((tag) =>
    supplier.specialization.includes(tag as (typeof supplier.specialization)[number]),
  );
  if (specializationMatch) base += 0.05;

  return Math.max(0.8, Math.min(1.2, base));
}

export function hasSpecializationMatch(bid: Bid, supplier: SupplierProfile): boolean {
  const bidStyleTags = bid.soft.style_tags?.want ?? [];
  return bidStyleTags.some((tag) =>
    supplier.specialization.includes(tag as (typeof supplier.specialization)[number]),
  );
}
