import { MatchResult } from "../schema/match";
import { ItemMetadata } from "../schema/item";
import { SupplierProfile, CategoryStats, PricingHistory } from "../schema/supplier";
import { RecommendedAction } from "../schema/enums";

interface NarrativeInput {
  item: ItemMetadata;
  supplier: SupplierProfile;
  result: MatchResult;
  categoryStats?: CategoryStats;
  pricing?: PricingHistory;
  traitBreakdown: { trait: string; want: string[]; overlap: number; weight: number }[];
}

export function generateNarrative(input: NarrativeInput) {
  const { item, supplier, result, categoryStats, pricing, traitBreakdown } = input;
  const pct = Math.round(result.composite_score * 100);
  const strongTraits = traitBreakdown
    .filter((t) => t.overlap >= 0.5)
    .map((t) => t.trait.replace("_", " "))
    .join(", ");

  const match_reason =
    strongTraits.length > 0
      ? `${pct}% match on ${strongTraits}. ${item.era} ${item.brand.name} in ${item.colors.primary.replace("_", " ")} — ${item.fit} fit with ${item.style_tags.join(", ")} tags.`
      : `${pct}% composite match for your jacket bid. ${item.era} ${item.brand.name}, Grade ${item.condition.grade}, size ${item.size.label}.`;

  const fillPct = categoryStats ? Math.round(categoryStats.fill_rate * 100) : null;
  const supplier_note = fillPct
    ? `${supplier.name} has ${fillPct}% fill rate in jackets with ${Math.round((categoryStats?.avg_grade_accuracy ?? 0) * 100)}% grade accuracy.`
    : `${supplier.name} — trust score ${supplier.overall_trust_score}/100.`;

  let pricing_note = `£${item.price_gbp} listed`;
  if (pricing) {
    const diff = item.price_gbp - pricing.avg_price_gbp;
    if (diff < 0) {
      pricing_note = `£${item.price_gbp} is below 90d avg (£${pricing.avg_price_gbp}) for Grade ${item.condition.grade} jackets.`;
    } else if (diff > 0) {
      pricing_note = `£${item.price_gbp} is above 90d avg (£${pricing.avg_price_gbp}) for Grade ${item.condition.grade} jackets.`;
    } else {
      pricing_note = `£${item.price_gbp} matches 90d avg for Grade ${item.condition.grade} jackets.`;
    }
  }

  const risk_flags: string[] = [];
  if (categoryStats && categoryStats.avg_grade_accuracy < 0.8) {
    risk_flags.push("Grade accuracy below avg for jackets");
  }
  if (categoryStats && categoryStats.dispute_rate > 0.1) {
    risk_flags.push("Higher dispute rate in this category");
  }
  if (result.soft_score < 0.8) {
    risk_flags.push("Partial soft trait overlap — review era/color fit");
  }

  let recommended_action: RecommendedAction = "save_for_later";
  if (result.composite_score >= 0.9 && (categoryStats?.fill_rate ?? 0) >= 0.9) {
    recommended_action = "make_offer";
  } else if (item.listing_type === "bundle") {
    recommended_action = "handpick";
  } else if (result.composite_score < 0.78) {
    recommended_action = "pass";
  }

  return {
    match_reason,
    supplier_note,
    pricing_note,
    recommended_action,
    risk_flags,
  };
}
