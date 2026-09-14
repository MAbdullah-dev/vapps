/**
 * PayFast Pakistan hosted checkout.
 *
 * Token is fetched server-side with MERCHANT_ID + SECURED_KEY. The browser
 * only receives a one-time TOKEN and a form to POST to PayFast — the secured
 * key never leaves the server. CHECKOUT_URL is the Instant Transaction
 * Notification endpoint PayFast calls; SUCCESS/FAILURE_URL are the human
 * return pages.
 *
 * Recurring instrument tokens are stored on Subscription.providerToken when
 * PayFast sends one. Charging them in production still needs written
 * confirmation from PayFast that this merchant account supports it.
 */

import { createHash } from "crypto";

export const PAYFAST_PROVIDER = "payfast";

export type PayFastConfig = {
  merchantId: string;
  merchantName: string;
  securedKey: string;
  tokenUrl: string;
  checkoutUrl: string;
  currency: string;
};

export function getPayFastConfig(): PayFastConfig | null {
  const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const securedKey = process.env.PAYFAST_SECURED_KEY?.trim();
  if (!merchantId || !securedKey) return null;

  const sandbox =
    (process.env.PAYFAST_MODE ?? "sandbox").trim().toLowerCase() !== "live";

  return {
    merchantId,
    merchantName: process.env.PAYFAST_MERCHANT_NAME?.trim() || "ViETech",
    securedKey,
    tokenUrl:
      process.env.PAYFAST_TOKEN_URL?.trim() ||
      (sandbox
        ? "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken"
        : "https://ipg.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken"),
    checkoutUrl:
      process.env.PAYFAST_CHECKOUT_URL?.trim() ||
      (sandbox
        ? "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction"
        : "https://ipg.apps.net.pk/Ecommerce/api/Transaction/PostTransaction"),
    currency: process.env.PAYFAST_CURRENCY?.trim() || "PKR",
  };
}

export function isPayFastConfigured(): boolean {
  return getPayFastConfig() != null;
}

export function formatPayFastAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function parseTokenResponse(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const direct =
    record.ACCESS_TOKEN ??
    record.access_token ??
    record.token ??
    (typeof record.data === "object" && record.data
      ? (record.data as Record<string, unknown>).ACCESS_TOKEN ??
        (record.data as Record<string, unknown>).token
      : null);
  return typeof direct === "string" && direct.trim() ? direct.trim() : null;
}

export async function fetchPayFastAccessToken(params: {
  basketId: string;
  amountMinor: number;
}): Promise<string> {
  const config = getPayFastConfig();
  if (!config) {
    throw new Error("PayFast is not configured (PAYFAST_MERCHANT_ID / PAYFAST_SECURED_KEY).");
  }

  const body = new URLSearchParams({
    MERCHANT_ID: config.merchantId,
    SECURED_KEY: config.securedKey,
    BASKET_ID: params.basketId,
    TXNAMT: formatPayFastAmount(params.amountMinor),
    CURRENCY_CODE: config.currency,
    merchant_id: config.merchantId,
    secured_key: config.securedKey,
    grant_type: "client_credentials",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Some sandboxes return the token as raw text.
  }

  const token =
    parseTokenResponse(parsed) ??
    (typeof parsed === "string" && parsed.trim() && !parsed.trim().startsWith("{")
      ? parsed.trim()
      : null);

  if (!response.ok || !token) {
    throw new Error(
      `PayFast access token failed (${response.status}): ${text.slice(0, 300)}`
    );
  }
  return token;
}

export function buildCheckoutSignature(
  config: PayFastConfig,
  basketId: string,
  amountMinor: number
): string {
  const raw = `${config.merchantId}${config.merchantName}${formatPayFastAmount(amountMinor)}${basketId}${config.securedKey}`;
  return createHash("md5").update(raw).digest("hex");
}

export function buildCheckoutFields(params: {
  token: string;
  basketId: string;
  amountMinor: number;
  description: string;
  customerEmail?: string | null;
  successUrl: string;
  failureUrl: string;
  notifyUrl: string;
}): { actionUrl: string; fields: Record<string, string> } {
  const config = getPayFastConfig();
  if (!config) {
    throw new Error("PayFast is not configured");
  }

  const amount = formatPayFastAmount(params.amountMinor);
  const fields: Record<string, string> = {
    MERCHANT_ID: config.merchantId,
    MERCHANT_NAME: config.merchantName,
    TOKEN: params.token,
    PROCCODE: "00",
    TXNAMT: amount,
    CURRENCY_CODE: config.currency,
    BASKET_ID: params.basketId,
    TXNDESC: params.description.slice(0, 200),
    ORDER_DATE: new Date().toISOString().slice(0, 19).replace("T", " "),
    SUCCESS_URL: params.successUrl,
    FAILURE_URL: params.failureUrl,
    CHECKOUT_URL: params.notifyUrl,
    SIGNATURE: buildCheckoutSignature(config, params.basketId, params.amountMinor),
    VERSION: "VIETECH-BILLING-1.0",
    Transaction_Type: "3",
  };

  if (params.customerEmail) {
    fields.CUSTOMER_EMAIL_ADDRESS = params.customerEmail;
  }

  return { actionUrl: config.checkoutUrl, fields };
}

export type PayFastNotification = {
  basketId: string | null;
  transactionId: string | null;
  amount: string | null;
  errCode: string | null;
  status: string | null;
  instrumentToken: string | null;
  raw: Record<string, string>;
};

function firstValue(
  record: Record<string, string>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return null;
}

export function parsePayFastNotification(
  payload: Record<string, unknown>
): PayFastNotification {
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    raw[key] = Array.isArray(value) ? String(value[0]) : String(value);
  }

  return {
    basketId: firstValue(raw, ["BASKET_ID", "basket_id", "BasketId"]),
    transactionId: firstValue(raw, [
      "TRANSACTION_ID",
      "transaction_id",
      "err_msg",
      "trans_id",
    ]),
    amount: firstValue(raw, ["TXNAMT", "txnamt", "amount"]),
    errCode: firstValue(raw, ["err_code", "ERR_CODE", "error_code"]),
    status: firstValue(raw, [
      "transaction_status",
      "TRANSACTION_STATUS",
      "status",
      "order_date",
    ]),
    instrumentToken: firstValue(raw, [
      "instrument_token",
      "INSTRUMENT_TOKEN",
      "Recurring_Token",
      "tokenized_instrument",
    ]),
    raw,
  };
}

export function isPayFastSuccess(notification: PayFastNotification): boolean {
  const code = (notification.errCode ?? "").toLowerCase();
  const status = (notification.status ?? "").toLowerCase();
  if (["000", "00", "0"].includes(code)) return true;
  if (["success", "succeeded", "paid", "complete", "completed"].includes(status)) {
    return true;
  }
  return false;
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  );
}
