import { NextResponse } from "next/server";

/**
 * Lightweight liveness probe for deploy scripts and load balancers.
 * GET /api/health → 200 { ok: true }
 */
export async function GET() {
  return NextResponse.json({ ok: true, status: "healthy" }, { status: 200 });
}

export const dynamic = "force-dynamic";
