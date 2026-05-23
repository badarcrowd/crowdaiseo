"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  addCompetitorAction,
  removeCompetitorAction,
  bootstrapPromptsAction,
  startVisibilityScanAction,
} from "./actions";

export type SetupCompetitor = {
  id: string;
  name: string;
  domain: string | null;
};

type Props = {
  workspaceId: string;
  workspaceSlug: string;
  projectId: string;
  projectName: string;
  competitors: SetupCompetitor[];
  promptCount: number;
  hasScans: boolean;
};

function scanReadyMessage(
  ready: boolean,
  competitorCount: number,
): string {
  if (ready) return "Everything is ready — start your AI visibility scan.";
  if (competitorCount === 0) {
    return "Add at least 1 competitor, then generate queries to start scanning.";
  }
  return "Generate queries with AI to start scanning.";
}

function pluralise(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function queryLabel(n: number) {
  return `${n} quer${n === 1 ? "y" : "ies"}`;
}

function CompetitorRow({
  competitor,
  removingId,
  onRemove,
  isLast,
}: Readonly<{
  competitor: SetupCompetitor;
  removingId: string | null;
  onRemove: (id: string) => void;
  isLast: boolean;
}>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2",
        !isLast && "border-border border-b",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{competitor.name}</span>
        {competitor.domain && (
          <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            <Globe className="h-2.5 w-2.5 shrink-0" />
            {competitor.domain}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => onRemove(competitor.id)}
        disabled={removingId === competitor.id}
        aria-label={`Remove ${competitor.name}`}
      >
        {removingId === competitor.id ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

export function ScanSetupPanel({
  workspaceId,
  workspaceSlug,
  projectId,
  projectName,
  competitors: initialCompetitors,
  promptCount: initialPromptCount,
  hasScans,
}: Readonly<Props>) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [promptCount, setPromptCount] = useState(initialPromptCount);
  const [collapsed, setCollapsed] = useState(
    hasScans && initialPromptCount > 0,
  );
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addPending, startAdd] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bootstrapPending, startBootstrap] = useTransition();
  const [scanPending, startScan] = useTransition();

  const ready = competitors.length > 0 && promptCount > 0;

  const handleAdd = () => {
    if (!newName.trim()) return;
    startAdd(async () => {
      setError(null);
      const res = await addCompetitorAction({
        workspaceId,
        projectId,
        name: newName.trim(),
        domain: newDomain.trim() || undefined,
      });
      if (res.ok) {
        setCompetitors((prev) => [...prev, res.data]);
        setNewName("");
        setNewDomain("");
      } else {
        setError(res.error.message);
      }
    });
  };

  const handleRemoveDone = (id: string, ok: boolean, msg?: string) => {
    if (ok) {
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
    } else {
      setError(msg ?? "Failed to remove competitor");
    }
    setRemovingId(null);
  };

  const handleRemove = (id: string) => {
    setRemovingId(id);
    removeCompetitorAction({ workspaceId, competitorId: id, projectId })
      .then((res) =>
        handleRemoveDone(id, res.ok, res.ok ? undefined : res.error.message),
      )
      .catch(() => handleRemoveDone(id, false));
  };

  const handleBootstrap = () => {
    startBootstrap(async () => {
      setError(null);
      const res = await bootstrapPromptsAction({ workspaceId, projectId });
      if (res.ok) {
        setPromptCount(res.data.promptCount);
        if (res.data.createdCompetitors > 0) router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  };

  const handleScan = () => {
    startScan(async () => {
      setError(null);
      const res = await startVisibilityScanAction({ workspaceId, projectId });
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  };

  const handleNameKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const handleDomainKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  if (collapsed) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <span className="text-sm font-medium">{projectName}</span>
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Users className="h-2.5 w-2.5" />
            {pluralise(competitors.length, "competitor")}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <MessageSquare className="h-2.5 w-2.5" />
            {queryLabel(promptCount)}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCollapsed(false)}
            >
              <ChevronDown className="h-3.5 w-3.5" /> Edit setup
            </Button>
            <Button
              size="sm"
              onClick={handleScan}
              disabled={scanPending || !ready}
            >
              <Play className="h-3.5 w-3.5" />
              {scanPending ? "Starting…" : "Run scan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            AI Visibility setup — {projectName}
          </CardTitle>
          {hasScans && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(true)}
            >
              <ChevronUp className="h-3.5 w-3.5" /> Collapse
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Review competitors and citing queries before running your scan.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Step 1: Competitors ── */}
        <CompetitorsSection
          competitors={competitors}
          removingId={removingId}
          newName={newName}
          newDomain={newDomain}
          addPending={addPending}
          onNameChange={setNewName}
          onDomainChange={setNewDomain}
          onNameKey={handleNameKey}
          onDomainKey={handleDomainKey}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />

        {/* ── Step 2: Citing queries ── */}
        <QueriesSection
          promptCount={promptCount}
          workspaceSlug={workspaceSlug}
          bootstrapPending={bootstrapPending}
          onBootstrap={handleBootstrap}
        />

        {/* ── Error banner ── */}
        {error && (
          <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Run scan CTA ── */}
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-xs">
            {scanReadyMessage(ready, competitors.length)}
          </p>
          <Button
            onClick={handleScan}
            disabled={scanPending || !ready}
            size="sm"
          >
            {scanPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Run scan
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sub-sections extracted to keep ScanSetupPanel under complexity limit ──

function CompetitorsSection({
  competitors,
  removingId,
  newName,
  newDomain,
  addPending,
  onNameChange,
  onDomainChange,
  onNameKey,
  onDomainKey,
  onAdd,
  onRemove,
}: Readonly<{
  competitors: SetupCompetitor[];
  removingId: string | null;
  newName: string;
  newDomain: string;
  addPending: boolean;
  onNameChange: (v: string) => void;
  onDomainChange: (v: string) => void;
  onNameKey: (e: React.KeyboardEvent) => void;
  onDomainKey: (e: React.KeyboardEvent) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}>) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">Competitors</span>
        <Badge
          variant={competitors.length > 0 ? "default" : "destructive"}
          className="text-[10px]"
        >
          {competitors.length > 0
            ? `${competitors.length} tracked`
            : "None added"}
        </Badge>
        <span className="text-muted-foreground ml-auto text-xs">
          AI will measure brand mentions vs these competitors
        </span>
      </div>

      {competitors.length > 0 && (
        <div className="border-border rounded-md border">
          {competitors.map((c, i) => (
            <CompetitorRow
              key={c.id}
              competitor={c}
              removingId={removingId}
              onRemove={onRemove}
              isLast={i === competitors.length - 1}
            />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={onNameKey}
          placeholder="Competitor name"
          className="flex-1"
          disabled={addPending}
        />
        <Input
          value={newDomain}
          onChange={(e) => onDomainChange(e.target.value)}
          onKeyDown={onDomainKey}
          placeholder="competitor.com (optional)"
          className="flex-1"
          autoComplete="off"
          spellCheck={false}
          disabled={addPending}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={addPending || !newName.trim()}
          className="shrink-0"
        >
          {addPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </div>
    </div>
  );
}

function QueriesSection({
  promptCount,
  workspaceSlug,
  bootstrapPending,
  onBootstrap,
}: Readonly<{
  promptCount: number;
  workspaceSlug: string;
  bootstrapPending: boolean;
  onBootstrap: () => void;
}>) {
  const hasPrompts = promptCount > 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <MessageSquare className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">Citing queries</span>
        <Badge
          variant={hasPrompts ? "default" : "secondary"}
          className="text-[10px]"
        >
          {hasPrompts ? queryLabel(promptCount) : "Not generated"}
        </Badge>
        <Link
          href={`/app/w/${workspaceSlug}/ai-visibility/prompts`}
          className="text-muted-foreground hover:text-foreground ml-auto text-xs underline underline-offset-2"
        >
          Manage in editor →
        </Link>
      </div>

      <p className="text-muted-foreground text-xs">
        Queries simulate how real buyers search for your category across
        ChatGPT, Perplexity, Claude and Gemini — generated from buyer personas
        × intent categories (commercial, comparison, informational,
        transactional).
      </p>

      {hasPrompts ? (
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          {promptCount} queries ready across COMMERCIAL, COMPARISON,
          INFORMATIONAL and TRANSACTIONAL.
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onBootstrap}
          disabled={bootstrapPending}
        >
          {bootstrapPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating
              queries…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Generate queries with AI
            </>
          )}
        </Button>
      )}
    </div>
  );
}

