import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runBillingRenewal } from "@/lib/billing/renewal";

export const runtime = "nodejs";

function cronSecretMatches(header: string | null): boolean {
  const expected = process.env.BILLING_CRON_SECRET?.trim();
  if (!expected) return false;
  const got = header?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const expectedBuf = Buffer.from(expected);
  const gotBuf = Buffer.from(got);
  if (expectedBuf.length !== gotBuf.length) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}

/**
 * Nightly renewal. Authenticated with BILLING_CRON_SECRET, not a user session.
 * If the secret is unset the route stays closed so it cannot be probed in prod.
 */
export async function POST(req: NextRequest) {
  if (!process.env.BILLING_CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  if (!cronSecretMatches(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runBillingRenewal();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Billing cron renewal failed", error);
    return NextResponse.json({ error: "Renewal failed" }, { status: 500 });
  }
}
