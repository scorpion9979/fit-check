import { NextResponse } from "next/server";
import { runSellAgent } from "@/lib/agents/sellAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sell/extract — "photo → spec" typing pass via the AI Gateway.
 * Body: { seed?: number }. Returns a closed-enum draft with per-field confidence.
 */
export async function POST(request: Request) {
  try {
    let seed = 0;
    try {
      const body = await request.json();
      if (typeof body?.seed === "number") seed = body.seed;
    } catch {
      // empty body is fine — default seed
    }
    const draft = await runSellAgent(seed);
    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Extract spec error:", error);
    return NextResponse.json({ error: "Failed to read garment" }, { status: 500 });
  }
}
