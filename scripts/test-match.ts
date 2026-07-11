/** Probe the batched LLM matcher end-to-end. bun run scripts/test-match.ts */
import { runMatchAgent } from "../src/lib/agents/matchAgent";
import { toMatchView } from "../src/lib/fitcheck/matchView";
import { getBid, getItems, getSuppliers } from "../src/lib/db/jsonStore";
import { DEMO_BID_ID } from "../src/lib/schema/bid";

const bid = getBid(DEMO_BID_ID)!;
const start = Date.now();
const scored = await runMatchAgent(bid, getItems(), getSuppliers());
const views = scored.map((m) => toMatchView(bid, m));
console.log(`matches in ${Date.now() - start}ms — ${views.length} views`);
for (const v of views.slice(0, 5)) {
  console.log(`  ${v.match}% — ${v.title} (${v.price})`);
  console.log(`     seller: ${v.supplier} ${v.rating}/5 · ${v.aiProfile}`);
  console.log(`     soft: ${v.soft.map((s) => `${s.t}${s.m >= 1 ? "✓" : "~"}`).join(", ")}`);
}
process.exit(0);
