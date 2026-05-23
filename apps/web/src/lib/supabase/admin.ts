import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { clientEnv, serverEnv } from "@/config/env";

/**
 * Service-role admin client. NEVER import from a client component or RSC
 * that may bundle into the browser. Use only inside route handlers, server
 * actions, and queue workers — and always after authorization checks.
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

export const adminClient = () => {
  if (cached) return cached;
  cached = createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  return cached;
};
