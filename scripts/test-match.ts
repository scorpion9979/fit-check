/** Probe the batched LLM matcher end-to-end. bun run scripts/test-match.ts */
import { runMatcherLLM } from "../src/lib/agents/matchAgent";
import { getBid, getItems, getSuppliers } from "../src/lib/db/jsonStore";
import { DEMO_BID_ID } from "../src/lib/schema/bid";

const bid = getBid(DEMO_BID_ID)!;
const start = Date.now();
const { cards } = await runMatcherLLM(bid, getItems(), getSuppliers());
console.log(`matches in ${Date.now() - start}ms — ${cards.length} cards`);
for (const c of cards.slice(0, 5)) {
  console.log(`  #${c.rank} ${c.match_score}% ${c.match_label} — ${c.item.title} (£${c.item.price_gbp})`);
  console.log(`     reason: ${c.narrative.match_reason}`);
  console.log(`     action: ${c.narrative.recommended_action} | risks: ${c.narrative.risk_flags.join(", ") || "none"}`);
}
process.exit(0);
