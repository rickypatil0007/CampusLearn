import "server-only";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Check if Upstash Redis variables exist
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = UPSTASH_URL && UPSTASH_TOKEN 
  ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
  : null;

// Fallback in-memory map if Redis is not configured
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const ratelimiters = new Map<string, Ratelimit>();

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (redis) {
    const configKey = `${limit}:${windowMs}`;
    let limiter = ratelimiters.get(configKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
        analytics: false,
      });
      ratelimiters.set(configKey, limiter);
    }

    const { success, remaining, reset } = await limiter.limit(key);
    return {
      allowed: success,
      remaining,
      resetAt: reset,
    };
  } else {
    // Fallback in-memory logic
    const now = Date.now();
    const windowStart = now - windowMs;
    const existing = (hits.get(key) ?? []).filter((t) => t > windowStart);

    if (existing.length >= limit) {
      hits.set(key, existing);
      return { allowed: false, remaining: 0, resetAt: existing[0] + windowMs };
    }

    existing.push(now);
    hits.set(key, existing);
    return { allowed: true, remaining: limit - existing.length, resetAt: now + windowMs };
  }
}

// Named presets used across the app.
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
  aiRequestPerMinute: { limit: 6, windowMs: 60 * 1000 },
  // Coarse per-IP backstop on top of the 60s per-email cooldown enforced by
  // email_verification_requests (spec 6.5: "rate-limit by normalized email
  // AND IP address").
  resendVerification: { limit: 10, windowMs: 15 * 60 * 1000 },
} as const;
