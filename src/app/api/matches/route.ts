import { NextResponse } from "next/server";
import { getBid, getItems, getSuppliers } from "@/lib/db/jsonStore";
import { runMatchAgent } from "@/lib/agents/matchAgent";
import { toMatchView } from "@/lib/fitcheck/matchView";
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
    const scored = await runMatchAgent(bid, items, suppliers);
    const matches = scored.map((m) => toMatchView(bid, m));

    return NextResponse.json({ bid, matches, count: matches.length });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json({ error: "Failed to run matcher" }, { status: 500 });
  }
}
