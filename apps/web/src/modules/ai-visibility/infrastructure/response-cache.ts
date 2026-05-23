import { redis } from "@/lib/redis/client";
import type { ResponseCache } from "../domain/ports";
import type { LLMResponse } from "../domain/entities";

const KEY_PREFIX = "aiv:llm-cache";
const DEFAULT_TTL = 60 * 60 * 24; // 24h

/**
 * Cache LLM responses by (provider + content hash). Identical prompts
 * fired against the same model within the TTL window dedupe — a free
 * cost saver when running many scans against the same prompt library.
 *
 * We store the full LLMResponse JSON; raw provider payloads are large
 * but compress well, and we set a hard 1 MB cap to protect Redis.
 */
const MAX_BYTES = 1_000_000;

export const responseCache: ResponseCache = {
  async get(key) {
    const raw = await redis.get(`${KEY_PREFIX}:${key}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LLMResponse;
    } catch {
      return null;
    }
  },
  async set(key, value, ttlSeconds = DEFAULT_TTL) {
    const json = JSON.stringify(value);
    if (json.length > MAX_BYTES) return; // too large to cache
    await redis.set(`${KEY_PREFIX}:${key}`, json, "EX", ttlSeconds);
  },
};

export const cacheKey = (provider: string, contentHash: string) =>
  `${provider}:${contentHash}`;
