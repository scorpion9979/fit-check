/** Measure batched generateObject latency vs array size. bun run scripts/test-batch.ts */
import { generateObject } from "ai";
import { z } from "zod";
import { getBid, getItems, getSuppliers } from "../src/lib/db/jsonStore";
import { DEMO_BID_ID } from "../src/lib/schema/bid";
import { hardFilter } from "../src/lib/matching/hardFilter";
import { MATCH_LABELS, RECOMMENDED_ACTIONS } from "../src/lib/schema/enums";

const MODEL = process.env.FIT_CHECK_MODEL ?? "anthropic/claude-haiku-4.5";
const Assessment = z.object({
  item_id: z.string(),
  match_score: z.number().min(0).max(100),
  match_label: z.enum(MATCH_LABELS),
  match_reason: z.string(),
  recommended_action: z.enum(RECOMMENDED_ACTIONS),
  risk_flags: z.array(z.string()),
});
const Batch = z.object({ assessments: z.array(Assessment) });

const bid = getBid(DEMO_BID_ID)!;
const items = getItems();
const suppliers = getSuppliers();
const sup = new Map(suppliers.map((s) => [s.supplier_id, s]));
const cands = items.filter((i) => hardFilter(bid, i).pass);

async function run(n: number) {
  const facts = cands.slice(0, n).map((item) => ({
    item_id: item.item_id,
    brand: item.brand.name,
    era: item.era,
    fit: item.fit,
    colors: [item.colors.primary, ...item.colors.secondary],
    style_tags: item.style_tags,
    grade: item.condition.grade,
    price_gbp: item.price_gbp,
    trust: sup.get(item.supplier_id)?.overall_trust_score,
  }));
  const start = Date.now();
  try {
    const { object } = await generateObject({
      model: MODEL,
      schema: Batch,
      system: "Score each candidate lot's soft-trait fit 0..100 vs the buyer bid. One concise reason each.",
      prompt: `Bid soft: ${JSON.stringify(bid.soft)}\nCandidates: ${JSON.stringify(facts)}\nAssess every candidate by item_id.`,
      temperature: 0,
      maxOutputTokens: 1600,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(120000),
    });
    console.log(`n=${n}: ${Date.now() - start}ms, ${object.assessments.length} assessments`);
  } catch (e) {
    console.log(`n=${n}: FAILED ${Date.now() - start}ms — ${(e as Error).name}: ${(e as Error).message}`);
  }
}

await run(3);
await run(10);
process.exit(0);
