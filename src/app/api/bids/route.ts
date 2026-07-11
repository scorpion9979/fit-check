import { NextResponse } from "next/server";
import { getBids, getItems, getSuppliers, saveBid } from "@/lib/db/jsonStore";
import { Bid, BidSchema, SoftTraitWeight } from "@/lib/schema/bid";
import { DEMO_CATEGORIES, JACKETS_CATEGORY } from "@/lib/schema/enums";
import { toBookEntry } from "@/lib/fitcheck/presenter";

/** Expand a category leaf ("Jackets") to a full GPC-style path, if we know it. */
function expandCategory(input?: string): string {
  if (!input) return JACKETS_CATEGORY;
  if (input.includes(">")) return input;
  const leaf = input.trim().toLowerCase();
  const match = DEMO_CATEGORIES.find((c) =>
    c.split(">").pop()!.trim().toLowerCase().includes(leaf),
  );
  return match ?? JACKETS_CATEGORY;
}

/** GET /api/bids — the trait-bid order book with live match meters. */
export async function GET() {
  try {
    const bids = getBids();
    const items = getItems();
    const suppliers = getSuppliers();
    const entries = bids.map((bid) => toBookEntry(bid, items, suppliers));
    return NextResponse.json({ entries, count: entries.length });
  } catch (error) {
    console.error("Bids book error:", error);
    return NextResponse.json({ error: "Failed to load bids" }, { status: 500 });
  }
}

interface CreateBidBody {
  category?: string;
  max_price_gbp?: number;
  size_label?: Bid["hard"]["size_label"];
  condition_min?: Bid["hard"]["condition_min"];
  gender?: Bid["hard"]["gender"];
  match_threshold?: number;
  soft?: Bid["soft"];
}

/** POST /api/bids — rest a new trait bid in the book (composer). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBidBody;
    const now = new Date();

    const soft: Bid["soft"] = body.soft ?? {
      era: { want: ["90s", "y2k"], w: 0.3 } as SoftTraitWeight,
      colors: { want: ["forest_green", "tan"], w: 0.25 } as SoftTraitWeight,
      style_tags: { want: ["gorpcore"], w: 0.25 } as SoftTraitWeight,
      fit: { want: ["boxy"], w: 0.2 } as SoftTraitWeight,
    };

    const bid: Bid = BidSchema.parse({
      bid_id: `bid_${now.getTime()}`,
      buyer_id: "buyer_001",
      created_at: now.toISOString(),
      expires: new Date(now.getTime() + 30 * 86400000).toISOString(),
      hard: {
        category: expandCategory(body.category),
        size_label: body.size_label?.length ? body.size_label : ["L", "XL"],
        condition_min: body.condition_min ?? "B",
        max_price_gbp: body.max_price_gbp ?? 45,
        gender: body.gender ?? "unisex",
      },
      soft,
      match_threshold: body.match_threshold ?? 0.75,
      min_confidence: 0.8,
    });

    const saved = saveBid(bid);
    const items = getItems();
    const suppliers = getSuppliers();
    const entry = toBookEntry(saved, items, suppliers);

    return NextResponse.json({ bid: saved, entry });
  } catch (error) {
    console.error("Create bid error:", error);
    return NextResponse.json({ error: "Failed to create bid" }, { status: 400 });
  }
}
