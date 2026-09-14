/**
 * Subscription lifecycle.
 *
 * One row per organization, mutated over time. History is append-only in
 * SubscriptionEvent. Price changes never rewrite a pinned PlanVersion — they
 * point the row at a different version, either immediately (upgrade / free) or
 * at period end (downgrade).
 */

import type { BillingCycle, Prisma, PrismaClient, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invalidateEntitlements } from "./entitlements";
import { currentPeriodWindow, periodEndFor } from "./periods";

export class SubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionError";
  }
}

type DbClient = PrismaClient | Prisma.TransactionClient;

const PLAN_VERSION_SELECT = {
  id: true,
  planId: true,
  amountMinor: true,
  billingCycle: true,
  trialDays: true,
  currency: true,
  versionLabel: true,
  plan: {
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      status: true,
      visibility: true,
      isFallback: true,
    },
  },
} satisfies Prisma.PlanVersionSelect;

export type LoadedPlanVersion = Prisma.PlanVersionGetPayload<{
  select: typeof PLAN_VERSION_SELECT;
}>;

async function recordEvent(
  db: DbClient,
  params: {
    subscriptionId: string;
    fromStatus?: SubscriptionStatus | null;
    toStatus: SubscriptionStatus;
    fromPlanVersionId?: string | null;
    toPlanVersionId?: string | null;
    reason: string;
    actorUserId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await db.subscriptionEvent.create({
    data: {
      subscriptionId: params.subscriptionId,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus,
      fromPlanVersionId: params.fromPlanVersionId ?? null,
      toPlanVersionId: params.toPlanVersionId ?? null,
      reason: params.reason,
      actorUserId: params.actorUserId ?? null,
      metadata: params.metadata,
    },
  });
}

export async function loadFallbackVersion(
  db: DbClient = prisma
): Promise<LoadedPlanVersion> {
  const plan = await db.plan.findFirst({
    where: { isFallback: true, status: "ACTIVE" },
    select: { id: true },
  });
  if (!plan) {
    throw new SubscriptionError(
      "No active fallback plan is configured. Seed the billing catalog first."
    );
  }

  const version = await db.planVersion.findFirst({
    where: { planId: plan.id, isCurrent: true },
    select: PLAN_VERSION_SELECT,
  });
  if (!version) {
    throw new SubscriptionError(
      "The fallback plan has no current version, so a subscription cannot be created."
    );
  }
  return version;
}

export async function loadCurrentVersion(
  planId: string,
  db: DbClient = prisma
): Promise<LoadedPlanVersion> {
  const version = await db.planVersion.findFirst({
    where: { planId, isCurrent: true, plan: { status: "ACTIVE" } },
    select: PLAN_VERSION_SELECT,
  });
  if (!version) {
    throw new SubscriptionError("That plan is not active, or has no current version.");
  }
  return version;
}

function periodForVersion(version: LoadedPlanVersion, now = new Date()) {
  const trialDays = version.trialDays > 0 && version.amountMinor > 0 ? version.trialDays : 0;
  if (trialDays > 0) {
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    return {
      status: "TRIALING" as SubscriptionStatus,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      trialEndsAt,
    };
  }
  const window = currentPeriodWindow(version.billingCycle, now);
  return {
    status: "ACTIVE" as SubscriptionStatus,
    currentPeriodStart: window.start,
    currentPeriodEnd: window.end,
    trialEndsAt: null as Date | null,
  };
}

/**
 * Every organization gets a subscription. Missing rows would make entitlements
 * report "unconfigured" (unlimited), which is the wrong answer once a catalog
 * exists. Idempotent: existing rows are left alone.
 */
export async function ensureDefaultSubscription(
  organizationId: string,
  actorUserId?: string | null,
  db: DbClient = prisma
) {
  const existing = await db.subscription.findUnique({
    where: { organizationId },
    select: { id: true },
  });
  if (existing) return existing;

  const fallback = await loadFallbackVersion(db);
  const period = periodForVersion(fallback);

  const created = await db.subscription.create({
    data: {
      organizationId,
      planId: fallback.planId,
      planVersionId: fallback.id,
      status: period.status,
      billingCycle: fallback.billingCycle,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      trialEndsAt: period.trialEndsAt,
    },
    select: { id: true },
  });

  await recordEvent(db, {
    subscriptionId: created.id,
    toStatus: period.status,
    toPlanVersionId: fallback.id,
    reason: "default_fallback",
    actorUserId,
    metadata: { planCode: fallback.plan.code },
  });

  invalidateEntitlements(organizationId);
  return created;
}

export async function backfillDefaultSubscriptions(db: PrismaClient): Promise<number> {
  const orgs = await db.organization.findMany({
    where: { subscription: { is: null } },
    select: { id: true },
  });
  let created = 0;
  for (const org of orgs) {
    await ensureDefaultSubscription(org.id, null, db);
    created += 1;
  }
  if (created > 0) {
    console.log(`[seed] Created fallback subscriptions for ${created} organization(s)`);
  }
  return created;
}

export async function listPublicPlans() {
  const plans = await prisma.plan.findMany({
    where: { status: "ACTIVE", visibility: "PUBLIC" },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      visibility: true,
      isFallback: true,
      versions: {
        where: { isCurrent: true },
        select: {
          id: true,
          versionLabel: true,
          currency: true,
          amountMinor: true,
          billingCycle: true,
          trialDays: true,
        },
        take: 1,
      },
    },
  });

  return plans.flatMap((plan) => {
    const version = plan.versions[0];
    if (!version) return [];
    return [
      {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        visibility: plan.visibility,
        isFallback: plan.isFallback,
        version,
      },
    ];
  });
}

