/**
 * Shapes for the customer-facing billing API. Dates are ISO strings.
 */

import type { BillingCycle } from "./admin-types";
import type { EntitlementDefinition } from "./entitlement-keys";
import type { EnforcementMode } from "./enforcement";

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE"
  | "CANCELED"
  | "EXPIRED";

export type InvoiceStatus = "DRAFT" | "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export type OrgBillingUsageMeter = {
  key: string;
  label: string;
  unit?: string;
  used: number;
  limit: number | null;
};

export type OrgBillingPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  isFallback: boolean;
  version: {
    id: string;
    versionLabel: string;
    currency: string;
    amountMinor: number;
    billingCycle: BillingCycle;
    trialDays: number;
  };
};

export type OrgBillingSubscription = {
  id: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  plan: OrgBillingPlan;
  scheduledChange: {
    planName: string;
    planCode: string;
    amountMinor: number;
    currency: string;
    effectiveAt: string;
  } | null;
};

export type OrgBillingInvoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: string;
  totalMinor: number;
  periodStart: string;
  periodEnd: string;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type OrgBillingResponse = {
  subscription: OrgBillingSubscription;
  usage: OrgBillingUsageMeter[];
  availablePlans: OrgBillingPlan[];
  invoices: OrgBillingInvoice[];
  enforcement: EnforcementMode;
  payfastConfigured: boolean;
  entitlementDefinitions: EntitlementDefinition[];
  /** Top leadership / owner can change plan and pay. Everyone else can only view. */
  canManage: boolean;
};

export type CheckoutResponse = {
  provider: "payfast";
  actionUrl: string;
  fields: Record<string, string>;
};
