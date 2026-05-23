import "server-only";
import { queues } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { reportRepository } from "../infrastructure/report.repository";

/**
 * Scheduler tick.
 *
 * Runs every minute via BullMQ's repeatable jobs. For each schedule
 * where `nextRunAt <= now`:
 *   1. Create a Report row (status QUEUED).
 *   2. Enqueue a `report.generate` job with the schedule's recipients.
 *   3. Compute the next run time and persist.
 *
 * Cron parsing is intentionally simple — we accept a small subset
 * (every N minutes / hourly / daily / weekly) without pulling in
 * `cron-parser`. Extend as needed.
 */

export const tickScheduler = async (now = new Date()): Promise<{ enqueued: number }> => {
  const due = await reportRepository.listDueSchedules(now);
  let enqueued = 0;
  for (const schedule of due) {
    try {
      const report = await reportRepository.createReport({
        workspaceId: schedule.workspaceId,
        projectId: schedule.projectId,
        template: schedule.template,
        title: schedule.title,
        parameters: schedule.parameters as Record<string, unknown>,
        scheduleId: schedule.id,
        triggeredById: schedule.createdById,
      });
      await queues.reportGenerate.add(
        "generate",
        {
          reportId: report.id,
          workspaceId: schedule.workspaceId,
          emailRecipients: schedule.recipients,
          createShare: true,
        },
        { jobId: `rpt-${report.id}` },
      );
      const next = nextRunFromCron(schedule.cron, now);
      await reportRepository.markScheduleRan(schedule.id, next);
      enqueued++;
    } catch (err) {
      logger.error(
        {
          scheduleId: schedule.id,
          err: err instanceof Error ? err.message : err,
        },
        "reports.scheduler: failed to fan out schedule",
      );
    }
  }
  if (enqueued > 0) {
    logger.info({ enqueued, dueCount: due.length }, "reports.scheduler: ticked");
  }
  return { enqueued };
};

/**
 * Compute the next run time from a tiny cron subset.
 *
 * Supported forms (case-insensitive):
 *   `every 15m`, `every 1h`, `hourly`, `daily`, `weekly`,
 *   `daily@HH:MM`, `weekly@DOW:HH:MM`  (DOW = 0..6, Sunday = 0)
 *
 * Everything else falls back to +24h. Full RFC cron support would
 * require a library — accept the limitation and document the subset.
 */
export const nextRunFromCron = (expr: string, from: Date): Date => {
  const e = expr.trim().toLowerCase();
  const everyM = e.match(/^every\s+(\d+)m$/);
  if (everyM) {
    const m = parseInt(everyM[1] ?? "0", 10);
    return new Date(from.getTime() + Math.max(1, m) * 60_000);
  }
  const everyH = e.match(/^every\s+(\d+)h$/);
  if (everyH) {
    const h = parseInt(everyH[1] ?? "0", 10);
    return new Date(from.getTime() + Math.max(1, h) * 3_600_000);
  }
  if (e === "hourly") return new Date(from.getTime() + 3_600_000);

  const daily = e.match(/^daily(?:@(\d{1,2}):(\d{2}))?$/);
  if (daily) {
    const hh = parseInt(daily[1] ?? "9", 10);
    const mm = parseInt(daily[2] ?? "0", 10);
    const next = new Date(from);
    next.setUTCHours(hh, mm, 0, 0);
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
  const weekly = e.match(/^weekly(?:@(\d):(\d{1,2}):(\d{2}))?$/);
  if (weekly) {
    const dow = parseInt(weekly[1] ?? "1", 10); // default Monday
    const hh = parseInt(weekly[2] ?? "9", 10);
    const mm = parseInt(weekly[3] ?? "0", 10);
    const next = new Date(from);
    next.setUTCHours(hh, mm, 0, 0);
    const delta = (dow - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + (delta === 0 && next <= from ? 7 : delta));
    return next;
  }
  return new Date(from.getTime() + 86_400_000);
};
