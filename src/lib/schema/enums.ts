export const GENDERS = ["mens", "womens", "unisex", "kids"] as const;
export type Gender = (typeof GENDERS)[number];

export const CONDITION_GRADES = ["A", "B", "C", "D"] as const;
export type ConditionGrade = (typeof CONDITION_GRADES)[number];

export const SIZE_SYSTEMS = ["UK", "US", "EU", "INT"] as const;
export type SizeSystem = (typeof SIZE_SYSTEMS)[number];

export const SIZE_LABELS = ["XS", "S", "M", "L", "XL", "XXL", "ONE_SIZE"] as const;
export type SizeLabel = (typeof SIZE_LABELS)[number];

export const COLORS = [
  "black",
  "white",
  "cream",
  "grey",
  "navy",
  "brown",
  "tan",
  "forest_green",
  "olive",
  "burgundy",
  "red",
  "orange",
  "yellow",
  "pink",
  "purple",
  "blue",
  "multicolor",
  "beige",
  "khaki",
  "coral",
] as const;
export type Color = (typeof COLORS)[number];

export const PATTERNS = [
  "solid",
  "striped",
  "plaid",
  "floral",
  "graphic",
  "colorblock",
  "camo",
  "animal_print",
  "tie_dye",
  "abstract",
  "checked",
] as const;
export type Pattern = (typeof PATTERNS)[number];

export const ERAS = ["70s", "80s", "90s", "y2k", "2010s", "modern", "unknown"] as const;
export type Era = (typeof ERAS)[number];

export const FITS = ["slim", "regular", "boxy", "oversized", "cropped", "relaxed"] as const;
export type Fit = (typeof FITS)[number];

export const STYLE_TAGS = [
  "gorpcore",
  "workwear",
  "streetwear",
  "y2k",
  "grunge",
  "prep",
  "minimalist",
  "bohemian",
  "athleisure",
  "vintage_sportswear",
  "heritage",
  "utility",
  "punk",
  "cottagecore",
] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

export const MATERIALS = [
  "cotton",
  "wool",
  "leather",
  "denim",
  "nylon",
  "polyester",
  "silk",
  "linen",
  "fleece",
  "cashmere",
  "suede",
  "canvas",
  "mixed",
] as const;
export type Material = (typeof MATERIALS)[number];

export const DEFECT_TYPES = [
  "stain",
  "hole",
  "tear",
  "pilling",
  "fading",
  "missing_button",
  "broken_zip",
  "odour",
  "stretching",
  "hem_damage",
] as const;
export type DefectType = (typeof DEFECT_TYPES)[number];

export const DEFECT_SEVERITY = ["minor", "moderate", "major"] as const;
export type DefectSeverity = (typeof DEFECT_SEVERITY)[number];

export const DEMO_CATEGORIES = [
  "Apparel & Accessories > Clothing > Outerwear > Jackets",
  "Apparel & Accessories > Clothing > Outerwear > Coats",
  "Apparel & Accessories > Clothing > Tops > T-Shirts",
  "Apparel & Accessories > Clothing > Tops > Sweaters",
  "Apparel & Accessories > Clothing > Pants > Jeans",
  "Apparel & Accessories > Clothing > Dresses",
  "Apparel & Accessories > Clothing > Activewear",
  "Apparel & Accessories > Clothing > Suits & Blazers > Blazers",
] as const;
export type DemoCategory = (typeof DEMO_CATEGORIES)[number];

export const SUPPLIER_BADGES = [
  "fast_responder",
  "grade_accurate",
  "volume_seller",
  "repeat_favorite",
] as const;
export type SupplierBadge = (typeof SUPPLIER_BADGES)[number];

export const RECOMMENDED_ACTIONS = [
  "make_offer",
  "handpick",
  "save_for_later",
  "pass",
] as const;
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

export const MATCH_LABELS = ["Strong", "Good", "Fair"] as const;
export type MatchLabel = (typeof MATCH_LABELS)[number];

export const CONDITION_INDEX: Record<ConditionGrade, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

export const JACKETS_CATEGORY =
  "Apparel & Accessories > Clothing > Outerwear > Jackets";
