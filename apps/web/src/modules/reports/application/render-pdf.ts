import "server-only";
import { logger } from "@/lib/logger";

// Type-only — kept local so this file compiles even when @types
// resolution can't find `playwright` (it's installed but the type
// surface is huge; we only need `Browser`-shaped). The runtime import
// below is dynamic, so missing types don't block the build.
type PlaywrightBrowser = {
  newContext(): Promise<PlaywrightContext>;
  close(): Promise<void>;
};
type PlaywrightContext = {
  newPage(): Promise<PlaywrightPage>;
  close(): Promise<void>;
};
type PlaywrightPage = {
  setContent(html: string, opts?: { waitUntil?: string; timeout?: number }): Promise<void>;
  pdf(opts: Record<string, unknown>): Promise<Buffer>;
  close(): Promise<void>;
};

/**
 * PDF renderer — uses Playwright Chromium to print an HTML document.
 *
 * Browser lifecycle: one shared instance per worker process. The crawler
 * already imports `playwright` dynamically; we follow the same pattern
 * here so the Next.js web bundle doesn't pull it in.
 */

let browserPromise: Promise<PlaywrightBrowser> | null = null;

const getBrowser = async (): Promise<PlaywrightBrowser> => {
  if (browserPromise !== null) return browserPromise;
  browserPromise = (async () => {
    const { chromium } = await import("playwright");
    return chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  })();
  return browserPromise;
};

export const renderHtmlToPdf = async (html: string): Promise<Buffer> => {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    // Use a data URL so the worker doesn't need a temp file.
    await page.setContent(html, { waitUntil: "networkidle", timeout: 30_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
    });
    return pdf;
  } finally {
    await page.close().catch(() => null);
    await context.close().catch(() => null);
  }
};

/**
 * Graceful shutdown for the worker. Call from a SIGTERM handler.
 */
export const closePdfRenderer = async (): Promise<void> => {
  if (browserPromise === null) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : err },
      "reports.pdf: browser close failed",
    );
  } finally {
    browserPromise = null;
  }
};
