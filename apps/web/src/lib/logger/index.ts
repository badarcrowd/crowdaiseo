import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { app: "aiv" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.apiKey",
    ],
    censor: "[REDACTED]",
  },
  // No transport — avoids worker thread issues in Next.js.
  // Pipe output through pino-pretty for readable dev logs:
  //   pnpm dev 2>&1 | pnpm exec pino-pretty
});

export type Logger = typeof logger;
