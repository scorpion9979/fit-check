import { NextResponse } from "next/server";
import { runDemandAgent } from "@/lib/agents/demandAgent";
import { saveBid } from "@/lib/db/jsonStore";
import { BidSchema } from "@/lib/schema/bid";
import { CONDITION_GRADES, ConditionGrade } from "@/lib/schema/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coerceGrade(g: unknown): ConditionGrade | undefined {
  return typeof g === "string" && (CONDITION_GRADES as readonly string[]).includes(g)
    ? (g as ConditionGrade)
    : undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body.query as string;
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const maxPriceGbp = Number(body.price_gbp);
    const { bid, mappings } = await runDemandAgent(query, body.buyer_id, {
      maxPriceGbp: Number.isFinite(maxPriceGbp) ? maxPriceGbp : undefined,
      conditionMin: coerceGrade(body.grade),
    });
    const saved = saveBid(bid);

    return NextResponse.json({
      bid: BidSchema.parse(saved),
      mappings,
    });
  } catch (error) {
    console.error("Parse demand error:", error);
    return NextResponse.json({ error: "Failed to parse demand" }, { status: 500 });
  }
}
