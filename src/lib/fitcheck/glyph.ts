/** Pure, client-safe helpers for garment glyphs & category labels (no server imports). */

export type Glyph = "g-jacket" | "g-denim" | "g-knit" | "g-tee" | "g-dress" | "g-cargo";

/** Trailing segment of a "A > B > C" GPC-style category path. */
export function categoryLeaf(category: string): string {
  const parts = category.split(">").map((p) => p.trim());
  return parts[parts.length - 1] || category;
}

export function glyphFor(category: string): Glyph {
  const leaf = categoryLeaf(category).toLowerCase();
  if (leaf.includes("jean") || leaf.includes("denim")) return "g-denim";
  if (leaf.includes("sweater") || leaf.includes("knit")) return "g-knit";
  if (leaf.includes("t-shirt") || leaf.includes("tee") || leaf.includes("top")) return "g-tee";
  if (leaf.includes("dress")) return "g-dress";
  if (
    leaf.includes("pant") ||
    leaf.includes("trouser") ||
    leaf.includes("cargo") ||
    leaf.includes("activewear")
  )
    return "g-cargo";
  return "g-jacket";
}
