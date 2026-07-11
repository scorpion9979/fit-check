import { NextResponse } from "next/server";
import { resetStore } from "@/lib/db/jsonStore";

export async function POST() {
  const store = resetStore();
  return NextResponse.json({ ok: true, seeded: store.seeded });
}
