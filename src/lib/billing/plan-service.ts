/**
 * Plan administration.
 *
 * All plan invariants live here rather than in route handlers, because breaking
 * one of them corrupts billing quietly:
 *
 * - A PlanVersion that has subscribers is immutable. Changing its price or limits
 *   would retroactively alter what existing customers agreed to. Raising a price
 *   means creating a new version; old subscribers stay pinned to theirs.
 * - Exactly one plan is the fallback, and it cannot be archived. Without it,
 *   canceled subscriptions have nowhere to degrade to.
 * - At most one version per plan is current. The database enforces this too, but
 *   the order of updates here is what makes the transition succeed.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getEntitlementDefinition,
  isKnownEntitlementKey,
  type EntitlementKind,
  type LimitAction,
} from "./entitlement-keys";
import { invalidateAllEntitlements } from "./entitlements";

export class PlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanValidationError";
  }
}

export type EntitlementInput = {
  key: string;
  kind: EntitlementKind;
  numberValue?: number | null;
  boolValue?: boolean | null;
  textValue?: string | null;
  onExceed?: LimitAction;
};

const PLAN_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  status: true,
  visibility: true,
  displayOrder: true,
  isFallback: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlanSelect;

const VERSION_SELECT = {
  id: true,
  versionLabel: true,
  currency: true,
  amountMinor: true,
  billingCycle: true,
  trialDays: true,
  effectiveFrom: true,
  effectiveTo: true,
  isCurrent: true,
  createdAt: true,
  entitlements: {
    select: {
      id: true,
      key: true,
      kind: true,
      numberValue: true,
      boolValue: true,
      textValue: true,
      onExceed: true,
    },
    orderBy: { key: "asc" },
  },
  _count: { select: { subscriptions: true } },
} satisfies Prisma.PlanVersionSelect;

function normalizeCode(raw: unknown): string {
  const code = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(code)) {
    throw new PlanValidationError(
      "code must be 2-40 characters of lowercase letters, digits, hyphen or underscore"
    );
  }
  return code;
}

function validateEntitlements(input: unknown): EntitlementInput[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  return input.map((raw) => {
    const key = String(raw?.key ?? "").trim();
    if (!isKnownEntitlementKey(key)) {
      throw new PlanValidationError(`Unknown entitlement key: ${key || "(empty)"}`);
    }
    if (seen.has(key)) {
      throw new PlanValidationError(`Duplicate entitlement key: ${key}`);
    }
    seen.add(key);

    const definition = getEntitlementDefinition(key)!;
    const kind = String(raw?.kind ?? definition.kind) as EntitlementKind;

    // UNLIMITED is a valid substitute for any measurable entitlement, but a key
    // declared as BOOLEAN cannot suddenly carry a number.
    if (kind !== "UNLIMITED" && kind !== definition.kind) {
      throw new PlanValidationError(
        `Entitlement ${key} must be ${definition.kind} or UNLIMITED, received ${kind}`
      );
    }

    if (kind === "NUMBER") {
      const value = Number(raw?.numberValue);
      if (!Number.isInteger(value) || value < 0) {
        throw new PlanValidationError(
          `Entitlement ${key} requires a non-negative whole number`
        );
      }
      return {
        key,
        kind,
        numberValue: value,
        onExceed: raw?.onExceed === "BLOCK" ? "BLOCK" : definition.defaultOnExceed,
      };
    }

    if (kind === "BOOLEAN") {
      return {
        key,
        kind,
        boolValue: raw?.boolValue === true,
        onExceed: definition.defaultOnExceed,
      };
    }

    if (kind === "TEXT") {
      return {
        key,
        kind,
        textValue: String(raw?.textValue ?? "").trim(),
        onExceed: "WARN" as LimitAction,
      };
    }

    return { key, kind: "UNLIMITED" as EntitlementKind, onExceed: "WARN" as LimitAction };
  });
}

function validateAmountMinor(raw: unknown): number {
  const amount = Number(raw ?? 0);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new PlanValidationError(
      "amountMinor must be a non-negative whole number of minor units (paisa)"
    );
  }
  return amount;
}

async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.adminActionLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason ?? null,
      metadata: params.metadata,
    },
  });
}

export async function listPlans() {
  const plans = await prisma.plan.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      ...PLAN_SELECT,
      versions: { select: VERSION_SELECT, orderBy: { createdAt: "desc" } },
      _count: { select: { subscriptions: true } },
    },
  });

  return plans.map((plan) => ({
    ...plan,
    subscriberCount: plan._count.subscriptions,
    _count: undefined,
    versions: plan.versions.map((version) => ({
      ...version,
      subscriberCount: version._count.subscriptions,
      _count: undefined,
    })),
  }));
}

export async function getPlan(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: {
      ...PLAN_SELECT,
      versions: { select: VERSION_SELECT, orderBy: { createdAt: "desc" } },
    },
  });
  if (!plan) return null;

  return {
    ...plan,
    versions: plan.versions.map((version) => ({
      ...version,
      subscriberCount: version._count.subscriptions,
      _count: undefined,
    })),
  };
}

export async function createPlan(
  body: Record<string, unknown>,
  adminUserId: string
) {
  const code = normalizeCode(body.code);
  const name = String(body.name ?? "").trim();
  if (!name) throw new PlanValidationError("name is required");

  const existing = await prisma.plan.findUnique({
    where: { code },
    select: { id: true },
  });
  if (existing) {
    throw new PlanValidationError(`A plan with code "${code}" already exists`);
  }

  const entitlements = validateEntitlements(body.entitlements);
  const amountMinor = validateAmountMinor(body.amountMinor);

  const plan = await prisma.plan.create({
    data: {
      code,
      name,
      description: String(body.description ?? "").trim() || null,
      // New plans are always DRAFT. Activation is a separate, deliberate step so
      // a half-configured plan can never be bought.
      status: "DRAFT",
      visibility: body.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
      displayOrder: Number.isInteger(Number(body.displayOrder))
        ? Number(body.displayOrder)
        : 0,
      versions: {
        create: {
          versionLabel: String(body.versionLabel ?? "v1").trim() || "v1",
          currency: String(body.currency ?? "PKR").trim().toUpperCase(),
          amountMinor,
          billingCycle: body.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
          trialDays: Math.max(0, Number(body.trialDays ?? 0) || 0),
          isCurrent: true,
          entitlements: { create: entitlements },
        },
      },
    },
    select: PLAN_SELECT,
  });

  await logAdminAction({
    adminUserId,
    action: "billing.plan.create",
    targetType: "plan",
    targetId: plan.id,
    metadata: { code, name, amountMinor },
  });

  invalidateAllEntitlements();
  return plan;
}

export async function updatePlan(
  planId: string,
  body: Record<string, unknown>,
  adminUserId: string
) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, isFallback: true, status: true, code: true },
  });
  if (!plan) throw new PlanValidationError("Plan not found");

  const data: Prisma.PlanUpdateInput = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.description === "string") {
    data.description = body.description.trim() || null;
  }
  if (body.visibility === "PUBLIC" || body.visibility === "PRIVATE") {
    data.visibility = body.visibility;
  }
  if (Number.isInteger(Number(body.displayOrder))) {
    data.displayOrder = Number(body.displayOrder);
  }

  if (typeof body.status === "string") {
    const status = body.status.toUpperCase();
    if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
      throw new PlanValidationError("status must be DRAFT, ACTIVE or ARCHIVED");
    }
    if (status === "ARCHIVED" && plan.isFallback) {
      throw new PlanValidationError(
        "The fallback plan cannot be archived. Make another plan the fallback first."
      );
    }
    if (status === "ACTIVE") {
      const current = await prisma.planVersion.findFirst({
        where: { planId, isCurrent: true },
        select: { id: true },
      });
      if (!current) {
        throw new PlanValidationError(
          "Set a current version before activating this plan"
        );
      }
    }
    data.status = status as "DRAFT" | "ACTIVE" | "ARCHIVED";
  }

  const updated = await prisma.plan.update({
    where: { id: planId },
    data,
    select: PLAN_SELECT,
  });

  await logAdminAction({
    adminUserId,
    action: "billing.plan.update",
    targetType: "plan",
    targetId: planId,
    metadata: data as Prisma.InputJsonValue,
  });

  invalidateAllEntitlements();
  return updated;
}

/**
 * Add a new priced version. This is the only way to change price or limits once a
 * plan has subscribers; existing subscriptions stay pinned to their version.
 */
