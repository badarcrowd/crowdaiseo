import { redis } from "@/lib/redis/client";
import type { RateLimiter } from "../domain/ports";

/**
 * Redis-backed token bucket. Atomic via Lua so multiple workers stay
 * coherent. Each `key` (we use the URL origin) gets its own bucket so a
 * fast site never starves a slow one and we never DoS a single origin.
 *
 * Defaults: 2 requests/sec burst of 4 — polite for unattended crawling.
 * Tune per-origin if/when needed by passing custom `capacity`/`refillPerSec`.
 */
const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])  -- tokens per second
local now = tonumber(ARGV[3])     -- ms epoch
local cost = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])
if tokens == nil then
  tokens = capacity
  ts = now
end

local elapsed_ms = now - ts
if elapsed_ms < 0 then elapsed_ms = 0 end
tokens = math.min(capacity, tokens + (elapsed_ms / 1000.0) * refill)

local allowed = 0
local wait_ms = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
else
  local deficit = cost - tokens
  wait_ms = math.ceil((deficit / refill) * 1000)
end

redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', key, 60000)  -- keep buckets warm 60s
return {allowed, wait_ms}
`;

export type RateLimiterOptions = {
  capacity?: number;
  refillPerSec?: number;
  prefix?: string;
};

export const createRateLimiter = (
  opts: RateLimiterOptions = {},
): RateLimiter => {
  const capacity = opts.capacity ?? 4;
  const refill = opts.refillPerSec ?? 2;
  const prefix = opts.prefix ?? "rl:crawl";

  return {
    async acquire(key, { timeoutMs = 30_000 } = {}) {
      const fullKey = `${prefix}:${key}`;
      const deadline = Date.now() + timeoutMs;

      // Bounded retry loop. We sleep for the bucket's reported wait time
      // each iteration so we don't busy-poll.
      for (;;) {
        const result = (await redis.eval(
          TOKEN_BUCKET_LUA,
          1,
          fullKey,
          capacity.toString(),
          refill.toString(),
          Date.now().toString(),
          "1",
        )) as [number, number];

        if (result[0] === 1) return;
        if (Date.now() >= deadline) {
          throw new Error(
            `rate limiter: timed out waiting for token on ${key}`,
          );
        }
        const wait = Math.min(result[1], deadline - Date.now(), 5_000);
        await new Promise((r) => setTimeout(r, Math.max(wait, 50)));
      }
    },
  };
};
