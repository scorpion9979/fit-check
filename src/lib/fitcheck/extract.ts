import { ItemMetadata } from "@/lib/schema/item";

/**
 * Stand-in for the vision model: turns an "uploaded photo" into a closed-enum
 * spec draft with per-field confidence. Deterministic — a given seed always
 * yields the same draft — so the Sell flow is reproducible without an LLM.
 * Swap this for a real VLM call later; the return shape stays the same.
 */
export type ExtractDraft = Omit<ItemMetadata, "item_id" | "supplier_id" | "listed_at">;

const DRAFTS: ExtractDraft[] = [
  {
    image_url: "https://images.unsplash.com/photo-1544022613-e87ca75a784f?w=600&h=750&fit=crop",
    category: "Apparel & Accessories > Clothing > Outerwear > Jackets",
    gender: "unisex",
    size: { label: "L", system: "UK" },
    condition: { grade: "B", scale: "A-D" },
    price_gbp: 12.5,
    colors: { primary: "forest_green", secondary: ["cream"] },
    pattern: "colorblock",
    material: ["nylon", "fleece"],
    era: "90s",
    fit: "boxy",
    style_tags: ["gorpcore", "utility"],
    brand: { name: "Patagonia", confidence: 0.92, source: "label_ocr" },
    attributes: { closure: "full zip", sleeve: "long" },
    measurements_cm: { pit_to_pit: 62, length: 70 },
    defects: [{ type: "pilling", location: "cuffs", severity: "minor" }],
    confidence: { category: 0.98, size: 0.93, condition: 0.88, brand: 0.92, era: 0.71, colors: 0.83, fit: 0.86 },
    listing_type: "single",
  },
  {
    image_url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=750&fit=crop",
    category: "Apparel & Accessories > Clothing > Pants > Jeans",
    gender: "mens",
    size: { label: "L", system: "UK" },
    condition: { grade: "A", scale: "A-D" },
    price_gbp: 11,
    colors: { primary: "blue", secondary: [] },
    pattern: "solid",
    material: ["denim"],
    era: "y2k",
    fit: "regular",
    style_tags: ["workwear", "heritage"],
    brand: { name: "Levi's", confidence: 0.95, source: "label_ocr" },
    attributes: { closure: "button" },
    measurements_cm: { waist: 40, inseam: 78 },
    defects: [],
    confidence: { category: 0.97, size: 0.9, condition: 0.94, brand: 0.95, era: 0.78, colors: 0.95, fit: 0.83 },
    listing_type: "single",
  },
  {
    image_url: "https://images.unsplash.com/photo-1606107557195-0a42abb8e854?w=600&h=750&fit=crop",
    category: "Apparel & Accessories > Clothing > Tops > Sweaters",
    gender: "unisex",
    size: { label: "M", system: "INT" },
    condition: { grade: "B", scale: "A-D" },
    price_gbp: 6.5,
    colors: { primary: "tan", secondary: ["brown"] },
    pattern: "solid",
    material: ["wool"],
    era: "80s",
    fit: "oversized",
    style_tags: ["heritage", "prep"],
    brand: { name: "Unbranded", confidence: 0.44, source: "vlm" },
    attributes: { neckline: "crew", sleeve: "long" },
    measurements_cm: { pit_to_pit: 58, length: 66 },
    defects: [{ type: "hem_damage", location: "hem", severity: "minor" }],
    confidence: { category: 0.95, size: 0.86, condition: 0.83, brand: 0.44, era: 0.69, colors: 0.81, fit: 0.8 },
    listing_type: "single",
  },
];

export function extractSpec(seed = 0): ExtractDraft {
  const idx = ((seed % DRAFTS.length) + DRAFTS.length) % DRAFTS.length;
  // Return a deep-ish clone so callers can mutate freely.
  return JSON.parse(JSON.stringify(DRAFTS[idx])) as ExtractDraft;
}
