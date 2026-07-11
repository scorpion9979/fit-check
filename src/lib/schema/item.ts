import { z } from "zod";
import {
  COLORS,
  CONDITION_GRADES,
  DEFECT_SEVERITY,
  DEFECT_TYPES,
  ERAS,
  FITS,
  GENDERS,
  MATERIALS,
  PATTERNS,
  SIZE_LABELS,
  SIZE_SYSTEMS,
  STYLE_TAGS,
} from "./enums";

export const TraitValueSchema = <T extends z.ZodType>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: z.number().min(0).max(1),
    source: z.enum(["vlm", "seller_override", "label_ocr", "manual"]).optional(),
  });

export const SizeSchema = z.object({
  label: z.enum(SIZE_LABELS),
  system: z.enum(SIZE_SYSTEMS),
});

export const ConditionSchema = z.object({
  grade: z.enum(CONDITION_GRADES),
  scale: z.literal("A-D"),
});

export const BrandSchema = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.enum(["label_ocr", "seller_override", "vlm"]),
});

export const DefectSchema = z.object({
  type: z.enum(DEFECT_TYPES),
  location: z.string(),
  severity: z.enum(DEFECT_SEVERITY),
});

export const MeasurementsCmSchema = z.object({
  pit_to_pit: z.number().optional(),
  length: z.number().optional(),
  waist: z.number().optional(),
  inseam: z.number().optional(),
});

export const BundleSchema = z.object({
  qty: z.number().int().positive(),
  moq: z.number().int().positive(),
  price_per_unit_gbp: z.number().positive(),
  total_price_gbp: z.number().positive(),
  grade_mix: z.array(z.enum(CONDITION_GRADES)).optional(),
});

export const ItemMetadataSchema = z.object({
  item_id: z.string(),
  supplier_id: z.string(),
  image_url: z.string(),
  listed_at: z.string(),
  category: z.string(),
  gender: z.enum(GENDERS),
  size: SizeSchema,
  condition: ConditionSchema,
  price_gbp: z.number().positive(),
  colors: z.object({
    primary: z.enum(COLORS),
    secondary: z.array(z.enum(COLORS)),
  }),
  pattern: z.enum(PATTERNS),
  material: z.array(z.enum(MATERIALS)),
  era: z.enum(ERAS),
  fit: z.enum(FITS),
  style_tags: z.array(z.enum(STYLE_TAGS)),
  brand: BrandSchema,
  attributes: z
    .object({
      neckline: z.string().optional(),
      closure: z.string().optional(),
      sleeve: z.string().optional(),
    })
    .default({}),
  measurements_cm: MeasurementsCmSchema.default({}),
  defects: z.array(DefectSchema).default([]),
  confidence: z.record(z.string(), z.number().min(0).max(1)),
  embedding_ref: z.string().optional(),
  listing_type: z.enum(["single", "bundle"]),
  bundle: BundleSchema.optional(),
});

export type ItemMetadata = z.infer<typeof ItemMetadataSchema>;
