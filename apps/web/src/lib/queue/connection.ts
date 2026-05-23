import IORedis from "ioredis";
import { serverEnv } from "@/config/env";

/**
 * BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`.
 * We create a dedicated connection factory rather than reusing the cache
 * Redis client (BullMQ uses blocking commands).
 * 
 * Returns null if Redis is not available (e.g., during build).
 */
export const createQueueConnection = () => {
  const redisUrl = serverEnv.REDIS_URL;
  // Skip during build or when Redis URL points to localhost in production
  if (!redisUrl || (process.env.NODE_ENV === "production" && redisUrl.includes("localhost"))) {
    return null;
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
};
