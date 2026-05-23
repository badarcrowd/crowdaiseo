"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signUpWithPasswordAction } from "./actions";
import type { ActionResult } from "@/lib/actions/safe-action";

type State = ActionResult<{ needsEmailConfirmation: boolean }> | null;

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) =>
      signUpWithPasswordAction({
        email: formData.get("email"),
        password: formData.get("password"),
        fullName: formData.get("fullName") || undefined,
      }),
    null,
  );

  if (state?.ok && state.data.needsEmailConfirmation) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-muted-foreground text-sm">
          We sent a confirmation link to complete your sign-up.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field name="fullName" label="Full name" autoComplete="name" />
      <Field name="email" label="Email" type="email" autoComplete="email" required />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      {state && !state.ok && (
        <p className="text-destructive text-sm">{state.error.message}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
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
