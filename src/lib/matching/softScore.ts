import { Bid, SoftTraitWeight } from "../schema/bid";
import { ItemMetadata } from "../schema/item";
import { Color, Era, Fit, StyleTag } from "../schema/enums";

function jaccard<T>(want: T[], itemValues: T[]): number {
  if (want.length === 0) return 0;
  const wantSet = new Set(want);
  const itemSet = new Set(itemValues);
  const intersection = want.filter((v) => itemSet.has(v)).length;
  const union = new Set([...want, ...itemValues]).size;
  return union === 0 ? 0 : intersection / union;
}

function scalarOverlap<T extends string>(want: string[], value: T): number {
  return want.includes(value) ? 1 : 0;
}

function colorOverlap(want: string[], item: ItemMetadata): number {
  const itemColors = [item.colors.primary, ...item.colors.secondary];
  const matched = want.some((c) => itemColors.includes(c as Color));
  if (!matched) return 0;
  return jaccard(want, itemColors);
}

function traitOverlap(
  traitKey: keyof Bid["soft"],
  weight: SoftTraitWeight | undefined,
  item: ItemMetadata,
): number {
  if (!weight || weight.w === 0) return 0;

  switch (traitKey) {
    case "era":
      return scalarOverlap(weight.want, item.era as Era);
    case "fit":
      return scalarOverlap(weight.want, item.fit as Fit);
    case "colors":
      return colorOverlap(weight.want, item);
    case "style_tags":
      return jaccard(weight.want, item.style_tags as StyleTag[]);
    case "brand":
      return weight.want.some((w) => w.toLowerCase() === item.brand.name.toLowerCase()) ? 1 : 0;
    case "material":
      return jaccard(weight.want, item.material);
    default:
      return 0;
  }
}

export function softScore(bid: Bid, item: ItemMetadata): number {
  const traits = Object.entries(bid.soft) as [keyof Bid["soft"], SoftTraitWeight | undefined][];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of traits) {
    if (!weight) continue;
    totalWeight += weight.w;
    weightedSum += weight.w * traitOverlap(key, weight, item);
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

export function getTraitBreakdown(bid: Bid, item: ItemMetadata) {
  const traits = Object.entries(bid.soft) as [keyof Bid["soft"], SoftTraitWeight | undefined][];
  return traits
    .filter(([, w]) => w)
    .map(([key, weight]) => ({
      trait: key,
      want: weight!.want,
      overlap: traitOverlap(key, weight, item),
      weight: weight!.w,
    }));
}
