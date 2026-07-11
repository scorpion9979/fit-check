import { NextResponse } from "next/server";
import { getBid, getItems, getSuppliers } from "@/lib/db/jsonStore";
import { runMatcherLLM } from "@/lib/agents/matchAgent";
import { DEMO_BID_ID } from "@/lib/schema/bid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bidId = searchParams.get("bidId") ?? DEMO_BID_ID;

    const bid = getBid(bidId);
    if (!bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const items = getItems();
    const suppliers = getSuppliers();
    const { results, cards } = await runMatcherLLM(bid, items, suppliers);

    return NextResponse.json({
      bid,
      results,
      cards,
      count: cards.length,
    });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json({ error: "Failed to run matcher" }, { status: 500 });
  }
}
