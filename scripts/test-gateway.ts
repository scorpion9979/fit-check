/**
 * Standalone AI Gateway probe. Run: bun run scripts/test-gateway.ts
 * Bun auto-loads .env, so AI_GATEWAY_API_KEY is picked up without printing it.
 */
import { generateText } from "ai";

const MODEL = process.env.FIT_CHECK_MODEL ?? "anthropic/claude-haiku-4.5";

console.log("AI_GATEWAY_API_KEY set:", Boolean(process.env.AI_GATEWAY_API_KEY));
console.log("VERCEL_OIDC_TOKEN set:", Boolean(process.env.VERCEL_OIDC_TOKEN));
console.log("model:", MODEL);

const start = Date.now();
try {
  const { text, usage } = await generateText({
    model: MODEL,
    prompt: "Reply with exactly: OK",
    maxRetries: 0,
    maxOutputTokens: 16,
    abortSignal: AbortSignal.timeout(30000),
  });
  console.log(`SUCCESS in ${Date.now() - start}ms:`, JSON.stringify(text), "usage:", usage);
} catch (err) {
  console.log(`FAILED in ${Date.now() - start}ms`);
  console.log("name:", (err as Error)?.name);
  console.log("message:", (err as Error)?.message);
  const anyErr = err as { statusCode?: number; responseBody?: string; cause?: unknown };
  if (anyErr.statusCode) console.log("statusCode:", anyErr.statusCode);
  if (anyErr.responseBody) console.log("responseBody:", anyErr.responseBody);
  if (anyErr.cause) console.log("cause:", String(anyErr.cause));
}
process.exit(0);
