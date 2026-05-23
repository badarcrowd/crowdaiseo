import { getRedis } from "@/lib/redis/client";
import type { CrawlFrontier } from "../domain/ports";

/**
 * URL-seen set per crawl. Backed by Redis SET so multiple workers all
 * share the same dedupe state. SADD returns 1 when new — that's our
 * atomic "claim this URL for crawling" signal.
 * 
 * Falls back to in-memory tracking if Redis unavailable (single-instance only).
 */
const keyFor = (crawlId: string) => `crawl:seen:${crawlId}`;
const TTL_SECONDS = 60 * 60 * 24; // 24h — crawls should finish well under this

// Fallback in-memory seen set when Redis unavailable
const memorySeenSets = new Map<string, Set<string>>();

export const frontier: CrawlFrontier = {
  async markSeen(crawlId, normalizedUrl) {
    const redis = getRedis();
    if (!redis) {
      // Fallback to memory
      let seen = memorySeenSets.get(crawlId);
      if (!seen) {
        seen = new Set();
        memorySeenSets.set(crawlId, seen);
      }
      if (seen.has(normalizedUrl)) return false;
      seen.add(normalizedUrl);
      return true;
    }
    const key = keyFor(crawlId);
    const added = await redis.sadd(key, normalizedUrl);
    // Refresh TTL on every write — keeps memory bounded for stalled crawls.
    await redis.expire(key, TTL_SECONDS);
    return added === 1;
  },
  async count(crawlId) {
    const redis = getRedis();
    if (!redis) {
      return memorySeenSets.get(crawlId)?.size ?? 0;
    }
    return redis.scard(keyFor(crawlId));
  },
  async clear(crawlId) {
    const redis = getRedis();
    if (!redis) {
      memorySeenSets.delete(crawlId);
      return;
    }
    await redis.del(keyFor(crawlId));
  },
};
