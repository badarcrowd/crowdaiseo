import "server-only";
import { headers } from "next/headers";
import { getRedis } from "@/lib/redis/client";
import { serverEnv } from "@/config/env";
import { AppError } from "@/lib/errors";

/**
 * Sliding-window rate limiter backed by Redis.
 *
 * Uses a simple fixed-window counter (INCR + EXPIRE). For most server
 * action use cases this is sufficient; replace with a Lua sliding window
 * if sub-second burst accuracy is required.
 */
export type RateLimitOpts = {
  /** How many requests are allowed per window. */
  limit: number;
  /** Window size in seconds. */
  windowSecs: number;
  /** Key prefix — disambiguates different endpoints. */
  prefix?: string;
};

/**
 * Returns the caller's IP from standard proxy headers.
 * Falls back to "unknown" if none are present.
 */
const getIp = async (): Promise<string> => {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
};

/**
 * Check rate limit for the current request. Throws `RATE_LIMITED` if
 * exceeded; otherwise returns the remaining count.
 *
 * Designed for use inside server actions and API route handlers.
 */
export const checkRateLimit = async (
  opts: RateLimitOpts,
  identifierOverride?: string,
): Promise<{ remaining: number }> => {
  const redis = getRedis();
  // Skip rate limiting if Redis unavailable (during build or misconfigured)
  if (!redis) {
    return { remaining: opts.limit };
  }

  const ip = identifierOverride ?? (await getIp());
  const prefix = opts.prefix ?? serverEnv.RATE_LIMIT_REDIS_PREFIX;
  const windowKey = Math.floor(Date.now() / (opts.windowSecs * 1000));
  const key = `${prefix}:${ip}:${windowKey}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, opts.windowSecs);
  }

  if (current > opts.limit) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: `Too many requests — retry after ${opts.windowSecs}s`,
      status: 429,
    });
  }

  return { remaining: opts.limit - current };
};

// Pre-configured limiters for common use cases.
export const actionRateLimit = (identifierOverride?: string) =>
  checkRateLimit({ limit: 30, windowSecs: 60, prefix: "rl:action" }, identifierOverride);

export const authRateLimit = (identifierOverride?: string) =>
  checkRateLimit({ limit: 10, windowSecs: 60, prefix: "rl:auth" }, identifierOverride);

export const apiRateLimit = (identifierOverride?: string) =>
  checkRateLimit({ limit: 60, windowSecs: 60, prefix: "rl:api" }, identifierOverride);

export const scanRateLimit = (workspaceId: string) =>
  checkRateLimit({ limit: 5, windowSecs: 60, prefix: "rl:scan" }, workspaceId);
