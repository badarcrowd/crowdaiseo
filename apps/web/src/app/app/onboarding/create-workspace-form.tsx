"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createWorkspaceAction } from "@/modules/workspaces/presentation/actions";
import type { ActionResult } from "@/lib/actions/safe-action";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

type State = ActionResult<{ id: string; slug: string }> | null;

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, fd) =>
      createWorkspaceAction({ name: fd.get("name"), slug: fd.get("slug") }),
    null,
  );

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (state?.ok) router.push(`/app/w/${state.data.slug}/dashboard`);
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Workspace name</span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={64}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Acme, Inc."
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">URL slug</span>
        <div className="flex">
          <span className="border-input bg-muted text-muted-foreground flex items-center rounded-l-md border border-r-0 px-3 text-sm">
            /w/
          </span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            pattern="[a-z0-9-]+"
            minLength={2}
            maxLength={48}
            className="border-input bg-background w-full rounded-r-md border px-3 py-2 text-sm"
            placeholder="acme"
          />
        </div>
      </label>
      {state && !state.ok && (
        <p className="text-destructive text-sm">{state.error.message}</p>
      )}
      <Button type="submit" disabled={pending || !name || !slug} className="w-full">
        {pending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
