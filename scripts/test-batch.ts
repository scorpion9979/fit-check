/** Measure the EXACT match batch call (with seller_profile). bun run scripts/test-batch.ts */
import { generateObject } from "ai";
import { z } from "zod";
import { getBid, getItems, getSuppliers } from "../src/lib/db/jsonStore";
import { DEMO_BID_ID } from "../src/lib/schema/bid";
import { hardFilter } from "../src/lib/matching/hardFilter";
import { getCategoryStats } from "../src/lib/schema/supplier";
import { RECOMMENDED_ACTIONS } from "../src/lib/schema/enums";

const MODEL = process.env.FIT_CHECK_MODEL ?? "anthropic/claude-haiku-4.5";
const Assessment = z.object({
  item_id: z.string(),
  match_score: z.number().min(0).max(100),
  match_reason: z.string(),
  seller_profile: z.string(),
  recommended_action: z.enum(RECOMMENDED_ACTIONS),
  risk_flags: z.array(z.string()),
});
const Batch = z.object({ assessments: z.array(Assessment) });

const bid = getBid(DEMO_BID_ID)!;
const items = getItems();
const suppliers = getSuppliers();
const sup = new Map(suppliers.map((s) => [s.supplier_id, s]));

async function run(n: number, maxOut: number) {
  const facts = items
    .filter((i) => hardFilter(bid, i).pass)
    .slice(0, n)
    .map((item) => {
      const s = sup.get(item.supplier_id)!;
      const st = getCategoryStats(s, bid.hard.category);
      return {
        item_id: item.item_id,
        brand: item.brand.name,
        era: item.era,
        fit: item.fit,
        colors: [item.colors.primary, ...item.colors.secondary],
        style_tags: item.style_tags,
        grade: item.condition.grade,
        price_gbp: item.price_gbp,
        supplier: { name: s.name, trust: s.overall_trust_score, fill: st?.fill_rate, ga: st?.avg_grade_accuracy },
      };
    });
  const start = Date.now();
  try {
    const { object, usage } = await generateObject({
      model: MODEL,
      schema: Batch,
      system:
        "Score each candidate lot's soft-trait fit 0..100 vs the buyer bid. One concise reason each, plus a one-sentence seller_profile grounded in the supplier stats.",
      prompt: `Bid soft: ${JSON.stringify(bid.soft)}\nCandidates: ${JSON.stringify(facts)}\nAssess every candidate by item_id.`,
      temperature: 0,
      maxOutputTokens: maxOut,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(90000),
    });
    console.log(`n=${n} maxOut=${maxOut}: ${Date.now() - start}ms, ${object.assessments.length} assessments, outputTokens=${usage.outputTokens}`);
  } catch (e) {
    console.log(`n=${n} maxOut=${maxOut}: FAILED ${Date.now() - start}ms — ${(e as Error).name}: ${(e as Error).message}`);
  }
}

await run(6, 1600);
await run(10, 1600);
await run(10, 3000);
process.exit(0);
