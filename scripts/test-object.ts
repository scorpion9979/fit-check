/** Probe generateObject (structured output) latency/errors. bun run scripts/test-object.ts */
import { generateObject } from "ai";
import { z } from "zod";
import {
  COLORS, CONDITION_GRADES, DEMO_CATEGORIES, ERAS, FITS, GENDERS, SIZE_LABELS, STYLE_TAGS,
} from "../src/lib/schema/enums";

const MODEL = process.env.FIT_CHECK_MODEL ?? "anthropic/claude-haiku-4.5";
const SoftWant = <T extends readonly [string, ...string[]]>(v: T) =>
  z.object({ want: z.array(z.enum(v)), w: z.number().min(0).max(1) }).optional();

const DemandSchema = z.object({
  category: z.enum(DEMO_CATEGORIES),
  size_label: z.array(z.enum(SIZE_LABELS)).min(1),
  condition_min: z.enum(CONDITION_GRADES),
  max_price_gbp: z.number().positive(),
  gender: z.enum(GENDERS),
  soft: z.object({
    era: SoftWant(ERAS), colors: SoftWant(COLORS), fit: SoftWant(FITS), style_tags: SoftWant(STYLE_TAGS),
  }),
  match_threshold: z.number().min(0).max(1),
  mappings: z.array(z.object({ phrase: z.string(), mapped_to: z.array(z.string()) })),
});

const start = Date.now();
try {
  const { object } = await generateObject({
    model: MODEL,
    schema: DemandSchema,
    system: "You translate a buyer query into a structured trait bid using only the schema enums.",
    prompt: `Buyer query:\n"""boxy 90s gorpcore jacket, forest green, size L, under £45"""\n\nProduce the structured trait bid.`,
    temperature: 0,
    maxOutputTokens: 1024,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(40000),
  });
  console.log(`SUCCESS in ${Date.now() - start}ms`);
  console.log(JSON.stringify(object, null, 2));
} catch (err) {
  console.log(`FAILED in ${Date.now() - start}ms`);
  console.log("name:", (err as Error)?.name, "| message:", (err as Error)?.message);
  const e = err as { statusCode?: number; responseBody?: string; cause?: unknown; text?: string };
  if (e.statusCode) console.log("statusCode:", e.statusCode);
  if (e.text) console.log("text:", e.text);
  if (e.responseBody) console.log("responseBody:", e.responseBody);
  if (e.cause) console.log("cause:", String(e.cause));
}
process.exit(0);
