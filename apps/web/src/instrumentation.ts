/**
 * Next.js calls register() on both the Node.js and Edge runtimes.
 * We delegate to a Node-only file so the edge bundle never sees
 * pino / ioredis / Prisma (all of which use Node.js APIs).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
