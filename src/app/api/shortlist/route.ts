import { NextResponse } from "next/server";
import { addToShortlist, getShortlist, removeFromShortlist } from "@/lib/db/jsonStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bidId = searchParams.get("bidId") ?? undefined;
  return NextResponse.json({ shortlist: getShortlist(bidId) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { match_id, bid_id, card_snapshot } = body;
    if (!match_id || !bid_id) {
      return NextResponse.json({ error: "match_id and bid_id required" }, { status: 400 });
    }
    const entry = {
      match_id,
      bid_id,
      saved_at: new Date().toISOString(),
      card_snapshot,
    };
    addToShortlist(entry);
    return NextResponse.json({ ok: true, entry });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }
  removeFromShortlist(matchId);
  return NextResponse.json({ ok: true });
}
