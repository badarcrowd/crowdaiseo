import { redis } from "@/lib/redis/client";
import type { CrawlFrontier } from "../domain/ports";

/**
 * URL-seen set per crawl. Backed by Redis SET so multiple workers all
 * share the same dedupe state. SADD returns 1 when new — that's our
 * atomic "claim this URL for crawling" signal.
 */
const keyFor = (crawlId: string) => `crawl:seen:${crawlId}`;
const TTL_SECONDS = 60 * 60 * 24; // 24h — crawls should finish well under this

export const frontier: CrawlFrontier = {
  async markSeen(crawlId, normalizedUrl) {
    const key = keyFor(crawlId);
    const added = await redis.sadd(key, normalizedUrl);
    // Refresh TTL on every write — keeps memory bounded for stalled crawls.
    await redis.expire(key, TTL_SECONDS);
    return added === 1;
  },
  async count(crawlId) {
    return redis.scard(keyFor(crawlId));
  },
  async clear(crawlId) {
    await redis.del(keyFor(crawlId));
  },
};
