/**
 * Entitlement resolution.
 *
 * Resolution order, highest precedence first:
 *   1. EntitlementOverride for the organization (unexpired) - sales exceptions
 *   2. PlanEntitlement on the subscription's pinned PlanVersion - grandfathering
 *   3. Fallback plan's current version - for canceled/expired/absent subscriptions
 *   4. Unconfigured: everything unlimited
 *
 * Step 4 matters. Until plans are seeded and a subscription exists for every
 * tenant, the honest answer to "what is this org entitled to?" is "we don't know
 * yet", and the only safe response for a live product is to allow the action.
 *
 * Results are cached in-process because this is read on request paths and the
 * master database is on high-latency RDS. The cache is per-instance and short
 * lived; correctness comes from explicit invalidation on every write that can
 * change an answer.
 */

import type { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ENTITLEMENT_KEYS,
  getEntitlementDefinition,
  type EntitlementKind,
  type LimitAction,
} from "./entitlement-keys";
import { getEnforcementMode, type EnforcementMode } from "./enforcement";

export type EntitlementValue = {
  key: string;
  kind: EntitlementKind;
  /** Numeric ceiling. `null` means unlimited. */
  limit: number | null;
  boolValue: boolean | null;
  textValue: string | null;
  onExceed: LimitAction;
  source: "plan" | "override";
};

export type EntitlementSet = {
  organizationId: string;
  planId: string | null;
  planCode: string | null;
  planName: string | null;
  planVersionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  enforcement: EnforcementMode;
  /**
   * True when no plan config applies to this org. Every lookup then reports
   * unlimited and guards allow the action.
   */
  unconfigured: boolean;
  values: Record<string, EntitlementValue>;
};

/**
 * Statuses that keep paid entitlements. PAST_DUE and GRACE deliberately retain
 * access: dunning and eventual downgrade handle non-payment, and cutting a
 * customer off the day a card fails is both hostile and bad for recovery.
 */
const ENTITLED_STATUSES: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "GRACE",
]);

const CACHE_TTL_MS = 60_000;

type CacheEntry = { expiresAt: number; value: EntitlementSet };

declare global {
  var __entitlementCache: Map<string, CacheEntry> | undefined;
}

const cache: Map<string, CacheEntry> =
  global.__entitlementCache ?? new Map<string, CacheEntry>();

if (process.env.NODE_ENV !== "production") {
  global.__entitlementCache = cache;
}

/** Call after any write that changes what an org is entitled to. */
export function invalidateEntitlements(organizationId: string): void {
  cache.delete(organizationId);
}

/** Call after editing plans or plan versions, which can affect many orgs. */
export function invalidateAllEntitlements(): void {
  cache.clear();
}

function unconfiguredSet(
  organizationId: string,
  enforcement: EnforcementMode
): EntitlementSet {
  return {
    organizationId,
    planId: null,
    planCode: null,
    planName: null,
    planVersionId: null,
    subscriptionStatus: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    enforcement,
    unconfigured: true,
    values: {},
  };
}

type RawEntitlement = {
  key: string;
  kind: EntitlementKind;
  numberValue: number | null;
  boolValue: boolean | null;
  textValue: string | null;
  onExceed: LimitAction;
};

function toValue(
  raw: RawEntitlement,
  source: "plan" | "override"
): EntitlementValue {
  // A NUMBER entitlement with no number is a misconfiguration. Treating it as
  // unlimited keeps the customer working; a bad row should not deny service.
  const limit =
    raw.kind === "UNLIMITED" || raw.numberValue === null ? null : raw.numberValue;

  return {
    key: raw.key,
    kind: raw.kind,
    limit,
    boolValue: raw.boolValue,
    textValue: raw.textValue,
    onExceed: raw.onExceed,
    source,
  };
}

