const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileSecretConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim());
}

/** Public site key — used by the browser widget only. */
export function isTurnstileSiteKeyConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}

type SiteVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

/**
 * Why a Turnstile check did not pass.
 * - `misconfigured`: server secret missing in production → operator error, not user error.
 * - `invalid`: token missing/rejected by Cloudflare.
 */
export type TurnstileFailureReason = "misconfigured" | "invalid";

export type TurnstileResult =
  | { success: true }
  | { success: false; reason: TurnstileFailureReason };

/** Human-facing copy for a failed check. */
export function turnstileErrorMessage(reason: TurnstileFailureReason): string {
  return reason === "misconfigured"
    ? "Security check is temporarily unavailable. Please try again later."
    : "Security check failed. Please try again.";
}

/** HTTP status for a failed check (503 for operator error, 403 for a bad token). */
export function turnstileErrorStatus(reason: TurnstileFailureReason): number {
  return reason === "misconfigured" ? 503 : 403;
}

/**
 * Verifies a Turnstile token with Cloudflare.
 * Outside production a missing secret skips verification (local dev convenience).
 * In production a missing secret fails closed so bot protection cannot silently vanish.
 */
export async function verifyTurnstileResponse(
  token: string | undefined,
  remoteip?: string | null
): Promise<TurnstileResult> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[turnstile] CLOUDFLARE_TURNSTILE_SECRET_KEY is not set. " +
          "Login and registration are blocked until it is configured."
      );
      return { success: false, reason: "misconfigured" };
    }
    return { success: true };
  }

  if (!token?.trim()) {
    return { success: false, reason: "invalid" };
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });
  if (remoteip?.trim()) {
    body.set("remoteip", remoteip.trim());
  }

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      return { success: false, reason: "invalid" };
    }

    const data = (await res.json()) as SiteVerifyResponse;
    if (data.success === true) return { success: true };
    return { success: false, reason: "invalid" };
  } catch (err) {
    // Cloudflare unreachable — operator/network issue, not a user error.
    console.error("[turnstile] verification request failed", err);
    return { success: false, reason: "misconfigured" };
  }
}

export function clientIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  return undefined;
}