export async function createPlanVersion(
  planId: string,
  body: Record<string, unknown>,
  adminUserId: string
) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, code: true },
  });
  if (!plan) throw new PlanValidationError("Plan not found");

  const entitlements = validateEntitlements(body.entitlements);
  const amountMinor = validateAmountMinor(body.amountMinor);
  const versionLabel = String(body.versionLabel ?? "").trim();
  if (!versionLabel) throw new PlanValidationError("versionLabel is required");

  const makeCurrent = body.makeCurrent !== false;

  const version = await prisma.$transaction(async (tx) => {
    // Clear the existing current version first: the database holds a partial
    // unique index on (planId) where isCurrent, so the order matters.
    if (makeCurrent) {
      await tx.planVersion.updateMany({
        where: { planId, isCurrent: true },
        data: { isCurrent: false, effectiveTo: new Date() },
      });
    }

    return tx.planVersion.create({
      data: {
        planId,
        versionLabel,
        currency: String(body.currency ?? "PKR").trim().toUpperCase(),
        amountMinor,
        billingCycle: body.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
        trialDays: Math.max(0, Number(body.trialDays ?? 0) || 0),
        isCurrent: makeCurrent,
        entitlements: { create: entitlements },
      },
      select: VERSION_SELECT,
    });
  });

  await logAdminAction({
    adminUserId,
    action: "billing.plan_version.create",
    targetType: "plan_version",
    targetId: version.id,
    metadata: { planId, planCode: plan.code, versionLabel, amountMinor },
  });

  invalidateAllEntitlements();
  return { ...version, subscriberCount: version._count.subscriptions, _count: undefined };
}