async function loadEntitlements(
  organizationId: string
): Promise<EntitlementSet> {
  const enforcement = getEnforcementMode();

  const [subscription, overrides] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId },
      select: {
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        planId: true,
        planVersionId: true,
        plan: { select: { code: true, name: true } },
        planVersion: {
          select: {
            entitlements: {
              select: {
                key: true,
                kind: true,
                numberValue: true,
                boolValue: true,
                textValue: true,
                onExceed: true,
              },
            },
          },
        },
      },
    }),
    prisma.entitlementOverride.findMany({
      where: {
        organizationId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        key: true,
        kind: true,
        numberValue: true,
        boolValue: true,
        textValue: true,
      },
    }),
  ]);

  const entitled =
    subscription != null && ENTITLED_STATUSES.has(subscription.status);

  // Canceled, expired, or missing subscriptions resolve against the fallback
  // plan so an org degrades to the free tier instead of losing its data.
  const source = entitled
    ? {
        planId: subscription.planId,
        planCode: subscription.plan.code,
        planName: subscription.plan.name,
        planVersionId: subscription.planVersionId,
        entitlements: subscription.planVersion.entitlements,
      }
    : await loadFallbackPlan();

  if (!source && overrides.length === 0) {
    return unconfiguredSet(organizationId, enforcement);
  }

  const values: Record<string, EntitlementValue> = {};

  for (const raw of source?.entitlements ?? []) {
    values[raw.key] = toValue(raw, "plan");
  }

  for (const override of overrides) {
    const definition = getEntitlementDefinition(override.key);
    values[override.key] = toValue(
      {
        ...override,
        // Overrides carry no onExceed of their own: an exception changes the
        // ceiling, not whether hitting it is fatal.
        onExceed:
          values[override.key]?.onExceed ??
          definition?.defaultOnExceed ??
          "WARN",
      },
      "override"
    );
  }

  return {
    organizationId,
    planId: source?.planId ?? null,
    planCode: source?.planCode ?? null,
    planName: source?.planName ?? null,
    planVersionId: source?.planVersionId ?? null,
    subscriptionStatus: subscription?.status ?? null,
    currentPeriodStart: subscription?.currentPeriodStart ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    enforcement,
    unconfigured: source == null,
    values,
  };
}

type PlanSource = {
  planId: string;
  planCode: string;
  planName: string;
  planVersionId: string;
  entitlements: RawEntitlement[];
};

async function loadFallbackPlan(): Promise<PlanSource | null> {
  const plan = await prisma.plan.findFirst({
    where: { isFallback: true, status: "ACTIVE" },
    select: {
      id: true,
      code: true,
      name: true,
      versions: {
        where: { isCurrent: true },
        select: {
          id: true,
          entitlements: {
            select: {
              key: true,
              kind: true,
              numberValue: true,
              boolValue: true,
              textValue: true,
              onExceed: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  const version = plan?.versions[0];
  if (!plan || !version) return null;

  return {
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    planVersionId: version.id,
    entitlements: version.entitlements,
  };
}

export async function getEntitlements(
  organizationId: string
): Promise<EntitlementSet> {
  const cached = cache.get(organizationId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await loadEntitlements(organizationId);
  cache.set(organizationId, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

// ---------- readers ----------

/** Numeric ceiling for a key. `null` means unlimited or unconfigured. */
export function getLimit(set: EntitlementSet, key: string): number | null {
  if (set.unconfigured) return null;
  const value = set.values[key];
  if (!value) return null;
  return value.limit;
}

/**
 * Whether a boolean feature is on. Unknown keys resolve to `true` so a plan that
 * has not been told about a new feature does not silently lose it; deny lists are
 * explicit.
 */
export function isFeatureEnabled(set: EntitlementSet, key: string): boolean {
  if (set.unconfigured) return true;
  const value = set.values[key];
  if (!value) return true;
  if (value.kind === "BOOLEAN") return value.boolValue === true;
  if (value.kind === "UNLIMITED") return true;
  return true;
}

export function getText(set: EntitlementSet, key: string): string | null {
  return set.values[key]?.textValue ?? null;
}

export function getOnExceed(set: EntitlementSet, key: string): LimitAction {
  return (
    set.values[key]?.onExceed ??
    getEntitlementDefinition(key)?.defaultOnExceed ??
    "WARN"
  );
}

/** Monthly credit allowance. 0 when unconfigured, since credits are opt-in. */
export function getMonthlyCredits(set: EntitlementSet): number {
  return set.values[ENTITLEMENT_KEYS.MONTHLY_CREDITS]?.limit ?? 0;
}
