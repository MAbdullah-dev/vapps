/**
 * Period-end renewal and dunning.
 *
 * Free plans just roll the window. Paid plans with no stored instrument token
 * move to PAST_DUE and keep entitlements through a grace window. If they still
 * have not paid when grace ends, they fall back to Seed — tenant data is never
 * deleted. Auto-charge is intentionally not called here until PayFast confirms
 * merchant-initiated recurring charges for this account.
 */

import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addCalendarDays } from "./periods";
import { notifyDowngraded, notifyPastDue } from "./notifications";
import {
  applyDuePlanChanges,
  revertToFallbackPlan,
  rollFreePeriod,
} from "./subscription-service";

const DUE_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "GRACE"] as const;

type DueSubscription = {
  id: string;
  organizationId: string;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  gracePeriodEndsAt: Date | null;
  plan: { name: string };
  planVersion: { amountMinor: number };
  scheduledChange: { id: string }[];
};

export type BillingRenewalResult = {
  scanned: number;
  rolled: number;
  pastDue: number;
  changed: number;
  downgraded: number;
};

/** Days a paid org keeps Grow/Enterprise entitlements after the period ends unpaid. */
export function getGraceDays(): number {
  const raw = (process.env.BILLING_GRACE_DAYS ?? "7").trim();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 7;
  return Math.min(parsed, 90);
}

const DUE_SELECT = {
  id: true,
  organizationId: true,
  status: true,
  cancelAtPeriodEnd: true,
  gracePeriodEndsAt: true,
  plan: { select: { name: true } },
  planVersion: { select: { amountMinor: true } },
  scheduledChange: {
    where: { appliedAt: null },
    select: { id: true },
    take: 1,
  },
} as const;

async function processDueSubscription(
  sub: DueSubscription,
  now: Date,
  graceDays: number
): Promise<"rolled" | "pastDue" | "changed" | "downgraded" | "noop"> {
  const downgradeToFallback = async () => {
    await revertToFallbackPlan({
      organizationId: sub.organizationId,
      reason: "dunning_grace_ended",
      now,
    });
    await notifyDowngraded(sub.organizationId, sub.plan.name, now);
    return "downgraded" as const;
  };

  if (sub.cancelAtPeriodEnd || sub.scheduledChange.length > 0) {
    await applyDuePlanChanges(sub.organizationId);
    return "changed";
  }

  if (sub.planVersion.amountMinor === 0) {
    await rollFreePeriod(sub.organizationId);
    return "rolled";
  }

  if (sub.status === "PAST_DUE" || sub.status === "GRACE") {
    if (!sub.gracePeriodEndsAt) {
      if (graceDays === 0) return downgradeToFallback();
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { gracePeriodEndsAt: addCalendarDays(now, graceDays) },
      });
      await notifyPastDue(sub.organizationId);
      return "noop";
    }
    if (sub.gracePeriodEndsAt <= now) return downgradeToFallback();
    return "noop";
  }

  if (graceDays === 0) return downgradeToFallback();

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "PAST_DUE",
      failedAttempts: { increment: 1 },
      lastAttemptAt: now,
      gracePeriodEndsAt: addCalendarDays(now, graceDays),
    },
  });
  await notifyPastDue(sub.organizationId);
  return "pastDue";
}

/** Lazy path: the billing page applies due work for this org even if cron has not run. */
export async function applyDueBilling(
  organizationId: string,
  now = new Date()
): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { ...DUE_SELECT, currentPeriodEnd: true },
  });
  if (!sub || sub.currentPeriodEnd > now) return;
  if (!DUE_STATUSES.includes(sub.status as (typeof DUE_STATUSES)[number])) return;

  await processDueSubscription(sub, now, getGraceDays());
}

export async function runBillingRenewal(now = new Date()): Promise<BillingRenewalResult> {
  const due = await prisma.subscription.findMany({
    where: {
      status: { in: [...DUE_STATUSES] },
      currentPeriodEnd: { lte: now },
    },
    select: DUE_SELECT,
  });

  const result: BillingRenewalResult = {
    scanned: due.length,
    rolled: 0,
    pastDue: 0,
    changed: 0,
    downgraded: 0,
  };
  const graceDays = getGraceDays();

  for (const sub of due) {
    try {
      const outcome = await processDueSubscription(sub, now, graceDays);
      if (outcome === "noop") continue;
      result[outcome] += 1;
    } catch (error) {
      console.error("[billing] renewal failed for org", sub.organizationId, error);
    }
  }

  return result;
}
