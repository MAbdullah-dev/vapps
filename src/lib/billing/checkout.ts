/**
 * PayFast hosted checkout for plan upgrades and past-due renewals.
 *
 * A new OPEN invoice is created each time. Previous OPEN invoices for the org
 * are voided so the customer is not looking at a stack of abandoned checkouts.
 */

import { randomUUID } from "crypto";
import type { BillingCycle } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextInvoiceNumber } from "./invoices";
import {
  buildCheckoutFields,
  fetchPayFastAccessToken,
  isPayFastConfigured,
  PAYFAST_PROVIDER,
} from "./payfast";
import { ensureDefaultSubscription, loadCurrentVersion } from "./subscription-service";
import { periodEndFor } from "./periods";
import type { CheckoutResponse } from "./org-types";

const PAYABLE_STATUSES = new Set(["PAST_DUE", "GRACE"]);

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

type CheckoutKind = "subscribe" | "renew";

type CheckoutVersion = {
  id: string;
  amountMinor: number;
  currency: string;
  billingCycle: BillingCycle;
  versionLabel: string;
  planName: string;
};

async function voidOpenCheckouts(organizationId: string) {
  await prisma.invoice.updateMany({
    where: { organizationId, status: "OPEN" },
    data: { status: "VOID" },
  });
  await prisma.payment.updateMany({
    where: { organizationId, status: "PENDING" },
    data: { status: "FAILED", failureReason: "superseded" },
  });
}

async function startPayFastCheckout(params: {
  organizationId: string;
  actorUserId: string;
  customerEmail?: string | null;
  successUrl: string;
  failureUrl: string;
  notifyUrl: string;
  subscriptionId: string;
  version: CheckoutVersion;
  kind: CheckoutKind;
}): Promise<CheckoutResponse> {
  if (!isPayFastConfigured()) {
    throw new CheckoutError(
      "PayFast is not configured. Set PAYFAST_MERCHANT_ID and PAYFAST_SECURED_KEY, or ask an administrator to assign this plan."
    );
  }
  if (params.version.amountMinor <= 0) {
    throw new CheckoutError("This plan does not require payment.");
  }

  await voidOpenCheckouts(params.organizationId);

  const now = new Date();
  const periodEnd = periodEndFor(params.version.billingCycle, now);
  const basketId = `pf_${randomUUID().replace(/-/g, "").slice(0, 24)}`;

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: params.organizationId,
      subscriptionId: params.subscriptionId,
      number: await nextInvoiceNumber(),
      status: "OPEN",
      currency: params.version.currency,
      subtotalMinor: params.version.amountMinor,
      taxMinor: 0,
      totalMinor: params.version.amountMinor,
      periodStart: now,
      periodEnd,
      dueAt: now,
    },
    select: { id: true },
  });

  const payment = await prisma.payment.create({
    data: {
      organizationId: params.organizationId,
      invoiceId: invoice.id,
      provider: PAYFAST_PROVIDER,
      providerRef: basketId,
      amountMinor: params.version.amountMinor,
      currency: params.version.currency,
      status: "PENDING",
      rawPayload: {
        kind: params.kind,
        organizationId: params.organizationId,
        planVersionId: params.version.id,
        subscriptionId: params.subscriptionId,
        actorUserId: params.actorUserId,
      },
    },
    select: { id: true },
  });

  try {
    const token = await fetchPayFastAccessToken({
      basketId,
      amountMinor: params.version.amountMinor,
    });
    const checkout = buildCheckoutFields({
      token,
      basketId,
      amountMinor: params.version.amountMinor,
      description: `${params.version.planName} (${params.version.versionLabel})`,
      customerEmail: params.customerEmail,
      successUrl: params.successUrl,
      failureUrl: params.failureUrl,
      notifyUrl: params.notifyUrl,
    });
    return { provider: "payfast", ...checkout };
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message.slice(0, 500) : "token_failed",
      },
    });
    throw new CheckoutError(
      error instanceof Error ? error.message : "Failed to start PayFast checkout"
    );
  }
}

export async function createPlanCheckout(params: {
  organizationId: string;
  planId: string;
  actorUserId: string;
  customerEmail?: string | null;
  successUrl: string;
  failureUrl: string;
  notifyUrl: string;
}): Promise<CheckoutResponse> {
  await ensureDefaultSubscription(params.organizationId, params.actorUserId);
  const version = await loadCurrentVersion(params.planId);
  if (version.plan.visibility === "PRIVATE") {
    throw new CheckoutError("This plan is assigned by an administrator.");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: params.organizationId },
    select: { id: true },
  });
  if (!subscription) {
    throw new CheckoutError("Subscription not found");
  }

  return startPayFastCheckout({
    ...params,
    subscriptionId: subscription.id,
    kind: "subscribe",
    version: {
      id: version.id,
      amountMinor: version.amountMinor,
      currency: version.currency,
      billingCycle: version.billingCycle,
      versionLabel: version.versionLabel,
      planName: version.plan.name,
    },
  });
}

/**
 * Charge the pinned plan version (grandfathered price) so a past-due org can
 * stay on what they already bought. Catalog price changes do not apply here.
 */
export async function createRenewalCheckout(params: {
  organizationId: string;
  actorUserId: string;
  customerEmail?: string | null;
  successUrl: string;
  failureUrl: string;
  notifyUrl: string;
}): Promise<CheckoutResponse> {
  await ensureDefaultSubscription(params.organizationId, params.actorUserId);

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: params.organizationId },
    select: {
      id: true,
      status: true,
      planVersion: {
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          billingCycle: true,
          versionLabel: true,
          plan: { select: { name: true } },
        },
      },
    },
  });
  if (!subscription) {
    throw new CheckoutError("Subscription not found");
  }
  if (!PAYABLE_STATUSES.has(subscription.status)) {
    throw new CheckoutError("This subscription does not have a payment due.");
  }

  return startPayFastCheckout({
    ...params,
    subscriptionId: subscription.id,
    kind: "renew",
    version: {
      id: subscription.planVersion.id,
      amountMinor: subscription.planVersion.amountMinor,
      currency: subscription.planVersion.currency,
      billingCycle: subscription.planVersion.billingCycle,
      versionLabel: subscription.planVersion.versionLabel,
      planName: subscription.planVersion.plan.name,
    },
  });
}
