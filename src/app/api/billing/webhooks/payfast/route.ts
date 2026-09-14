import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { PAYFAST_PROVIDER, parsePayFastNotification, isPayFastSuccess } from "@/lib/billing/payfast";
import { applySuccessfulPayment, markPaymentFailed } from "@/lib/billing/payments";

export const runtime = "nodejs";

async function readPayload(req: NextRequest): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    return typeof json === "object" && json != null ? (json as Record<string, unknown>) : {};
  }

  const text = await req.text();
  if (!text.trim()) return {};
  return Object.fromEntries(new URLSearchParams(text));
}

function dedupeKey(payload: Record<string, unknown>, basketId: string | null): string {
  const txn =
    String(payload.TRANSACTION_ID ?? payload.transaction_id ?? payload.trans_id ?? "").trim();
  if (basketId && txn) return `${basketId}:${txn}`;
  if (basketId) return basketId;
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 48);
}

/**
 * PayFast Instant Transaction Notification.
 * No session: PayFast's servers call this. The payment row is the capability
 * token — unknown basket ids are rejected, not applied.
 */
export async function POST(req: NextRequest) {
  const payload = await readPayload(req);
  const notification = parsePayFastNotification(payload);
  const key = dedupeKey(payload, notification.basketId);
  const sourceIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const event = await prisma.webhookEvent.upsert({
    where: {
      provider_dedupeKey: { provider: PAYFAST_PROVIDER, dedupeKey: key },
    },
    create: {
      provider: PAYFAST_PROVIDER,
      dedupeKey: key,
      signatureValid: Boolean(notification.basketId),
      sourceIp,
      payload: payload as object,
      status: "RECEIVED",
    },
    update: {},
    select: { id: true, status: true },
  });

  if (event.status === "PROCESSED") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    if (!notification.basketId) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: "REJECTED", error: "missing_basket_id", processedAt: new Date() },
      });
      return NextResponse.json({ error: "missing basket_id" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: {
        provider_providerRef: {
          provider: PAYFAST_PROVIDER,
          providerRef: notification.basketId,
        },
      },
      select: { id: true, amountMinor: true, status: true },
    });

    if (!payment) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: "REJECTED", error: "unknown_basket", processedAt: new Date() },
      });
      return NextResponse.json({ error: "unknown basket" }, { status: 404 });
    }

    if (isPayFastSuccess(notification)) {
      await applySuccessfulPayment({
        paymentId: payment.id,
        providerTxnId: notification.transactionId,
        instrumentToken: notification.instrumentToken,
        rawPayload: payload as object,
      });
    } else {
      await markPaymentFailed({
        paymentId: payment.id,
        reason: notification.errCode || notification.status || "failed",
        rawPayload: payload as object,
      });
    }

    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook_failed";
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", error: message.slice(0, 500) },
    });
    console.error("PayFast webhook failed", error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
