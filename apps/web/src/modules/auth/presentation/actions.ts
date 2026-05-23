"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeAction } from "@/lib/actions/safe-action";
import { clientEnv } from "@/config/env";
import { AppError } from "@/lib/errors";

// Only accept relative paths — prevents open-redirect attacks.
const safeRelativePath = z
  .string()
  .optional()
  .transform((v) => (v?.startsWith("/") ? v : undefined));

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  redirectTo: safeRelativePath,
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(80).optional(),
});

const oauthSchema = z.object({
  provider: z.enum(["google"]),
  redirectTo: safeRelativePath,
});

// ---- Email + password sign-in ----------------------------------------
export const signInWithPasswordAction = safeAction(signInSchema, async (input) => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) {
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Invalid email or password",
    });
  }
  revalidatePath("/", "layout");
  redirect(input.redirectTo ?? "/app");
});

// ---- Email + password sign-up ----------------------------------------
export const signUpWithPasswordAction = safeAction(signUpSchema, async (input) => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.fullName },
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/callback?next=/app`,
    },
  });
  if (error) {
    throw new AppError({ code: "VALIDATION", message: error.message });
  }
  return { needsEmailConfirmation: true };
});

// ---- OAuth (Google) ---------------------------------------------------
export const signInWithOAuthAction = safeAction(oauthSchema, async (input) => {
  const supabase = await createClient();
  const next = input.redirectTo ?? "/app";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: input.provider,
    options: {
      redirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    throw new AppError({ code: "INTEGRATION_FAILURE", message: "Could not start OAuth flow" });
  }
  redirect(data.url);
});

// ---- Sign out ---------------------------------------------------------
export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
};
