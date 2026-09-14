#!/usr/bin/env node
/**
 * Trigger period-end billing renewal against the running app.
 *
 *   node scripts/run-billing-renewal.js
 *
 * Requires BILLING_CRON_SECRET. Uses NEXTAUTH_URL or NEXT_PUBLIC_APP_URL as the
 * base, defaulting to http://127.0.0.1:3000 for a local/PM2 process.
 */

try {
  require("dotenv").config();
} catch {
  // Optional. PM2/CI inject env; Prisma's dotenv may already be hoisted.
}

async function main() {
  const secret = (process.env.BILLING_CRON_SECRET || "").trim();
  if (!secret) {
    console.warn(
      "[billing] BILLING_CRON_SECRET is unset; skip renewal. Use Admin → Plans → Run renewal, or set the secret."
    );
    process.exit(0);
  }

  const base = (
    process.env.BILLING_CRON_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");

  const res = await fetch(`${base}/api/cron/billing-renew`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const text = await res.text();
  let body = text;
  try {
    body = JSON.stringify(JSON.parse(text));
  } catch {
    /* keep raw */
  }

  if (!res.ok) {
    console.error(`[billing] renewal HTTP ${res.status}: ${body}`);
    process.exit(1);
  }

  console.log(`[billing] renewal ok: ${body}`);
}

main().catch((error) => {
  console.error("[billing] renewal script failed", error);
  process.exit(1);
});
