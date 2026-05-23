"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "./actions";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => signOutAction())}
    >
      {pending ? "…" : "Sign out"}
    </Button>
  );
}
