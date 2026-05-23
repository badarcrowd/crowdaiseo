import type { Browser, BrowserContext, Page } from "playwright";
import type { Fetcher } from "../domain/ports";
import type { FetchedResource } from "../domain/entities";
import { logger } from "@/lib/logger";

/**
 * Headless-browser fetcher. Use when sites require JavaScript to render
 * meaningful content (SPAs, hydration-only pages).
 *
 * Per worker process we keep a single Browser instance and rotate
 * BrowserContexts per page fetch — contexts isolate cookies/cache and
 * are cheap to create. The Browser itself is expensive; share it.
 *
 * We import `playwright` dynamically so the package is only required at
 * runtime on the worker (the Next.js web server doesn't bundle it).
 */
const DEFAULT_TIMEOUT_MS = 30_000;
const WAIT_UNTIL: "domcontentloaded" | "networkidle" = "domcontentloaded";

let browserPromise: Promise<Browser> | null = null;

const getBrowser = async (): Promise<Browser> => {
  if (browserPromise) return browserPromise;
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

export const playwrightFetcher: Fetcher = {
  async fetch(url, { userAgent }) {
    const browser = await getBrowser();
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    const start = Date.now();
    const chain: string[] = [];

    try {
      context = await browser.newContext({
        userAgent,
        bypassCSP: true,
        viewport: { width: 1280, height: 800 },
      });
      // Block heavy resources we don't need for SEO extraction.
      await context.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (type === "image" || type === "media" || type === "font") {
          return route.abort();
        }
        return route.continue();
      });

      page = await context.newPage();
      page.on("request", (req) => {
        if (req.isNavigationRequest() && req.url() !== url) {
          chain.push(req.url());
        }
      });

      const response = await page.goto(url, {
        waitUntil: WAIT_UNTIL,
        timeout: DEFAULT_TIMEOUT_MS,
      });

      const status = response?.status() ?? 0;
      const headers = response?.headers() ?? {};
      const contentType = headers["content-type"] ?? null;
      const html = await page.content();
      const finalUrl = page.url();

      return {
        url,
        finalUrl,
        redirectChain: chain,
        httpStatus: status,
        contentType,
        html,
        bytes: Buffer.byteLength(html, "utf-8"),
        durationMs: Date.now() - start,
      } satisfies FetchedResource;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "playwright-failed";
      logger.warn({ url, err: msg }, "playwright fetch failed");
      return {
        url,
        finalUrl: url,
        redirectChain: chain,
        httpStatus: 0,
        contentType: null,
        html: null,
        bytes: 0,
        durationMs: Date.now() - start,
        error: msg,
      };
    } finally {
      await page?.close().catch(() => null);
      await context?.close().catch(() => null);
    }
  },

  async close() {
    if (!browserPromise) return;
    const b = await browserPromise;
    browserPromise = null;
    await b.close();
  },
};
