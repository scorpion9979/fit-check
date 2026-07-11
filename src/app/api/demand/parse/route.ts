import { NextResponse } from "next/server";
import { parseDemand } from "@/lib/demand/parseDemand";
import { saveBid } from "@/lib/db/jsonStore";
import { BidSchema } from "@/lib/schema/bid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body.query as string;
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const { bid, mappings } = parseDemand(query, body.buyer_id);
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
