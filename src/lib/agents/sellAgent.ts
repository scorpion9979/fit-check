import { z } from "zod";
import { ExtractDraft, extractSpec } from "@/lib/fitcheck/extract";
import {
  COLORS,
  CONDITION_GRADES,
  DEFECT_SEVERITY,
  DEFECT_TYPES,
  DEMO_CATEGORIES,
  ERAS,
  FITS,
  GENDERS,
  MATERIALS,
  PATTERNS,
  SIZE_LABELS,
  SIZE_SYSTEMS,
  STYLE_TAGS,
} from "@/lib/schema/enums";
import { generateJSON } from "./gateway";

const Conf = z.number().min(0).max(1);

const SellDraftSchema = z.object({
  category: z.enum(DEMO_CATEGORIES),
  gender: z.enum(GENDERS),
  size: z.object({ label: z.enum(SIZE_LABELS), system: z.enum(SIZE_SYSTEMS) }),
  condition_grade: z.enum(CONDITION_GRADES),
  price_gbp: z.number().positive(),
  colors: z.object({ primary: z.enum(COLORS), secondary: z.array(z.enum(COLORS)) }),
  pattern: z.enum(PATTERNS),
  material: z.array(z.enum(MATERIALS)).min(1),
  era: z.enum(ERAS),
  fit: z.enum(FITS),
  style_tags: z.array(z.enum(STYLE_TAGS)).min(1),
  brand: z.object({ name: z.string(), confidence: Conf }),
  attributes: z.object({
    closure: z.string().optional(),
    sleeve: z.string().optional(),
    neckline: z.string().optional(),
  }),
  measurements_cm: z.object({
    pit_to_pit: z.number().optional(),
    length: z.number().optional(),
    waist: z.number().optional(),
    inseam: z.number().optional(),
  }),
  defects: z.array(
    z.object({
      type: z.enum(DEFECT_TYPES),
      location: z.string(),
      severity: z.enum(DEFECT_SEVERITY),
    }),
  ),
  confidence: z.object({
    category: Conf,
    condition: Conf,
    brand: Conf,
    era: Conf,
    colors: Conf,
    fit: Conf,
  }),
  listing_type: z.enum(["single", "bundle"]),
});

// No real image in the demo, so pick a stock photo that matches the typed category.
const IMAGE_BY_LEAF: { test: (leaf: string) => boolean; url: string }[] = [
  { test: (l) => l.includes("jean") || l.includes("pant"), url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=750&fit=crop" },
  { test: (l) => l.includes("sweater") || l.includes("knit"), url: "https://images.unsplash.com/photo-1606107557195-0a42abb8e854?w=600&h=750&fit=crop" },
  { test: (l) => l.includes("t-shirt") || l.includes("tee"), url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=750&fit=crop" },
  { test: (l) => l.includes("dress"), url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=750&fit=crop" },
  { test: (l) => l.includes("coat"), url: "https://images.unsplash.com/photo-1596755094514-f87e34085b56?w=600&h=750&fit=crop" },
];
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1544022613-e87ca75a784f?w=600&h=750&fit=crop";

function imageFor(category: string): string {
  const leaf = category.split(">").pop()!.trim().toLowerCase();
  return IMAGE_BY_LEAF.find((r) => r.test(leaf))?.url ?? DEFAULT_IMAGE;
}

const SYSTEM = [
  "You are a vision cataloguing agent for a resale marketplace.",
  "A seller has uploaded a photo of a single second-hand garment. Read it into a closed-enum spec sheet.",
  "Use ONLY the enum vocabularies in the schema. Assign realistic per-field confidence: high (0.9+) for obvious fields like category, lower (0.4-0.75) for hard-to-read fields like exact brand or era.",
  "If the brand is unreadable, use name 'Unbranded' with low confidence.",
  "Pick a desirable, resaleable vintage/second-hand item (e.g. gorpcore, workwear, y2k, streetwear). Give a plausible wholesale ask (price_gbp) for a single unit.",
  "Include 0-2 realistic minor defects consistent with a used garment, or none.",
].join(" ");

/** Sell agent: "photo" -> closed-enum spec draft with confidence, via the AI Gateway. */
export async function runSellAgent(seed = 0): Promise<ExtractDraft> {
  try {
    const out = await generateJSON({
      schema: SellDraftSchema,
      feature: "sell-extract",
      system: SYSTEM,
      prompt: `Catalogue the uploaded garment (variation seed ${seed}). Vary the item from previous ones.`,
      temperature: 0.7,
      maxOutputTokens: 700,
    });

    const draft: ExtractDraft = {
      image_url: imageFor(out.category),
      category: out.category,
      gender: out.gender,
      size: out.size,
      condition: { grade: out.condition_grade, scale: "A-D" },
      price_gbp: out.price_gbp,
      colors: out.colors,
      pattern: out.pattern,
      material: out.material,
      era: out.era,
      fit: out.fit,
      style_tags: out.style_tags,
      brand: { name: out.brand.name, confidence: out.brand.confidence, source: "vlm" },
      attributes: out.attributes,
      measurements_cm: out.measurements_cm,
      defects: out.defects,
      confidence: { ...out.confidence, price_gbp: 1 },
      listing_type: out.listing_type,
    };
    return draft;
  } catch {
    return extractSpec(seed);
  }
}
