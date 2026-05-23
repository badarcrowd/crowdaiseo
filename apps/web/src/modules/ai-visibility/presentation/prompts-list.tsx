"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PromptCategory, PromptStatus, ProviderId } from "@prisma/client";
import {
  Archive,
  Copy,
  History,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_META, CATEGORY_ORDER, PROVIDER_LABEL } from "./labels";
import { PromptEditor, type PromptEditorMode } from "./prompt-editor";
import { GeneratePromptsDialog } from "./generate-prompts-dialog";
import type { Persona } from "../application/generate-prompts";
import {
  duplicatePromptAction,
  setPromptStatusAction,
  testPromptAction,
} from "./actions";

export type PromptListItem = {
  id: string;
  name: string;
  category: PromptCategory;
  status: PromptStatus;
  currentVersion: number;
  preferredProviders: ProviderId[];
  latestContent: string;
  versions: number;
  updatedAt: string;
  lastRunAt: string | null;
  recentMentions: number;
};

type CategoryFilter = "ALL" | PromptCategory;
type StatusFilter = "ALL" | PromptStatus;

export function PromptsList({
  workspaceId,
  projectId,
  projectName,
  prompts,
  initialPersonas,
}: Readonly<{
  workspaceId: string;
  projectId: string;
  projectName: string;
  prompts: PromptListItem[];
  initialPersonas?: Persona[];
}>) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<{ open: boolean; mode: PromptEditorMode }>(
    { open: false, mode: { kind: "create", projectId } },
  );
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prompts.filter((p) => {
      if (category !== "ALL" && p.category !== category) return false;
      if (status !== "ALL" && p.status !== status) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.latestContent.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [prompts, search, category, status]);

  const grouped = useMemo(() => {
    const buckets = new Map<PromptCategory, PromptListItem[]>();
    for (const p of filtered) {
      const list = buckets.get(p.category) ?? [];
      list.push(p);
      buckets.set(p.category, list);
    }
    return CATEGORY_ORDER.filter((c) => buckets.has(c)).map(
      (c) => [c, buckets.get(c)!] as const,
    );
  }, [filtered]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((p) => p.id)),
    );
  };

  const bulkSetStatus = (next: PromptStatus) =>
    start(async () => {
      if (selected.size === 0) return;
      const res = await setPromptStatusAction({
        workspaceId,
        promptIds: [...selected],
        status: next,
      });
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-64 pl-8"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {CATEGORY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_META[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-muted-foreground text-xs">
                {selected.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkSetStatus("ACTIVE")}
                disabled={pending}
              >
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkSetStatus("ARCHIVED")}
                disabled={pending}
              >
                Archive
              </Button>
            </>
          )}
          <GeneratePromptsDialog
            workspaceId={workspaceId}
            projectId={projectId}
            projectName={projectName}
            initialPersonas={initialPersonas}
          />
          <Button
            size="sm"
            onClick={() =>
              setEditor({ open: true, mode: { kind: "create", projectId } })
            }
          >
            <Plus className="h-3.5 w-3.5" /> New prompt
          </Button>
        </div>
      </header>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
            <div className="text-foreground text-base font-medium">
              {prompts.length === 0 ? "No prompts yet" : "No prompts match"}
            </div>
            <p>
              {prompts.length === 0
                ? "Create your first prompt to start tracking AI visibility."
                : "Try a different filter or search query."}
            </p>
            {prompts.length === 0 && (
              <Button
                size="sm"
                className="mt-2"
                onClick={() =>
                  setEditor({ open: true, mode: { kind: "create", projectId } })
                }
              >
                <Plus className="h-3.5 w-3.5" /> New prompt
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-muted-foreground flex items-center gap-2 px-2 text-xs">
            <Checkbox
              checked={selected.size === filtered.length && filtered.length > 0}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
            <span>Select all</span>
          </div>
          <div className="space-y-6">
            {grouped.map(([cat, items]) => (
              <section key={cat} className="space-y-2">
                <header className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: CATEGORY_META[cat].color }}
                  />
                  <h3 className="text-sm font-semibold tracking-tight">
                    {CATEGORY_META[cat].label}
                  </h3>
                  <span className="text-muted-foreground text-xs">
                    {items.length}
                  </span>
                </header>
                <Card>
                  <CardContent className="p-0">
                    {items.map((p, i) => (
                      <PromptRow
                        key={p.id}
                        workspaceId={workspaceId}
                        prompt={p}
                        selected={selected.has(p.id)}
                        onSelect={() => toggle(p.id)}
                        onEdit={() =>
                          setEditor({
                            open: true,
                            mode: {
                              kind: "revise",
                              promptId: p.id,
                              initialName: p.name,
                              initialContent: p.latestContent,
                              initialCategory: p.category,
                              initialProviders: p.preferredProviders,
                            },
                          })
                        }
                        last={i === items.length - 1}
                      />
                    ))}
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>
        </>
      )}

      <PromptEditor
        workspaceId={workspaceId}
        mode={editor.mode}
        open={editor.open}
        onOpenChange={(open) =>
          setEditor((e) => ({ ...e, open }))
        }
      />
    </div>
  );
}

