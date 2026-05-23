import IORedis, { type Redis } from "ioredis";
import { serverEnv } from "@/config/env";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

/**
 * Shared Redis connection (cache + rate limit). BullMQ requires its own
 * connection per queue/worker — see `lib/queue/connection.ts`.
 * 
 * Uses lazy initialization to avoid connection during build.
 */
function createRedisClient(): Redis | null {
  // Skip Redis during build (no REDIS_URL or localhost in production build)
  const redisUrl = serverEnv.REDIS_URL;
  if (!redisUrl || (process.env.NODE_ENV === "production" && redisUrl.includes("localhost"))) {
    return null;
  }

  if (globalForRedis.redis) {
    return globalForRedis.redis;
  }

  const client = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  if (serverEnv.NODE_ENV !== "production") {
    globalForRedis.redis = client;
  }

  return client;
}

let _redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (_redis === undefined) {
    _redis = createRedisClient();
  }
  return _redis;
}

// Legacy export for backward compatibility - will be null during build
export const redis = null as unknown as Redis;
