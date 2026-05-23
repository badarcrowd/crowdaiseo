import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { redis } from "@/lib/redis/client";
import { queues } from "@/lib/queue/queues";
import { circuitSnapshot } from "@/lib/ai/circuit-breaker";
import { snapshot as metricsSnapshot } from "@/lib/observability/metrics";

type CheckResult = { ok: boolean; latencyMs: number; error?: string };

const probe = async (label: string, fn: () => Promise<void>): Promise<CheckResult> => {
  const t = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - t };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

export const GET = async () => {
  const [db, redisCheck, queueDepths] = await Promise.all([
    probe("db", async () => {
      await prisma.$queryRaw`SELECT 1`;
    }),
    probe("redis", async () => {
      const pong = await redis.ping();
      if (pong !== "PONG") throw new Error("unexpected ping response");
    }),
    (async () => {
      try {
        const [scan, promptRun, crawlPage, dlq] = await Promise.all([
          queues.aiVisibilityScan.getJobCounts("waiting", "active", "delayed", "failed"),
          queues.aiPromptRun.getJobCounts("waiting", "active", "delayed", "failed"),
          queues.crawlPage.getJobCounts("waiting", "active", "delayed", "failed"),
          queues.dlq.getJobCounts("waiting", "failed"),
        ]);
        return { aiVisibilityScan: scan, aiPromptRun: promptRun, crawlPage, dlq };
      } catch {
        return null;
      }
    })(),
  ]);

  const circuits = circuitSnapshot();
  const openCircuits = circuits.filter((c) => c.state !== "CLOSED");
  const allOk = db.ok && redisCheck.ok;

  const body = {
    status: allOk ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: { db, redis: redisCheck },
    queues: queueDepths,
    circuits,
    ...(openCircuits.length > 0 && { alerts: { openCircuits } }),
    metrics: metricsSnapshot(),
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
};