// ----------------------------------------------------------------------

function PromptRow({
  workspaceId,
  prompt,
  selected,
  onSelect,
  onEdit,
  last,
}: Readonly<{
  workspaceId: string;
  prompt: PromptListItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  last: boolean;
}>) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onDuplicate = () =>
    start(async () => {
      const res = await duplicatePromptAction({
        workspaceId,
        promptId: prompt.id,
      });
      if (res.ok) router.refresh();
    });

  const onArchive = () =>
    start(async () => {
      const res = await setPromptStatusAction({
        workspaceId,
        promptIds: [prompt.id],
        status: "ARCHIVED",
      });
      if (res.ok) router.refresh();
    });

  const onActivate = () =>
    start(async () => {
      const res = await setPromptStatusAction({
        workspaceId,
        promptIds: [prompt.id],
        status: "ACTIVE",
      });
      if (res.ok) router.refresh();
    });

  const onTest = () =>
    start(async () => {
      const res = await testPromptAction({
        workspaceId,
        promptId: prompt.id,
        providers: prompt.preferredProviders.length > 0
          ? prompt.preferredProviders
          : ["OPENAI", "ANTHROPIC"],
      });
      if (res.ok) router.refresh();
      else alert(res.error.message);
    });

  return (
    <div
      className={cn(
        "hover:bg-secondary/30 flex items-start gap-3 px-4 py-3 transition-colors",
        !last && "border-border border-b",
        prompt.status === "ARCHIVED" && "opacity-60",
      )}
    >
      <Checkbox checked={selected} onCheckedChange={onSelect} aria-label="Select prompt" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            className="text-foreground truncate text-sm font-medium hover:underline"
            onClick={onEdit}
          >
            {prompt.name}
          </button>
          {prompt.status === "DRAFT" && <Badge variant="outline">Draft</Badge>}
          {prompt.status === "ARCHIVED" && <Badge variant="outline">Archived</Badge>}
          <Badge variant="default" className="text-[10px]">
            v{prompt.currentVersion}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-1 line-clamp-2 font-mono text-xs">
          {prompt.latestContent}
        </div>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-[11px]">
          <span>
            Providers:{" "}
            {prompt.preferredProviders.length === 0
              ? "All available"
              : prompt.preferredProviders.map((p) => PROVIDER_LABEL[p]).join(", ")}
          </span>
          <span>·</span>
          <span>{prompt.versions} version{prompt.versions === 1 ? "" : "s"}</span>
          <span>·</span>
          <span>{prompt.recentMentions} recent mentions</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onTest} disabled={pending}>
          <Play className="h-3.5 w-3.5" /> Test
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate} disabled={pending}>
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <History className="h-3.5 w-3.5" /> Version history (soon)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {prompt.status === "ACTIVE" ? (
              <DropdownMenuItem
                onSelect={onArchive}
                destructive
                disabled={pending}
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={onActivate} disabled={pending}>
                Activate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
