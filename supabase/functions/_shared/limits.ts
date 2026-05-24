// Shared edge-function utilities: token-bucket rate limiter, structured
// logger, and a payload-size-capped JSON reader. In-memory state is per
// isolate — good enough for abuse protection at the edge.
import { jsonResponse } from "./cors.ts";

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitOpts = {
  /** Identifier (user id, IP, or fn:user combo). */
  key: string;
  /** Tokens per minute (max burst = capacity). */
  perMinute: number;
  /** Max burst capacity (defaults to perMinute). */
  capacity?: number;
};

/** Returns null on success, or a 429 Response if rate-limited. */
export function rateLimit(opts: RateLimitOpts): Response | null {
  const cap = opts.capacity ?? opts.perMinute;
  const refillPerMs = opts.perMinute / 60_000;
  const now = Date.now();
  const b = buckets.get(opts.key) ?? { tokens: cap, updatedAt: now };
  const elapsed = now - b.updatedAt;
  b.tokens = Math.min(cap, b.tokens + elapsed * refillPerMs);
  b.updatedAt = now;
  if (b.tokens < 1) {
    const retryMs = Math.ceil((1 - b.tokens) / refillPerMs);
    buckets.set(opts.key, b);
    return jsonResponse(
      { error: "Rate limit exceeded. Try again shortly.", code: "rate_limited" },
      429,
    );
  }
  b.tokens -= 1;
  buckets.set(opts.key, b);
  // Light eviction so the map can't grow unbounded.
  if (buckets.size > 5000) {
    const cutoff = now - 10 * 60_000;
    for (const [k, v] of buckets) if (v.updatedAt < cutoff) buckets.delete(k);
  }
  return null;
}

/** Structured one-line log. */
export function logEvent(fields: {
  fn: string;
  user_id?: string | null;
  ok: boolean;
  ms: number;
  err_code?: string;
  meta?: Record<string, unknown>;
}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));
}

/** Read JSON body with a size cap. Returns parsed JSON, or a Response on error. */
export async function readJsonCapped<T = unknown>(
  req: Request,
  maxBytes: number,
): Promise<T | Response> {
  const cl = req.headers.get("content-length");
  if (cl && Number(cl) > maxBytes) {
    return jsonResponse({ error: "Payload too large", code: "payload_too_large" }, 413);
  }
  const text = await req.text();
  if (text.length > maxBytes) {
    return jsonResponse({ error: "Payload too large", code: "payload_too_large" }, 413);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return jsonResponse({ error: "Invalid JSON", code: "invalid_json" }, 400);
  }
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response;
}
