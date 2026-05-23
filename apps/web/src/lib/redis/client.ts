import IORedis, { type Redis } from "ioredis";
import { serverEnv } from "@/config/env";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

/**
 * Shared Redis connection (cache + rate limit). BullMQ requires its own
 * connection per queue/worker — see `lib/queue/connection.ts`.
 */
export const redis =
  globalForRedis.redis ??
  new IORedis(serverEnv.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });

if (serverEnv.NODE_ENV !== "production") globalForRedis.redis = redis;
