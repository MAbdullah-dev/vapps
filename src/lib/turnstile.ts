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
 * Verifies a Turnstile token with Cloudflare.
 * If `CLOUDFLARE_TURNSTILE_SECRET_KEY` is unset (local dev), verification is skipped.
 */
export async function verifyTurnstileResponse(
  token: string | undefined,
  remoteip?: string | null
): Promise<{ success: boolean }> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { success: true };
  }

  if (!token?.trim()) {
    return { success: false };
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });
  if (remoteip?.trim()) {
    body.set("remoteip", remoteip.trim());
  }

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    return { success: false };
  }

  const data = (await res.json()) as SiteVerifyResponse;
  return { success: data.success === true };
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
