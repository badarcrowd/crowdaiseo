"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, TagInput } from "@/components/forms/field";
import { COUNTRIES, LANGUAGES } from "./locales";
import { updateProjectAction, deleteProjectAction } from "./actions";

export type ProjectForEdit = {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  country: string | null;
  language: string | null;
  keywords: string[];
  competitors: Array<{ name: string; domain: string | null }>;
};

type EditState = {
  name: string;
  domain: string;
  description: string;
  country: string;
  language: string;
  keywords: string[];
  competitors: Array<{ name: string; domain: string }>;
};

function toEditState(p: ProjectForEdit): EditState {
  return {
    name: p.name,
    domain: p.domain,
    description: p.description ?? "",
    country: p.country ?? "US",
    language: p.language ?? "en",
    keywords: p.keywords,
    competitors: p.competitors.map((c) => ({
      name: c.name,
      domain: c.domain ?? "",
    })),
  };
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

function EditProjectDialog({
  open,
  onOpenChange,
  workspaceId,
  project,
}: Readonly<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  project: ProjectForEdit;
}>) {
  const router = useRouter();
  const [state, setState] = useState<EditState>(() => toEditState(project));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updateCompetitorName = (i: number, name: string) => {
    setState((s) => {
      const next = [...s.competitors];
      next[i] = { ...next[i], name };
      return { ...s, competitors: next };
    });
  };

  const updateCompetitorDomain = (i: number, domain: string) => {
    setState((s) => {
      const next = [...s.competitors];
      next[i] = { ...next[i], domain };
      return { ...s, competitors: next };
    });
  };

  const removeCompetitor = (i: number) => {
    setState((s) => ({
      ...s,
      competitors: s.competitors.filter((_, idx) => idx !== i),
    }));
  };

  const addCompetitor = () => {
    setState((s) => ({
      ...s,
      competitors: [...s.competitors, { name: "", domain: "" }],
    }));
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateProjectAction({
        workspaceId,
        projectId: project.id,
        name: state.name.trim() || undefined,
        domain: state.domain || undefined,
        description: state.description.trim() || undefined,
        country: state.country || undefined,
        language: state.language || undefined,
        keywords: state.keywords,
        competitors: state.competitors.filter((c) => c.name.trim()),
      });
      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update settings for <strong>{project.domain}</strong>.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Basics */}
          <div className="space-y-4">
            <div className="text-foreground text-xs font-semibold uppercase tracking-wider">
              Basics
            </div>
            <Field label="Project name" required>
              <Input
                value={state.name}
                onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                placeholder="Acme Marketing Site"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Domain" required hint="No protocol or path.">
                <Input
                  value={state.domain}
                  onChange={(e) => setState((s) => ({ ...s, domain: e.target.value }))}
                  placeholder="acme.com"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Description" hint="Internal note.">
                <Textarea
                  value={state.description}
                  onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
                  placeholder="What is this project tracking?"
                  rows={1}
                />
              </Field>
            </div>
          </div>

          {/* Locale */}
          <div className="space-y-3">
            <div className="text-foreground text-xs font-semibold uppercase tracking-wider">
              Locale
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Target country">
                <Select
                  value={state.country}
                  onValueChange={(v) => setState((s) => ({ ...s, country: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Language">
                <Select
                  value={state.language}
                  onValueChange={(v) => setState((s) => ({ ...s, language: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* Keywords */}
          <div className="space-y-3">
            <div className="text-foreground text-xs font-semibold uppercase tracking-wider">
              Keywords
            </div>
            <Field hint="Press Enter or comma to add.">
              <TagInput
                values={state.keywords}
                onChange={(keywords) => setState((s) => ({ ...s, keywords }))}
                max={200}
                placeholder="e.g. ai seo platform"
              />
            </Field>
          </div>

          {/* Competitors */}
          <div className="space-y-3">
            <div className="text-foreground text-xs font-semibold uppercase tracking-wider">
              Competitors
            </div>
            <div className="space-y-2">
              {state.competitors.map((c, i) => (
                <div key={c.name + String(i)} className="flex gap-2">
                  <Input
                    value={c.name}
                    onChange={(e) => updateCompetitorName(i, e.target.value)}
                    placeholder="Competitor name"
                    className="flex-1"
                  />
                  <Input
                    value={c.domain}
                    onChange={(e) => updateCompetitorDomain(i, e.target.value)}
                    placeholder="competitor.com"
                    className="flex-1"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => removeCompetitor(i)}
                    aria-label="Remove competitor"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={addCompetitor}
                disabled={state.competitors.length >= 50}
              >
                <Plus className="h-3.5 w-3.5" /> Add competitor
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Save changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete dialog
// ---------------------------------------------------------------------------

function DeleteProjectDialog({
  open,
  onOpenChange,
  workspaceId,
  project,
}: Readonly<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  project: ProjectForEdit;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteProjectAction({
        workspaceId,
        projectId: project.id,
      });
      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            This will soft-delete <strong>{project.name}</strong> ({project.domain}) and
            remove it from all dashboards. Crawl and scan data are retained but hidden.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive mx-6 flex items-start gap-2 rounded-md p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…
              </>
            ) : (
              "Delete project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Actions menu (the public export — rendered inside each project card)
// ---------------------------------------------------------------------------

export function ProjectActionsMenu({
  workspaceId,
  project,
}: Readonly<{
  workspaceId: string;
  project: ProjectForEdit;
}>) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
            aria-label="Project actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit project
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        workspaceId={workspaceId}
        project={project}
      />
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceId={workspaceId}
        project={project}
      />
    </>
  );
}
