import "server-only";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma/client";

/**
 * Sync Supabase Auth user to local Prisma users table.
 * Uses upsert so it's safe to call repeatedly.
 */
export const syncUser = async (authUser: User) => {
  await prisma.user.upsert({
    where: { id: authUser.id },
    update: {
      email: authUser.email ?? "",
      fullName: authUser.user_metadata?.full_name ?? null,
      avatarUrl: authUser.user_metadata?.avatar_url ?? null,
    },
    create: {
      id: authUser.id,
      email: authUser.email ?? "",
      fullName: authUser.user_metadata?.full_name ?? null,
      avatarUrl: authUser.user_metadata?.avatar_url ?? null,
    },
  });
};
