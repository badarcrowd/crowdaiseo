/**
 * Thin Sentry façade. Falls back to pino logging when the @sentry/nextjs
 * package is not installed. Drop in `@sentry/nextjs` and set SENTRY_DSN
 * to activate full error tracking.
 */
import { logger } from "@/lib/logger";

type SentryModule = {
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
};

let _sentry: SentryModule | null = null;
let _loadAttempted = false;

const loadSentry = (): SentryModule | null => {
  if (_sentry) return _sentry;
  if (_loadAttempted) return null;
  _loadAttempted = true;
  try {
    // Hide the module specifier from webpack's static analysis so the
    // build doesn't fail when @sentry/nextjs isn't installed. The
    // package is genuinely optional — we fall back to logger below.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const req = eval("require") as NodeJS.Require;
    const moduleName = ["@sentry", "nextjs"].join("/");
    const Sentry = req(moduleName) as SentryModule;
    _sentry = Sentry;
    return Sentry;
  } catch {
    return null;
  }
};

export const captureException = (
  err: unknown,
  context?: Record<string, unknown>,
): void => {
  const sentry = loadSentry();
  if (sentry) {
    try {
      sentry.captureException(err, context);
    } catch {
      // never let observability break the critical path
    }
    return;
  }
  // Fallback: structured log so the error is at least captured in logs.
  const msg = err instanceof Error ? err.message : String(err);
  logger.error({ err: msg, ...context }, "unhandled exception captured");
};

export const initSentry = (dsn: string | undefined): void => {
  if (!dsn) return;
  const sentry = loadSentry();
  if (!sentry) {
    logger.warn("SENTRY_DSN is set but @sentry/nextjs is not installed — install it to enable error tracking");
  }
};
