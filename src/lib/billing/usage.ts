/**
 * Live usage for entitlement checks and the billing page.
 *
 * Seats live in the master DB. Sites live in the tenant DB. Storage is an
 * incrementing counter on UsageCounter so we never list every S3 object on a
 * request path. Counters start at 0 for existing tenants; that is conservative
 * for enforcement-off and only under-counts until new uploads land.
 */

import { prisma } from "@/lib/prisma";
import { queryTenant } from "@/lib/db/tenant-pool";
import { ENTITLEMENT_KEYS, getEntitlementDefinition, MB_IN_BYTES } from "./entitlement-keys";
import { getEntitlements, getLimit } from "./entitlements";
import { periodEndFor } from "./periods";
import type { OrgBillingUsageMeter } from "./org-types";

export async function countSeats(organizationId: string): Promise<number> {
  const [members, pendingInvites] = await Promise.all([
    prisma.userOrganization.count({ where: { organizationId } }),
    prisma.invitation.count({
      where: { organizationId, status: "pending" },
    }),
  ]);
  return members + pendingInvites;
}

export async function countSites(organizationId: string): Promise<number> {
  try {
    const rows = await queryTenant<{ count: string }>(
      organizationId,
      `SELECT COUNT(*)::text AS count FROM sites`
    );
    return Number(rows[0]?.count ?? 0);
  } catch (error) {
    console.warn("[billing] site count failed", { organizationId, error });
    return 0;
  }
}

async function usagePeriodFor(organizationId: string): Promise<{
  start: Date;
  end: Date;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    select: {
      currentPeriodStart: true,
      currentPeriodEnd: true,
      billingCycle: true,
    },
  });
  if (subscription) {
    return {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    };
  }
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start, end: periodEndFor("MONTHLY", start) };
}

export async function getStorageBytes(organizationId: string): Promise<bigint> {
  const { start } = await usagePeriodFor(organizationId);
  const row = await prisma.usageCounter.findUnique({
    where: {
      organizationId_periodStart: {
        organizationId,
        periodStart: start,
      },
    },
    select: { storageBytes: true },
  });
  return row?.storageBytes ?? BigInt(0);
}

export async function addStorageBytes(
  organizationId: string,
  additionalBytes: number
): Promise<void> {
  if (additionalBytes <= 0) return;
  const { start, end } = await usagePeriodFor(organizationId);
  await prisma.usageCounter.upsert({
    where: {
      organizationId_periodStart: { organizationId, periodStart: start },
    },
    create: {
      organizationId,
      periodStart: start,
      periodEnd: end,
      storageBytes: BigInt(additionalBytes),
    },
    update: {
      storageBytes: { increment: BigInt(additionalBytes) },
      periodEnd: end,
    },
  });
}

export async function getUsageMeters(
  organizationId: string
): Promise<OrgBillingUsageMeter[]> {
  const [set, seats, sites, storageBytes] = await Promise.all([
    getEntitlements(organizationId),
    countSeats(organizationId),
    countSites(organizationId),
    getStorageBytes(organizationId),
  ]);

  const storageMb = Number(storageBytes / BigInt(MB_IN_BYTES));

  const meters: { key: string; used: number }[] = [
    { key: ENTITLEMENT_KEYS.USERS_MAX, used: seats },
    { key: ENTITLEMENT_KEYS.SITES_MAX, used: sites },
    { key: ENTITLEMENT_KEYS.STORAGE_MB, used: storageMb },
  ];

  return meters.map(({ key, used }) => {
    const definition = getEntitlementDefinition(key);
    return {
      key,
      label: definition?.label ?? key,
      unit: definition?.unit,
      used,
      limit: getLimit(set, key),
    };
  });
}