const SUBSCRIPTION_DETAIL_SELECT = {
  id: true,
  status: true,
  billingCycle: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  trialEndsAt: true,
  gracePeriodEndsAt: true,
  cancelAtPeriodEnd: true,
  canceledAt: true,
  planId: true,
  planVersionId: true,
  plan: {
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      visibility: true,
      isFallback: true,
    },
  },
  planVersion: {
    select: {
      id: true,
      versionLabel: true,
      currency: true,
      amountMinor: true,
      billingCycle: true,
      trialDays: true,
    },
  },
  scheduledChange: {
    where: { appliedAt: null },
    orderBy: { effectiveAt: "asc" },
    take: 1,
    select: {
      effectiveAt: true,
      targetPlanVersion: {
        select: {
          amountMinor: true,
          currency: true,
          plan: { select: { name: true, code: true } },
        },
      },
    },
  },
} satisfies Prisma.SubscriptionSelect;

export async function getSubscriptionDetail(organizationId: string) {
  await ensureDefaultSubscription(organizationId);
  const row = await prisma.subscription.findUnique({
    where: { organizationId },
    select: SUBSCRIPTION_DETAIL_SELECT,
  });
  if (!row) {
    throw new SubscriptionError("Subscription could not be loaded");
  }

  const pending = row.scheduledChange[0];
  return {
    id: row.id,
    status: row.status,
    billingCycle: row.billingCycle,
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd.toISOString(),
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    gracePeriodEndsAt: row.gracePeriodEndsAt?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    canceledAt: row.canceledAt?.toISOString() ?? null,
    plan: {
      id: row.plan.id,
      code: row.plan.code,
      name: row.plan.name,
      description: row.plan.description,
      visibility: row.plan.visibility,
      isFallback: row.plan.isFallback,
      version: row.planVersion,
    },
    scheduledChange: pending
      ? {
          planName: pending.targetPlanVersion.plan.name,
          planCode: pending.targetPlanVersion.plan.code,
          amountMinor: pending.targetPlanVersion.amountMinor,
          currency: pending.targetPlanVersion.currency,
          effectiveAt: pending.effectiveAt.toISOString(),
        }
      : null,
  };
}

