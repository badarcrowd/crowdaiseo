import { z } from "zod";

/**
 * Centralized, type-safe env loader. Split into server/client schemas so the
 * client bundle can never reference server-only secrets.
 *
 * Import `env` anywhere instead of reading `process.env.*` directly.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase (server)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Redis / Queue
  REDIS_URL: z.string().url(),
  QUEUE_PREFIX: z.string().default("aiv"),

  // AI providers (all optional — orchestrator chooses available ones)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),

  // Observability
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  SENTRY_DSN: z.string().optional(),

  // Billing — Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Stripe price IDs — one per plan × interval
  STRIPE_PRICE_ID_STARTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_STARTER_ANNUAL: z.string().optional(),
  STRIPE_PRICE_ID_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_PRO_ANNUAL: z.string().optional(),
  STRIPE_PRICE_ID_AGENCY_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_AGENCY_ANNUAL: z.string().optional(),
  STRIPE_PRICE_ID_ENTERPRISE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_ENTERPRISE_ANNUAL: z.string().optional(),

  // Analytics — PostHog (server-side)
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),

  // Security
  ENCRYPTION_KEY: z.string().optional(),
  RATE_LIMIT_REDIS_PREFIX: z.string().default("rl"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("AIV"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  // Analytics — PostHog (client-side)
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

const isServer = globalThis.window === undefined;

const parseClient = () => {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });
  if (!parsed.success) {
    console.error("❌ Invalid public env:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid public environment variables");
  }
  return parsed.data;
};

const parseServer = () => {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid server env:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  return parsed.data;
};

export const clientEnv = parseClient();
export const serverEnv = isServer ? parseServer() : (undefined as never);

export const env = isServer
  ? { ...clientEnv, ...serverEnv }
  : (clientEnv as typeof clientEnv & Partial<z.infer<typeof serverSchema>>);

export type Env = typeof env;
