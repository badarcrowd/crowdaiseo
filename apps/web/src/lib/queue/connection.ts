import IORedis from "ioredis";
import { serverEnv } from "@/config/env";

/**
 * BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`.
 * We create a dedicated connection factory rather than reusing the cache
 * Redis client (BullMQ uses blocking commands).
 */
export const createQueueConnection = () =>
  new IORedis(serverEnv.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
