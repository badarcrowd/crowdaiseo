"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  signInWithOAuthAction,
  signInWithPasswordAction,
} from "./actions";
import type { ActionResult } from "@/lib/actions/safe-action";

const initialState: ActionResult<unknown> | null = null;

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(
    async (_: typeof initialState, formData: FormData) =>
      signInWithPasswordAction({
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo,
      }),
    initialState,
  );
  const [googlePending, startGoogle] = useTransition();

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
        />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state && !state.ok && (
          <p className="text-destructive text-sm">{state.error.message}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <Divider>or</Divider>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={googlePending}
        onClick={() =>
          startGoogle(async () => {
            await signInWithOAuthAction({ provider: "google", redirectTo });
          })
        }
      >
        <GoogleIcon /> Continue with Google
      </Button>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...rest}
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
      />
    </label>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="border-border w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card text-muted-foreground px-2">{children}</span>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.12 2.73-2.39 3.58v2.98h3.86c2.26-2.08 3.58-5.15 3.58-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.31c-.25-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.29 5.4l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}
