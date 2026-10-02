import "server-only";

/**
 * Tiny in-memory fixed-window limiter (per server process). Good enough for a
 * single Railway instance to blunt password guessing; move to Postgres/Redis
 * if the app ever runs more than one replica.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      // Still full (flood of distinct keys): evict the oldest-inserted keys.
      for (const k of buckets.keys()) {
        if (buckets.size < MAX_KEYS) break;
        buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/** Best-effort client IP behind Railway's proxy. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
