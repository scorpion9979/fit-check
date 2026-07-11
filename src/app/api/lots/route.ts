import { NextResponse } from "next/server";
import { getBids, getItems, saveItem } from "@/lib/db/jsonStore";
import { ItemMetadata, ItemMetadataSchema } from "@/lib/schema/item";
import { hardFilter } from "@/lib/matching/hardFilter";
import { softScore } from "@/lib/matching/softScore";
import { toDeckCard } from "@/lib/fitcheck/presenter";

/** GET /api/lots — swipe-deck feed of live lots, each tagged with open-bid matches. */
export async function GET() {
  try {
    const items = getItems();
    const bids = getBids();
    // Newest first, so freshly-listed lots surface at the top of the deck.
    const ordered = [...items].reverse();
    const cards = ordered.map((item, i) => toDeckCard(item, bids, i));
    return NextResponse.json({ cards, count: cards.length });
  } catch (error) {
    console.error("Lots feed error:", error);
    return NextResponse.json({ error: "Failed to load lots" }, { status: 500 });
  }
}

/** POST /api/lots — list a lot to Fleek, then clear it against the open bid book. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ItemMetadata> & { supplier_id?: string };

    const now = new Date();
    const draft: ItemMetadata = ItemMetadataSchema.parse({
      ...body,
      item_id: `item_${now.getTime()}`,
      supplier_id: body.supplier_id ?? "sup_001",
      listed_at: now.toISOString(),
    });

    const saved = saveItem(draft);

    const bids = getBids();
    const clearedBids = bids.filter(
      (bid) => hardFilter(bid, saved).pass && softScore(bid, saved) >= bid.match_threshold,
    );

    return NextResponse.json({
      item: saved,
      cleared: clearedBids.length,
      cleared_bids: clearedBids.map((b) => ({
        bid_id: b.bid_id,
        max_price_gbp: b.hard.max_price_gbp,
        raw_query: b.raw_query,
      })),
    });
  } catch (error) {
    console.error("List lot error:", error);
    return NextResponse.json({ error: "Failed to list lot" }, { status: 400 });
  }
}
