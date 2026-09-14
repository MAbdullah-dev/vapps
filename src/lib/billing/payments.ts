/**
 * Apply a PayFast (or other provider) payment to a subscription.
 *
 * Idempotent on payment id: a replayed ITN that finds an already-SUCCEEDED
 * payment is a no-op. The webhook route persists the raw event before calling
 * this, so a crash mid-apply can be retried safely.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptTenantSecret } from "@/lib/tenant-secrets";
import { applyPlanVersionNow } from "./subscription-service";
import { invalidateEntitlements } from "./entitlements";
import { notifyPaymentReceived } from "./notifications";

export class PaymentApplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentApplyError";
  }
}

type CheckoutIntent = {
  kind: "subscribe" | "renew";
  organizationId: string;
  planVersionId: string;
  subscriptionId: string;
};

function readIntent(raw: Prisma.JsonValue | null): CheckoutIntent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (record.kind !== "subscribe" && record.kind !== "renew") return null;
  if (
    typeof record.organizationId !== "string" ||
    typeof record.planVersionId !== "string" ||
    typeof record.subscriptionId !== "string"
  ) {
    return null;
  }
  return {
    kind: record.kind,
    organizationId: record.organizationId,
    planVersionId: record.planVersionId,
    subscriptionId: record.subscriptionId,
  };
}

export async function applySuccessfulPayment(params: {
  paymentId: string;
  providerTxnId?: string | null;
  instrumentToken?: string | null;
  rawPayload?: Prisma.InputJsonValue;
}): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      invoiceId: true,
      rawPayload: true,
    },
  });
  if (!payment) {
    throw new PaymentApplyError("Payment not found");
  }
  if (payment.status === "SUCCEEDED") return;
  if (payment.status === "REFUNDED") {
    throw new PaymentApplyError("Cannot apply a refunded payment");
  }

  const intent = readIntent(payment.rawPayload);
  if (!intent) {
    throw new PaymentApplyError("Payment is missing a subscribe intent");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        providerTxnId: params.providerTxnId ?? undefined,
        rawPayload: params.rawPayload,
      },
    });
    if (payment.invoiceId) {
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: "PAID", paidAt: new Date() },
      });
    }
  });

  await applyPlanVersionNow({
    organizationId: intent.organizationId,
    planVersionId: intent.planVersionId,
    reason: intent.kind === "renew" ? "renewal_paid" : "payment_succeeded",
  });

  if (params.instrumentToken) {
    try {
      const stored = encryptTenantSecret(params.instrumentToken);
      await prisma.subscription.update({
        where: { organizationId: intent.organizationId },
        data: { providerToken: stored, providerCustomerRef: intent.subscriptionId },
      });
    } catch (error) {
      console.warn("[billing] could not store PayFast instrument token", error);
    }
  }

  invalidateEntitlements(intent.organizationId);

  await notifyPaymentReceived({
    organizationId: intent.organizationId,
    invoiceId: payment.invoiceId,
  });
}

export async function markPaymentFailed(params: {
  paymentId: string;
  reason: string;
  rawPayload?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: "FAILED",
      failureReason: params.reason.slice(0, 500),
      rawPayload: params.rawPayload,
    },
  });
}
