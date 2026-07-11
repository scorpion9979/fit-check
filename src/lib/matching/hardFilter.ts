import { Bid } from "../schema/bid";
import { ItemMetadata } from "../schema/item";
import { CONDITION_INDEX } from "../schema/enums";

const HARD_CONFIDENCE_FIELDS = ["category", "size", "condition", "price_gbp"] as const;

export interface HardFilterDetails {
  category_match: boolean;
  size_match: boolean;
  condition_match: boolean;
  price_match: boolean;
  min_confidence_met: boolean;
}

export function hardFilter(bid: Bid, item: ItemMetadata): { pass: boolean; details: HardFilterDetails } {
  const category_match = item.category === bid.hard.category;
  const size_match = bid.hard.size_label.includes(item.size.label);
  const condition_match =
    CONDITION_INDEX[item.condition.grade] <= CONDITION_INDEX[bid.hard.condition_min];
  const price_match = item.price_gbp <= bid.hard.max_price_gbp;
  const gender_match = !bid.hard.gender || item.gender === bid.hard.gender || item.gender === "unisex";

  const min_confidence_met = HARD_CONFIDENCE_FIELDS.every((field) => {
    const confidence = item.confidence[field];
    return confidence === undefined || confidence >= bid.min_confidence;
  });

  const details: HardFilterDetails = {
    category_match,
    size_match,
    condition_match,
    price_match,
    min_confidence_met,
  };

  const pass =
    category_match &&
    size_match &&
    condition_match &&
    price_match &&
    min_confidence_met &&
    gender_match;

  return { pass, details };
}
