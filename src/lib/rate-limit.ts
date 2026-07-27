/**
 * Simple in-memory rate limiter for auth and expensive endpoints.
 * Suitable for single-instance (PM2 fork) deploys. Replace with Redis for multi-instance.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Sliding fixed-window limiter.
 * @param key - Unique key (e.g. `auth:login:${ip}`)
 * @param limit - Max requests per window
 * @param windowMs - Window size in ms
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining, retryAfterSec };
}

/** Periodically prune expired buckets to avoid unbounded memory growth. */
export function pruneRateLimitBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

// Prune every 5 minutes in long-lived Node processes
if (typeof setInterval !== "undefined") {
  const timer = setInterval(pruneRateLimitBuckets, 5 * 60 * 1000);
  if (typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }
}
