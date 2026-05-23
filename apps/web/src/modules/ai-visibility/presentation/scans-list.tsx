"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PromptCategory,
  ProviderId,
  RunStatus,
  SentimentLabel,
} from "@prisma/client";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_META, PROVIDER_LABEL } from "./labels";

export type RunRow = {
  id: string;
  provider: ProviderId;
  promptName: string;
  promptCategory: PromptCategory;
  promptText: string;
  status: RunStatus;
  cached: boolean;
  brandMentioned: boolean;
  brandRank: number | null;
  sentimentLabel: SentimentLabel | null;
  sentimentScore: number | null;
  latencyMs: number | null;
  createdAt: string;
  response: string | null;
  citations: Array<{ url: string; domain: string; title: string | null; rank: number }>;
  mentions: Array<{
    kind: "BRAND" | "COMPETITOR";
    entity: string;
    rank: number;
    excerpt: string;
  }>;
};

type ProviderFilter = "ALL" | ProviderId;
type SentimentFilter = "ALL" | SentimentLabel | "UNRATED";

const PAGE_SIZE = 20;

export function ScansList({
  workspaceId,
  initial,
  isAnyScanRunning,
}: Readonly<{
  workspaceId: string;
  initial: RunRow[];
  isAnyScanRunning: boolean;
}>) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<ProviderFilter>("ALL");
  const [sentiment, setSentiment] = useState<SentimentFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Streaming refresh — while any scan is RUNNING, refresh every 4s.
  useEffect(() => {
    if (!isAnyScanRunning) return;
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [isAnyScanRunning, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initial.filter((r) => {
      if (provider !== "ALL" && r.provider !== provider) return false;
      if (sentiment === "UNRATED" && r.sentimentLabel !== null) return false;
      if (sentiment !== "ALL" && sentiment !== "UNRATED" && r.sentimentLabel !== sentiment)
        return false;
      if (
        q &&
        !r.promptName.toLowerCase().includes(q) &&
        !(r.response ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [initial, search, provider, sentiment]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Filter className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search prompts or responses…"
            className="w-72 pl-8"
          />
        </div>
        <Select
          value={provider}
          onValueChange={(v) => {
            setPage(1);
            setProvider(v as ProviderFilter);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All providers</SelectItem>
            <SelectItem value="OPENAI">{PROVIDER_LABEL.OPENAI}</SelectItem>
            <SelectItem value="ANTHROPIC">{PROVIDER_LABEL.ANTHROPIC}</SelectItem>
            <SelectItem value="GOOGLE">{PROVIDER_LABEL.GOOGLE}</SelectItem>
            <SelectItem value="PERPLEXITY">{PROVIDER_LABEL.PERPLEXITY}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sentiment}
          onValueChange={(v) => {
            setPage(1);
            setSentiment(v as SentimentFilter);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sentiments</SelectItem>
            <SelectItem value="POSITIVE">Positive</SelectItem>
            <SelectItem value="NEUTRAL">Neutral</SelectItem>
            <SelectItem value="NEGATIVE">Negative</SelectItem>
            <SelectItem value="MIXED">Mixed</SelectItem>
            <SelectItem value="UNRATED">Unrated</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => router.refresh()}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </header>

      {isAnyScanRunning && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="text-muted-foreground text-xs">
              Scan in progress — results stream in as runs complete.
            </div>
            <Badge variant="info">Live</Badge>
          </CardContent>
        </Card>
      )}

      {pageRows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            {initial.length === 0
              ? "No prompt runs yet. Trigger a scan from the AI Visibility page."
              : "No runs match the current filters."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-left text-[11px] uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium w-6" />
                  <th className="px-3 py-2 font-medium">Prompt</th>
                  <th className="px-3 py-2 font-medium">Provider</th>
                  <th className="px-3 py-2 font-medium">Cited</th>
                  <th className="px-3 py-2 font-medium">Rank</th>
                  <th className="px-3 py-2 font-medium">Sentiment</th>
                  <th className="px-3 py-2 font-medium">Latency</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const open = expanded.has(r.id);
                  return (
                    <RowFragment
                      key={r.id}
                      row={r}
                      open={open}
                      onToggle={() => toggle(r.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <footer className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          {filtered.length} run{filtered.length === 1 ? "" : "s"} ·{" "}
          {initial.length - filtered.length} hidden by filters
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="tabular-nums">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </footer>
    </div>
  );
}

// ----------------------------------------------------------------------

function RowFragment({
  row,
  open,
  onToggle,
}: Readonly<{ row: RunRow; open: boolean; onToggle: () => void }>) {
  return (
    <>
      <tr
        className="border-border hover:bg-secondary/30 border-b cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-3 py-3">
          {open ? (
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          )}
        </td>
        <td className="px-3 py-3">
          <div className="text-foreground max-w-md truncate font-medium">
            {row.promptName}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CATEGORY_META[row.promptCategory].color }}
            />
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
              {CATEGORY_META[row.promptCategory].label}
            </span>
            {row.cached && <Badge variant="outline">cached</Badge>}
          </div>
        </td>
        <td className="px-3 py-3 text-xs">{PROVIDER_LABEL[row.provider]}</td>
        <td className="px-3 py-3">
          {row.brandMentioned ? (
            <Badge variant="success">Yes</Badge>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </td>
        <td className="px-3 py-3 tabular-nums">
          {row.brandRank !== null ? `#${row.brandRank}` : "—"}
        </td>
        <td className="px-3 py-3">
          <SentimentBadge label={row.sentimentLabel} score={row.sentimentScore} />
        </td>
        <td className="text-muted-foreground px-3 py-3 text-xs tabular-nums">
          {row.latencyMs !== null ? `${row.latencyMs} ms` : "—"}
        </td>
        <td className="text-muted-foreground px-3 py-3 text-xs">
          {new Date(row.createdAt).toLocaleString()}
        </td>
      </tr>
      {open && <ExpandedRow row={row} />}
    </>
  );
}

function ExpandedRow({ row }: Readonly<{ row: RunRow }>) {
  const competitorMentions = row.mentions.filter((m) => m.kind === "COMPETITOR");
  return (
    <tr className="bg-muted/30 border-border border-b">
      <td colSpan={8} className="p-0">
        <div className="grid gap-6 px-4 py-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Prompt
              </div>
              <pre className="bg-card text-card-foreground border-border mt-1.5 max-h-32 overflow-auto rounded-md border p-3 font-mono text-xs whitespace-pre-wrap">
                {row.promptText}
              </pre>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Response
              </div>
              <pre className="bg-card text-card-foreground border-border mt-1.5 max-h-96 overflow-auto rounded-md border p-3 text-xs whitespace-pre-wrap">
                {row.response ?? "(empty)"}
              </pre>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Citations ({row.citations.length})
              </div>
              <ul className="mt-1.5 space-y-1">
                {row.citations.length === 0 && (
                  <li className="text-muted-foreground text-xs">None extracted</li>
                )}
                {row.citations.slice(0, 8).map((c) => (
                  <li key={c.url} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[10px] tabular-nums w-4">
                      {c.rank}.
                    </span>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-foreground inline-flex items-center gap-1 truncate text-xs underline"
                    >
                      {c.domain}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                Competitor mentions ({competitorMentions.length})
              </div>
              <ul className="mt-1.5 space-y-1">
                {competitorMentions.length === 0 && (
                  <li className="text-muted-foreground text-xs">None detected</li>
                )}
                {competitorMentions.map((m, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[10px] tabular-nums w-4">
                      #{m.rank}
                    </span>
                    <span className="text-foreground text-xs font-medium">
                      {m.entity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function SentimentBadge({
  label,
  score,
}: Readonly<{ label: SentimentLabel | null; score: number | null }>) {
  if (!label) return <span className="text-muted-foreground text-xs">—</span>;
  const variant: Record<SentimentLabel, "success" | "outline" | "destructive" | "warning"> = {
    POSITIVE: "success",
    NEUTRAL: "outline",
    NEGATIVE: "destructive",
    MIXED: "warning",
  };
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={variant[label]}>{label[0] + label.slice(1).toLowerCase()}</Badge>
      {score !== null && (
        <span
          className={cn(
            "tabular-nums text-[10px]",
            score >= 0 ? "text-success" : "text-destructive",
          )}
        >
          {score > 0 ? "+" : ""}
          {score.toFixed(2)}
        </span>
      )}
    </div>
  );
}