/**
 * Edit a version in place. Refuses once the version has subscribers, since that
 * would rewrite an agreement someone is already paying under.
 */
export async function updatePlanVersion(
  planId: string,
  versionId: string,
  body: Record<string, unknown>,
  adminUserId: string
) {
  const version = await prisma.planVersion.findFirst({
    where: { id: versionId, planId },
    select: { id: true, _count: { select: { subscriptions: true } } },
  });
  if (!version) throw new PlanValidationError("Plan version not found");

  if (version._count.subscriptions > 0) {
    throw new PlanValidationError(
      `This version has ${version._count.subscriptions} active subscription(s) and cannot be edited. Create a new version instead — existing customers keep the terms they signed up for.`
    );
  }

  const data: Prisma.PlanVersionUpdateInput = {};
  if (body.amountMinor !== undefined) {
    data.amountMinor = validateAmountMinor(body.amountMinor);
  }
  if (typeof body.versionLabel === "string" && body.versionLabel.trim()) {
    data.versionLabel = body.versionLabel.trim();
  }
  if (body.billingCycle === "MONTHLY" || body.billingCycle === "ANNUAL") {
    data.billingCycle = body.billingCycle;
  }
  if (body.trialDays !== undefined) {
    data.trialDays = Math.max(0, Number(body.trialDays) || 0);
  }

  const entitlements =
    body.entitlements === undefined ? null : validateEntitlements(body.entitlements);

  const updated = await prisma.$transaction(async (tx) => {
    if (entitlements) {
      await tx.planEntitlement.deleteMany({ where: { planVersionId: versionId } });
      await tx.planEntitlement.createMany({
        data: entitlements.map((entitlement) => ({
          planVersionId: versionId,
          key: entitlement.key,
          kind: entitlement.kind,
          numberValue: entitlement.numberValue ?? null,
          boolValue: entitlement.boolValue ?? null,
          textValue: entitlement.textValue ?? null,
          onExceed: entitlement.onExceed ?? "WARN",
        })),
      });
    }
    return tx.planVersion.update({
      where: { id: versionId },
      data,
      select: VERSION_SELECT,
    });
  });

  await logAdminAction({
    adminUserId,
    action: "billing.plan_version.update",
    targetType: "plan_version",
    targetId: versionId,
    metadata: { planId },
  });

  invalidateAllEntitlements();
  return { ...updated, subscriberCount: updated._count.subscriptions, _count: undefined };
}

export async function setCurrentPlanVersion(
  planId: string,
  versionId: string,
  adminUserId: string
) {
  const version = await prisma.planVersion.findFirst({
    where: { id: versionId, planId },
    select: { id: true },
  });
  if (!version) throw new PlanValidationError("Plan version not found");

  await prisma.$transaction(async (tx) => {
    await tx.planVersion.updateMany({
      where: { planId, isCurrent: true },
      data: { isCurrent: false, effectiveTo: new Date() },
    });
    await tx.planVersion.update({
      where: { id: versionId },
      data: { isCurrent: true, effectiveTo: null },
    });
  });

  await logAdminAction({
    adminUserId,
    action: "billing.plan_version.set_current",
    targetType: "plan_version",
    targetId: versionId,
    metadata: { planId },
  });

  invalidateAllEntitlements();
}

/** Move the fallback designation. Only an ACTIVE plan can be the fallback. */
export async function setFallbackPlan(planId: string, adminUserId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, status: true, code: true },
  });
  if (!plan) throw new PlanValidationError("Plan not found");
  if (plan.status !== "ACTIVE") {
    throw new PlanValidationError("Only an active plan can be the fallback plan");
  }

  const current = await prisma.planVersion.findFirst({
    where: { planId, isCurrent: true },
    select: { id: true },
  });
  if (!current) {
    throw new PlanValidationError(
      "The fallback plan needs a current version to resolve entitlements from"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.plan.updateMany({
      where: { isFallback: true },
      data: { isFallback: false },
    });
    await tx.plan.update({ where: { id: planId }, data: { isFallback: true } });
  });

  await logAdminAction({
    adminUserId,
    action: "billing.plan.set_fallback",
    targetType: "plan",
    targetId: planId,
    metadata: { code: plan.code },
  });

  invalidateAllEntitlements();
}
