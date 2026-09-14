/**
 * Shapes exchanged between the admin plan API and the admin UI.
 * Dates arrive as ISO strings because they cross a JSON boundary.
 */

import type {
  EntitlementDefinition,
  EntitlementKind,
  LimitAction,
} from "./entitlement-keys";
import type { EnforcementMode } from "./enforcement";

export type PlanStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type PlanVisibility = "PUBLIC" | "PRIVATE";
export type BillingCycle = "MONTHLY" | "ANNUAL" | "ONE_TIME";

export type AdminPlanEntitlement = {
  id: string;
  key: string;
  kind: EntitlementKind;
  numberValue: number | null;
  boolValue: boolean | null;
  textValue: string | null;
  onExceed: LimitAction;
};

export type AdminPlanVersion = {
  id: string;
  versionLabel: string;
  currency: string;
  amountMinor: number;
  billingCycle: BillingCycle;
  trialDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  createdAt: string;
  entitlements: AdminPlanEntitlement[];
  /** Subscriptions pinned to this version. Non-zero means it is immutable. */
  subscriberCount: number;
};

export type AdminPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: PlanStatus;
  visibility: PlanVisibility;
  displayOrder: number;
  isFallback: boolean;
  createdAt: string;
  updatedAt: string;
  versions: AdminPlanVersion[];
  subscriberCount: number;
};

export type AdminPlansResponse = {
  plans: AdminPlan[];
  entitlementDefinitions: EntitlementDefinition[];
  enforcement: EnforcementMode;
};

export type EntitlementPayload = {
  key: string;
  kind: EntitlementKind;
  numberValue?: number | null;
  boolValue?: boolean | null;
  textValue?: string | null;
  onExceed?: LimitAction;
};

export type CreatePlanPayload = {
  code: string;
  name: string;
  description?: string;
  visibility?: PlanVisibility;
  displayOrder?: number;
  versionLabel?: string;
  currency?: string;
  amountMinor: number;
  billingCycle?: BillingCycle;
  trialDays?: number;
  entitlements: EntitlementPayload[];
};

export type UpdatePlanPayload = {
  name?: string;
  description?: string;
  status?: PlanStatus;
  visibility?: PlanVisibility;
  displayOrder?: number;
  isFallback?: boolean;
};

export type CreatePlanVersionPayload = {
  versionLabel: string;
  currency?: string;
  amountMinor: number;
  billingCycle?: BillingCycle;
  trialDays?: number;
  makeCurrent?: boolean;
  entitlements: EntitlementPayload[];
};

export type UpdatePlanVersionPayload = {
  versionLabel?: string;
  amountMinor?: number;
  billingCycle?: BillingCycle;
  trialDays?: number;
  makeCurrent?: boolean;
  entitlements?: EntitlementPayload[];
};

/** Minor units to a display string, e.g. 2500000 -> "PKR 25,000.00". */
export function formatMinorAmount(
  amountMinor: number,
  currency = "PKR"
): string {
  const major = amountMinor / 100;
  return `${currency} ${major.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
