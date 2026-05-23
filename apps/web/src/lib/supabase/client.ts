import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { clientEnv } from "@/config/env";

/**
 * Browser-side Supabase client. Singleton via module evaluation —
 * Next.js dedupes module instances per route segment.
 */
export const createClient = () =>
  createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
