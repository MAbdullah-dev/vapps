import type { EntitlementKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getEntitlementDefinition,
  isKnownEntitlementKey,
} from "./entitlement-keys";
import { invalidateEntitlements } from "./entitlements";

export class OverrideValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverrideValidationError";
  }
}

export async function listOverrides(organizationId: string) {
  return prisma.entitlementOverride.findMany({
    where: { organizationId },
    orderBy: { key: "asc" },
  });
}

export async function upsertOverride(params: {
  organizationId: string;
  key: string;
  kind?: EntitlementKind;
  numberValue?: number | null;
  boolValue?: boolean | null;
  textValue?: string | null;
  reason: string;
  expiresAt?: string | null;
  createdBy: string;
}) {
  const key = params.key.trim();
  if (!isKnownEntitlementKey(key)) {
    throw new OverrideValidationError(`Unknown entitlement key: ${key}`);
  }
  const reason = params.reason.trim();
  if (!reason) {
    throw new OverrideValidationError("reason is required");
  }

  const definition = getEntitlementDefinition(key)!;
  const kind = (params.kind ?? definition.kind) as EntitlementKind;
  if (kind !== "UNLIMITED" && kind !== definition.kind) {
    throw new OverrideValidationError(
      `Override ${key} must be ${definition.kind} or UNLIMITED`
    );
  }

  let numberValue: number | null = null;
  let boolValue: boolean | null = null;
  let textValue: string | null = null;

  if (kind === "NUMBER") {
    const value = Number(params.numberValue);
    if (!Number.isInteger(value) || value < 0) {
      throw new OverrideValidationError("numberValue must be a non-negative whole number");
    }
    numberValue = value;
  } else if (kind === "BOOLEAN") {
    boolValue = params.boolValue === true;
  } else if (kind === "TEXT") {
    textValue = String(params.textValue ?? "").trim();
  }

  let expiresAt: Date | null = null;
  if (params.expiresAt) {
    const parsed = new Date(params.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new OverrideValidationError("expiresAt is not a valid date");
    }
    expiresAt = parsed;
  }

  const data = {
    key,
    kind,
    numberValue,
    boolValue,
    textValue,
    reason,
    expiresAt,
    createdBy: params.createdBy,
  };

  const row = await prisma.entitlementOverride.upsert({
    where: {
      organizationId_key: { organizationId: params.organizationId, key },
    },
    create: { organizationId: params.organizationId, ...data },
    update: data,
  });

  await prisma.adminActionLog.create({
    data: {
      adminUserId: params.createdBy,
      action: "billing.override.upsert",
      targetType: "organization",
      targetId: params.organizationId,
      organizationId: params.organizationId,
      reason,
      metadata: { key, kind } as Prisma.InputJsonValue,
    },
  });

  invalidateEntitlements(params.organizationId);
  return row;
}

export async function deleteOverride(params: {
  organizationId: string;
  key: string;
  adminUserId: string;
}) {
  const key = params.key.trim();
  await prisma.entitlementOverride.delete({
    where: {
      organizationId_key: { organizationId: params.organizationId, key },
    },
  });

  await prisma.adminActionLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: "billing.override.delete",
      targetType: "organization",
      targetId: params.organizationId,
      organizationId: params.organizationId,
      metadata: { key } as Prisma.InputJsonValue,
    },
  });

  invalidateEntitlements(params.organizationId);
}
