/**
 * Billing error types.
 *
 * Kept free of `next/server` and Prisma imports so both API routes and client
 * components can share the payload shape. The client needs it to turn a 402 into
 * a real upgrade prompt instead of a generic toast.
 */

import type { EntitlementKey } from "./entitlement-keys";

export const BILLING_ERROR_CODES = {
  /** A numeric limit is exhausted (seats, storage, sites). */
  LIMIT_REACHED: "billing/limit_reached",
  /** The feature is not part of the current plan at all. */
  FEATURE_UNAVAILABLE: "billing/feature_unavailable",
  /** Subscription is canceled or expired, so paid features are off. */
  SUBSCRIPTION_INACTIVE: "billing/subscription_inactive",
  /** Not enough credits for a metered action. */
  INSUFFICIENT_CREDITS: "billing/insufficient_credits",
} as const;

export type BillingErrorCode =
  (typeof BILLING_ERROR_CODES)[keyof typeof BILLING_ERROR_CODES];

export type BillingErrorBody = {
  /** Human-readable message. `api-client` surfaces this field directly. */
  error: string;
  code: BillingErrorCode;
  entitlement?: {
    key: string;
    label: string;
    /** null means unlimited. */
    limit: number | null;
    usage: number | null;
    unit?: string;
  };
  /** Where the UI should send the user to resolve this. */
  upgradePath: string;
};

/**
 * Thrown by entitlement guards. API routes translate this into HTTP 402 so the
 * frontend can distinguish "you need to upgrade" from "something broke".
 */
export class BillingLimitError extends Error {
  readonly code: BillingErrorCode;
  readonly entitlementKey?: EntitlementKey;
  readonly limit: number | null;
  readonly usage: number | null;
  readonly unit?: string;
  readonly label: string;

  constructor(params: {
    message: string;
    code: BillingErrorCode;
    entitlementKey?: EntitlementKey;
    label?: string;
    limit?: number | null;
    usage?: number | null;
    unit?: string;
  }) {
    super(params.message);
    this.name = "BillingLimitError";
    this.code = params.code;
    this.entitlementKey = params.entitlementKey;
    this.label = params.label ?? params.entitlementKey ?? "Plan limit";
    this.limit = params.limit ?? null;
    this.usage = params.usage ?? null;
    this.unit = params.unit;
  }

  toBody(upgradePath: string): BillingErrorBody {
    return {
      error: this.message,
      code: this.code,
      upgradePath,
      ...(this.entitlementKey
        ? {
            entitlement: {
              key: this.entitlementKey,
              label: this.label,
              limit: this.limit,
              usage: this.usage,
              unit: this.unit,
            },
          }
        : {}),
    };
  }
}

export function isBillingLimitError(error: unknown): error is BillingLimitError {
  return error instanceof BillingLimitError;
}

export function billingUpgradePath(orgIdOrSlug: string): string {
  return `/dashboard/${orgIdOrSlug}/settings/billing-subscription`;
}
