import { z } from "zod";
import {
  COLORS,
  CONDITION_GRADES,
  ERAS,
  FITS,
  GENDERS,
  MATERIALS,
  SIZE_LABELS,
  STYLE_TAGS,
} from "./enums";

export const SoftTraitWeightSchema = z.object({
  want: z.array(z.string()),
  w: z.number().min(0).max(1),
});

export const BidSchema = z.object({
  bid_id: z.string(),
  buyer_id: z.string(),
  created_at: z.string(),
  expires: z.string(),
  hard: z.object({
    category: z.string(),
    size_label: z.array(z.enum(SIZE_LABELS)),
    condition_min: z.enum(CONDITION_GRADES),
    max_price_gbp: z.number().positive(),
    gender: z.enum(GENDERS).optional(),
  }),
  soft: z.object({
    era: SoftTraitWeightSchema.optional(),
    colors: SoftTraitWeightSchema.optional(),
    fit: SoftTraitWeightSchema.optional(),
    style_tags: SoftTraitWeightSchema.optional(),
    brand: SoftTraitWeightSchema.optional(),
    material: SoftTraitWeightSchema.optional(),
  }),
  match_threshold: z.number().min(0).max(1).default(0.75),
  min_confidence: z.number().min(0).max(1).default(0.8),
  raw_query: z.string().optional(),
});

export type SoftTraitWeight = z.infer<typeof SoftTraitWeightSchema>;
export type Bid = z.infer<typeof BidSchema>;

export const ParseDemandRequestSchema = z.object({
  query: z.string().min(1),
  buyer_id: z.string().optional(),
});

export const DEMO_BID_ID = "bid_demo_001";

export const DEMO_BID: Bid = {
  bid_id: DEMO_BID_ID,
  buyer_id: "buyer_001",
  created_at: "2026-07-11T13:00:00Z",
  expires: "2026-08-11T00:00:00Z",
  hard: {
    category: "Apparel & Accessories > Clothing > Outerwear > Jackets",
    size_label: ["L", "XL"],
    condition_min: "B",
    max_price_gbp: 45,
    gender: "unisex",
  },
  soft: {
    era: { want: ["90s", "y2k"], w: 0.3 },
    colors: { want: ["forest_green", "brown", "tan"], w: 0.25 },
    fit: { want: ["boxy", "oversized"], w: 0.2 },
    style_tags: { want: ["gorpcore"], w: 0.25 },
  },
  match_threshold: 0.75,
  min_confidence: 0.8,
  raw_query:
    "Looking for 90s/y2k gorpcore jackets, boxy fit, earth tones, L-XL, grade B or better, under £45",
};

export const COLOR_ALIASES: Record<string, (typeof COLORS)[number][]> = {
  "earth tones": ["forest_green", "brown", "tan"],
  "earth tone": ["forest_green", "brown", "tan"],
  green: ["forest_green", "olive"],
  neutral: ["beige", "tan", "cream", "brown"],
};

export const ERA_ALIASES: Record<string, (typeof ERAS)[number][]> = {
  "90s": ["90s"],
  "90's": ["90s"],
  nineties: ["90s"],
  y2k: ["y2k"],
  "2000s": ["y2k"],
};

export const FIT_ALIASES: Record<string, (typeof FITS)[number][]> = {
  boxy: ["boxy"],
  oversized: ["oversized"],
  "oversized fit": ["oversized"],
};

export const STYLE_ALIASES: Record<string, (typeof STYLE_TAGS)[number][]> = {
  gorpcore: ["gorpcore"],
  "gorp core": ["gorpcore"],
  outdoor: ["gorpcore", "utility"],
};

export { COLORS, CONDITION_GRADES, ERAS, FITS, GENDERS, MATERIALS, SIZE_LABELS, STYLE_TAGS };