async function pinVersion(params: {
  organizationId: string;
  version: LoadedPlanVersion;
  reason: string;
  actorUserId?: string | null;
  startNewPeriod: boolean;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const existing = await prisma.subscription.findUnique({
    where: { organizationId: params.organizationId },
    select: {
      id: true,
      status: true,
      planVersionId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });
  if (!existing) {
    throw new SubscriptionError("Subscription not found");
  }

  const period = params.startNewPeriod
    ? periodForVersion(params.version, now)
    : {
        status: "ACTIVE" as SubscriptionStatus,
        currentPeriodStart: existing.currentPeriodStart,
        currentPeriodEnd: existing.currentPeriodEnd,
        trialEndsAt: null as Date | null,
      };

  await prisma.$transaction(async (tx) => {
    await tx.scheduledPlanChange.updateMany({
      where: { subscriptionId: existing.id, appliedAt: null },
      data: { appliedAt: now },
    });
    await tx.subscription.update({
      where: { id: existing.id },
      data: {
        planId: params.version.planId,
        planVersionId: params.version.id,
        status: period.status,
        billingCycle: params.version.billingCycle,
        currentPeriodStart: period.currentPeriodStart,
        currentPeriodEnd: period.currentPeriodEnd,
        trialEndsAt: period.trialEndsAt,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        failedAttempts: 0,
        gracePeriodEndsAt: null,
      },
    });
    await recordEvent(tx, {
      subscriptionId: existing.id,
      fromStatus: existing.status,
      toStatus: period.status,
      fromPlanVersionId: existing.planVersionId,
      toPlanVersionId: params.version.id,
      reason: params.reason,
      actorUserId: params.actorUserId,
      metadata: { planCode: params.version.plan.code },
    });
  });

  invalidateEntitlements(params.organizationId);
}

async function scheduleChange(params: {
  organizationId: string;
  version: LoadedPlanVersion;
  reason: string;
  actorUserId?: string | null;
}) {
  const existing = await prisma.subscription.findUnique({
    where: { organizationId: params.organizationId },
    select: { id: true, currentPeriodEnd: true },
  });
  if (!existing) throw new SubscriptionError("Subscription not found");

  await prisma.$transaction(async (tx) => {
    await tx.scheduledPlanChange.updateMany({
      where: { subscriptionId: existing.id, appliedAt: null },
      data: { appliedAt: new Date() },
    });
    await tx.scheduledPlanChange.create({
      data: {
        subscriptionId: existing.id,
        targetPlanVersionId: params.version.id,
        effectiveAt: existing.currentPeriodEnd,
        reason: params.reason,
        createdBy: params.actorUserId ?? null,
      },
    });
  });
}

export type ChangePlanResult =
  | { outcome: "unchanged" }
  | { outcome: "applied" }
  | { outcome: "scheduled"; effectiveAt: Date }
  | { outcome: "requires_payment"; planVersionId: string; amountMinor: number; currency: string };

/**
 * Self-serve plan change. Paid upgrades go through checkout rather than
 * flipping the plan first — otherwise a customer would get Grow entitlements
 * before PayFast confirmed the money.
 */
export async function requestPlanChange(params: {
  organizationId: string;
  planId: string;
  actorUserId?: string | null;
  allowPrivate?: boolean;
}): Promise<ChangePlanResult> {
  await ensureDefaultSubscription(params.organizationId, params.actorUserId);
  const target = await loadCurrentVersion(params.planId);

  if (!params.allowPrivate && target.plan.visibility === "PRIVATE") {
    throw new SubscriptionError("This plan is assigned by an administrator, not self-serve checkout.");
  }

  const current = await prisma.subscription.findUnique({
    where: { organizationId: params.organizationId },
    select: {
      planVersionId: true,
      planVersion: { select: { amountMinor: true } },
    },
  });
  if (!current) throw new SubscriptionError("Subscription not found");

  if (current.planVersionId === target.id) {
    await prisma.subscription.update({
      where: { organizationId: params.organizationId },
      data: { cancelAtPeriodEnd: false, canceledAt: null },
    });
    return { outcome: "unchanged" };
  }

  const currentAmount = current.planVersion.amountMinor;
  const targetAmount = target.amountMinor;

  if (targetAmount === 0 && currentAmount === 0) {
    await pinVersion({
      organizationId: params.organizationId,
      version: target,
      reason: "free_plan_change",
      actorUserId: params.actorUserId,
      startNewPeriod: false,
    });
    return { outcome: "applied" };
  }

  if (targetAmount === 0 || targetAmount < currentAmount) {
    await scheduleChange({
      organizationId: params.organizationId,
      version: target,
      reason: targetAmount === 0 ? "downgrade_to_free" : "downgrade",
      actorUserId: params.actorUserId,
    });
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: params.organizationId },
      select: { currentPeriodEnd: true },
    });
    return { outcome: "scheduled", effectiveAt: sub!.currentPeriodEnd };
  }

  if (targetAmount > currentAmount) {
    return {
      outcome: "requires_payment",
      planVersionId: target.id,
      amountMinor: targetAmount,
      currency: target.currency,
    };
  }

  // Same price, different plan — apply now, keep the current period.
  await pinVersion({
    organizationId: params.organizationId,
    version: target,
    reason: "lateral_change",
    actorUserId: params.actorUserId,
    startNewPeriod: false,
  });
  return { outcome: "applied" };
}

