import { generateObject, generateText, APICallError, type ModelMessage } from "ai";
import type { z } from "zod";

/**
 * Central AI Gateway config. A plain "provider/model" string routes through the
 * Vercel AI Gateway automatically (ai@6) — no gateway() wrapper needed. Auth is
 * env-only: AI_GATEWAY_API_KEY, or VERCEL_OIDC_TOKEN after `vercel env pull`.
 *
 * Model is overridable via FIT_CHECK_MODEL. Default is a fast, cheap model since
 * every endpoint makes small structured-extraction calls.
 */
export const MODEL = process.env.FIT_CHECK_MODEL ?? "anthropic/claude-haiku-4.5";

/** True when the gateway can authenticate — routes fall back to rules otherwise. */
export function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export class AgentUnavailableError extends Error {}

interface GenerateJSONOptions<T extends z.ZodType> {
  system: string;
  prompt: string;
  schema: T;
  /** Gateway observability tag, e.g. "feature:demand-parse". */
  feature: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

/**
 * Structured-output agent call: constrains the model to a zod schema and returns
 * a validated object. Throws AgentUnavailableError on gateway/parse failure so
 * callers can fall back deterministically.
 */
export async function generateJSON<T extends z.ZodType>({
  system,
  prompt,
  schema,
  feature,
  temperature = 0,
  maxOutputTokens = 1024,
  timeoutMs = 45000,
}: GenerateJSONOptions<T>): Promise<z.infer<T>> {
  if (!gatewayConfigured()) {
    throw new AgentUnavailableError("AI Gateway not configured");
  }
  try {
    const { object } = await generateObject({
      model: MODEL,
      schema,
      system,
      prompt,
      temperature,
      maxOutputTokens,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(timeoutMs),
      providerOptions: { gateway: { tags: [`feature:${feature}`] } },
    });
    return object;
  } catch (error) {
    if (APICallError.isInstance(error)) {
      console.error(`[agent:${feature}] gateway error ${error.statusCode}: ${error.message}`);
    } else {
      console.error(`[agent:${feature}] failed:`, error);
    }
    throw new AgentUnavailableError(`agent ${feature} failed`);
  }
}

/** Free-text agent call (for narrative prose). Same fallback semantics. */
export async function generateProse({
  system,
  messages,
  feature,
  temperature = 0.3,
  maxOutputTokens = 256,
}: {
  system: string;
  messages: ModelMessage[];
  feature: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  if (!gatewayConfigured()) {
    throw new AgentUnavailableError("AI Gateway not configured");
  }
  try {
    const { text } = await generateText({
      model: MODEL,
      system,
      messages,
      temperature,
      maxOutputTokens,
      providerOptions: { gateway: { tags: [`feature:${feature}`] } },
    });
    return text.trim();
  } catch (error) {
    console.error(`[agent:${feature}] prose failed:`, error);
    throw new AgentUnavailableError(`agent ${feature} failed`);
  }
}
