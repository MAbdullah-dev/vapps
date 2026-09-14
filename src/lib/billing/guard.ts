/**
 * Entitlement guards for API routes.
 *
 * Guards are the only place that decides whether a limit blocks. Callers pass in
 * the usage they already measured, because only the caller knows which tenant DB
 * to count in — this module never reaches into tenant databases.
 *
 * Under `warn` enforcement a guard logs what it would have blocked and returns
 * normally. That log is the dataset you need before switching a limit to `on`.
 */

import { NextResponse } from "next/server";
import {
  getEntitlements,
  getLimit,
  getOnExceed,
  isFeatureEnabled,
  type EntitlementSet,
} from "./entitlements";
import {
  getEntitlementDefinition,
  megabytesToBytes,
  MB_IN_BYTES,
  type EntitlementKey,
} from "./entitlement-keys";
import { shouldBlock, shouldReport } from "./enforcement";
import {
  BILLING_ERROR_CODES,
  BillingLimitError,
  billingUpgradePath,
  isBillingLimitError,
} from "./errors";

export type LimitCheck = {
  allowed: boolean;
  /** True when the limit was exceeded but enforcement let it through. */
  warned: boolean;
  limit: number | null;
  usage: number;
};

function report(
  organizationId: string,
  key: string,
  usage: number,
  limit: number,
  blocked: boolean
) {
  console.warn(
    `[billing] ${blocked ? "blocked" : "over limit"} org=${organizationId} key=${key} usage=${usage} limit=${limit}`
  );
}

/**
 * Check a numeric limit without throwing. Use this to render usage meters and
 * "you are close to your limit" states.
 */
export async function checkLimit(params: {
  organizationId: string;
  key: EntitlementKey;
  currentUsage: number;
  increment?: number;
}): Promise<LimitCheck> {
  const { organizationId, key, currentUsage, increment = 1 } = params;
  const set = await getEntitlements(organizationId);
  const limit = getLimit(set, key);

  if (limit === null) {
    return { allowed: true, warned: false, limit: null, usage: currentUsage };
  }

  const withinLimit = currentUsage + increment <= limit;
  if (withinLimit) {
    return { allowed: true, warned: false, limit, usage: currentUsage };
  }

  const blocking = shouldBlock(set.enforcement) && getOnExceed(set, key) === "BLOCK";
  if (shouldReport(set.enforcement)) {
    report(organizationId, key, currentUsage, limit, blocking);
  }

  return { allowed: !blocking, warned: !blocking, limit, usage: currentUsage };
}

/**
 * Throw if a numeric limit would be exceeded. Only throws when enforcement is
 * `on` and the entitlement's `onExceed` is BLOCK.
 */
export async function assertWithinLimit(params: {
  organizationId: string;
  key: EntitlementKey;
  currentUsage: number;
  increment?: number;
}): Promise<LimitCheck> {
  const result = await checkLimit(params);
  if (result.allowed) return result;

  const definition = getEntitlementDefinition(params.key);
  throw new BillingLimitError({
    message: `Your plan allows ${result.limit} ${definition?.unit ?? "items"}. Upgrade to add more.`,
    code: BILLING_ERROR_CODES.LIMIT_REACHED,
    entitlementKey: params.key,
    label: definition?.label,
    limit: result.limit,
    usage: result.usage,
    unit: definition?.unit,
  });
}

/** Throw if a boolean feature is not part of the plan. */
export async function assertFeatureEnabled(params: {
  organizationId: string;
  key: EntitlementKey;
}): Promise<void> {
  const set = await getEntitlements(params.organizationId);
  if (isFeatureEnabled(set, params.key)) return;

  const definition = getEntitlementDefinition(params.key);
  if (!shouldBlock(set.enforcement)) {
    if (shouldReport(set.enforcement)) {
      console.warn(
        `[billing] feature unavailable (not enforced) org=${params.organizationId} key=${params.key}`
      );
    }
    return;
  }

  throw new BillingLimitError({
    message: `${definition?.label ?? "This feature"} is not included in your plan.`,
    code: BILLING_ERROR_CODES.FEATURE_UNAVAILABLE,
    entitlementKey: params.key,
    label: definition?.label,
  });
}

/**
 * Storage is checked in bytes but budgeted in megabytes, because a byte-valued
 * limit does not fit in the INTEGER column plan limits use.
 */
export async function assertStorageAvailable(params: {
  organizationId: string;
  currentBytes: bigint;
  additionalBytes: number;
}): Promise<void> {
  const set = await getEntitlements(params.organizationId);
  const limitMb = getLimit(set, "storage.mb");
  if (limitMb === null) return;

  const limitBytes = megabytesToBytes(limitMb);
  const projected = params.currentBytes + BigInt(params.additionalBytes);
  if (projected <= limitBytes) return;

  const usedMb = Number(params.currentBytes / BigInt(MB_IN_BYTES));
  const blocking = shouldBlock(set.enforcement) && getOnExceed(set, "storage.mb") === "BLOCK";

  if (shouldReport(set.enforcement)) {
    report(params.organizationId, "storage.mb", usedMb, limitMb, blocking);
  }
  if (!blocking) return;

  throw new BillingLimitError({
    message: `Your plan includes ${limitMb} MB of storage and it is full. Upgrade to upload more.`,
    code: BILLING_ERROR_CODES.LIMIT_REACHED,
    entitlementKey: "storage.mb",
    label: "Storage",
    limit: limitMb,
    usage: usedMb,
    unit: "MB",
  });
}

/**
 * Turn a guard failure into HTTP 402 so the client can show an upgrade prompt
 * instead of a generic error. Returns null for anything that is not a billing
 * error, so routes can rethrow.
 */
export function billingErrorResponse(
  error: unknown,
  orgIdOrSlug: string
): NextResponse | null {
  if (!isBillingLimitError(error)) return null;
  return NextResponse.json(error.toBody(billingUpgradePath(orgIdOrSlug)), {
    status: 402,
  });
}

export type { EntitlementSet };
