import { NextResponse } from "next/server";
import { getSalesHistory, getSuppliers } from "@/lib/db/jsonStore";
import { runSellerSummaryAgent } from "@/lib/agent/sellerSummaryAgent";
import { enhanceSpecialtyLine } from "@/lib/agents/sellerAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sellerId = searchParams.get("sellerId");

  const suppliers = getSuppliers();
  const sales = getSalesHistory();

  if (!sellerId) {
    return NextResponse.json({
      sellers: suppliers.map((s) => ({
        supplier_id: s.supplier_id,
        name: s.name,
        location: s.location,
        avatar_url: s.avatar_url,
      })),
    });
  }

  const supplier = suppliers.find((s) => s.supplier_id === sellerId);
  if (!supplier) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  const card = await enhanceSpecialtyLine(runSellerSummaryAgent(supplier, sales));
  return NextResponse.json({ card });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sellerId = body.seller_id as string | undefined;
    if (!sellerId) {
      return NextResponse.json({ error: "seller_id required" }, { status: 400 });
    }

    const suppliers = getSuppliers();
    const supplier = suppliers.find((s) => s.supplier_id === sellerId);
    if (!supplier) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    const sales = getSalesHistory();
    const card = await enhanceSpecialtyLine(runSellerSummaryAgent(supplier, sales));

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Seller summary agent error:", error);
    return NextResponse.json({ error: "Agent run failed" }, { status: 500 });
  }
}
