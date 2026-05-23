"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PromptCategory, ProviderId } from "@prisma/client";
import { AlertCircle, Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/field";
import { CATEGORY_META, PROVIDER_LABEL } from "./labels";
import { createPromptAction, revisePromptAction } from "./actions";

const ALL_PROVIDERS: ProviderId[] = ["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"];
const ALL_CATEGORIES: PromptCategory[] = Object.keys(CATEGORY_META) as PromptCategory[];

export type PromptEditorMode =
  | { kind: "create"; projectId: string }
  | {
      kind: "revise";
      promptId: string;
      initialName: string;
      initialContent: string;
      initialCategory: PromptCategory;
      initialProviders: ProviderId[];
    };

export function PromptEditor({
  workspaceId,
  mode,
  open,
  onOpenChange,
}: Readonly<{
  workspaceId: string;
  mode: PromptEditorMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PromptCategory>("INFORMATIONAL");
  const [providers, setProviders] = useState<ProviderId[]>(ALL_PROVIDERS);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (mode.kind === "revise") {
      setName(mode.initialName);
      setContent(mode.initialContent);
      setCategory(mode.initialCategory);
      setProviders(mode.initialProviders);
      setNotes("");
    } else {
      setName("");
      setContent("");
      setCategory("INFORMATIONAL");
      setProviders(ALL_PROVIDERS);
      setNotes("");
    }
    setError(null);
  }, [open, mode]);

  const toggleProvider = (p: ProviderId) =>
    setProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const submit = () => {
    setError(null);
    start(async () => {
      if (mode.kind === "create") {
        const res = await createPromptAction({
          workspaceId,
          projectId: mode.projectId,
          name: name.trim(),
          category,
          preferredProviders: providers,
          content,
        });
        if (res.ok) {
          onOpenChange(false);
          router.refresh();
        } else setError(res.error.message);
      } else {
        const res = await revisePromptAction({
          workspaceId,
          promptId: mode.promptId,
          content,
          notes: notes || undefined,
        });
        if (res.ok) {
          onOpenChange(false);
          router.refresh();
        } else setError(res.error.message);
      }
    });
  };

  const isRevise = mode.kind === "revise";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0">
        <DialogHeader>
          <DialogTitle>
            {isRevise ? "Edit prompt" : "New prompt"}
          </DialogTitle>
          <DialogDescription>
            {isRevise
              ? "Saving creates a new version. Old runs keep their original content."
              : "Prompts are sent to selected LLMs to measure your AI visibility."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {!isRevise && (
            <>
              <Field label="Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Top AI SEO platforms — comparison"
                  autoFocus
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Category">
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as PromptCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_META[c].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Providers"
                  hint="At least one"
                >
                  <div className="bg-background border-input flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
                    {ALL_PROVIDERS.map((p) => (
                      <label
                        key={p}
                        className="flex cursor-pointer items-center gap-1.5 text-xs"
                      >
                        <Checkbox
                          checked={providers.includes(p)}
                          onCheckedChange={() => toggleProvider(p)}
                        />
                        <span>{PROVIDER_LABEL[p]}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </>
          )}
          <Field
            label="Prompt"
            required
            hint="Use {{brand}} and {{domain}} — interpolated per project."
          >
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="What is the best platform for tracking AI visibility?"
              className="font-mono text-xs"
            />
          </Field>
          <div className="text-muted-foreground text-xs tabular-nums">
            {content.length} characters
          </div>
          {isRevise && (
            <Field
              label="Change notes"
              hint="Optional — describe what changed in this version."
            >
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tightened phrasing for comparison intent"
                maxLength={280}
              />
            </Field>
          )}
          {error && (
            <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              pending ||
              content.trim().length < 8 ||
              (!isRevise && name.trim().length === 0) ||
              (!isRevise && providers.length === 0)
            }
          >
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {isRevise ? "Save new version" : "Create prompt"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
