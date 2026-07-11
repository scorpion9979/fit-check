import { SellerSummaryCard } from "@/lib/schema/sellerSummary";
import { generateProse } from "./gateway";

const SYSTEM = [
  "You are a marketplace analyst writing a one-line specialty summary for a resale supplier.",
  "You are given the supplier's aggregated sales stats. Write ONE concise, factual sentence describing what they specialize in.",
  "Ground every claim in the given numbers — reference their top categories, leading brands, and typical price band.",
  "Be neutral and non-promotional. No emojis, no hype. Output only the sentence, no preamble.",
].join(" ");

/**
 * Rewrite the deterministic specialty_line with an LLM-authored one, grounded in
 * the already-computed stats. Returns the original card unchanged if the gateway
 * is unavailable — aggregation stays deterministic, only the prose is agentic.
 */
export async function enhanceSpecialtyLine(card: SellerSummaryCard): Promise<SellerSummaryCard> {
  try {
    const facts = {
      name: card.name,
      location: card.location,
      total_sales: card.total_sales,
      top_categories: card.top_categories.map((c) => ({ category: c.label, share: c.share })),
      top_brands: card.top_brands.map((b) => ({ brand: b.brand, count: b.count })),
      price_range: card.price_range,
      avg_rating: card.avg_rating,
    };
    const line = await generateProse({
      feature: "seller-summary",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Supplier stats:\n"""${JSON.stringify(facts, null, 2)}"""\n\nWrite the one-line specialty summary.`,
        },
      ],
      maxOutputTokens: 120,
    });
    if (!line) return card;
    return { ...card, specialty_line: line.replace(/^["']|["']$/g, "") };
  } catch {
    return card;
  }
}