/** Admin / webhook path: apply a version immediately and start a fresh period. */
export async function applyPlanVersionNow(params: {
  organizationId: string;
  planVersionId: string;
  reason: string;
  actorUserId?: string | null;
}) {
  await ensureDefaultSubscription(params.organizationId, params.actorUserId);
  const version = await prisma.planVersion.findUnique({
    where: { id: params.planVersionId },
    select: PLAN_VERSION_SELECT,
  });
  if (!version) throw new SubscriptionError("Plan version not found");
  if (version.plan.status !== "ACTIVE") {
    throw new SubscriptionError("That plan is not active");
  }

  await pinVersion({
    organizationId: params.organizationId,
    version,
    reason: params.reason,
    actorUserId: params.actorUserId,
    startNewPeriod: true,
  });
}

export async function assignPlanByAdmin(params: {
  organizationId: string;
  planId: string;
  actorUserId: string;
  reason?: string;
}) {
  await ensureDefaultSubscription(params.organizationId, params.actorUserId);
  const version = await loadCurrentVersion(params.planId);
  await pinVersion({
    organizationId: params.organizationId,
    version,
    reason: params.reason?.trim() || "admin_assign",
    actorUserId: params.actorUserId,
    startNewPeriod: true,
  });
}

export async function cancelAtPeriodEnd(
  organizationId: string,
  actorUserId?: string | null
) {
  await ensureDefaultSubscription(organizationId, actorUserId);
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { id: true, status: true, plan: { select: { isFallback: true } } },
  });
  if (!sub) throw new SubscriptionError("Subscription not found");
  if (sub.plan.isFallback) {
    throw new SubscriptionError("The free plan cannot be cancelled.");
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
  });
  await recordEvent(prisma, {
    subscriptionId: sub.id,
    fromStatus: sub.status,
    toStatus: sub.status,
    reason: "cancel_at_period_end",
    actorUserId,
  });
}

export async function resumeSubscription(
  organizationId: string,
  actorUserId?: string | null
) {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { id: true, status: true, cancelAtPeriodEnd: true },
  });
  if (!sub) throw new SubscriptionError("Subscription not found");
  if (!sub.cancelAtPeriodEnd) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: false, canceledAt: null },
  });
  await recordEvent(prisma, {
    subscriptionId: sub.id,
    fromStatus: sub.status,
    toStatus: sub.status,
    reason: "resume",
    actorUserId,
  });
}

/**
 * Apply due scheduled changes and cancellations. Called from the billing page
 * (lazy) and from the renewal job. Paid renewals are a separate path.
 */
export async function applyDuePlanChanges(organizationId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      status: true,
      planVersionId: true,
    },
  });
  if (!sub) return;

  const now = new Date();
  if (sub.currentPeriodEnd > now) return;

  const pending = await prisma.scheduledPlanChange.findFirst({
    where: { subscriptionId: sub.id, appliedAt: null, effectiveAt: { lte: now } },
    orderBy: { effectiveAt: "asc" },
    select: { targetPlanVersionId: true },
  });

  if (pending) {
    await applyPlanVersionNow({
      organizationId,
      planVersionId: pending.targetPlanVersionId,
      reason: "scheduled_change",
    });
    return;
  }

  if (sub.cancelAtPeriodEnd) {
    await revertToFallbackPlan({
      organizationId,
      reason: "canceled_period_ended",
      now,
    });
  }
}

/** Move the org onto the free fallback plan and start a new period. Data is kept. */
export async function revertToFallbackPlan(params: {
  organizationId: string;
  reason: string;
  actorUserId?: string | null;
  now?: Date;
}) {
  const fallback = await loadFallbackVersion();
  await pinVersion({
    organizationId: params.organizationId,
    version: fallback,
    reason: params.reason,
    actorUserId: params.actorUserId,
    startNewPeriod: true,
    now: params.now,
  });
}

export function nextPeriodEnd(cycle: BillingCycle, from: Date): Date {
  return periodEndFor(cycle, from);
}

export async function rollFreePeriod(organizationId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      status: true,
      billingCycle: true,
      currentPeriodEnd: true,
      planVersion: { select: { amountMinor: true } },
    },
  });
  if (!sub) return;
  if (sub.planVersion.amountMinor > 0) return;
  if (sub.currentPeriodEnd > new Date()) return;

  const start = sub.currentPeriodEnd;
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: start,
      currentPeriodEnd: periodEndFor(sub.billingCycle, start),
      failedAttempts: 0,
    },
  });
}
