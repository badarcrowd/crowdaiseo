import { registerAiProviders } from "@/lib/ai/providers";
import { logger } from "@/lib/logger";
import { initSentry } from "@/lib/observability/sentry";
import { serverEnv } from "@/config/env";

initSentry(serverEnv.SENTRY_DSN);
registerAiProviders();
logger.info("server bootstrap complete");
