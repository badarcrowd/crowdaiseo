"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  Globe,
  Layers,
  Link2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createReportAction } from "./actions";

type Project = { id: string; name: string };

const TEMPLATES = [
  {
    id: "EXECUTIVE_SUMMARY" as const,
    label: "Executive Summary",
    description: "High-level KPIs, score trend, top recommendations.",
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    id: "COMPETITOR_ANALYSIS" as const,
    label: "Competitor Analysis",
    description: "Share of voice, mention gap, citation authority comparison.",
    icon: BarChart3,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    id: "GEO_OPTIMIZATION" as const,
    label: "GEO Optimization",
    description: "Prioritized content, technical, and authority actions.",
    icon: Globe,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
  },
  {
    id: "AI_VISIBILITY_DEEP_DIVE" as const,
    label: "AI Visibility Deep Dive",
    description: "Per-provider breakdown, prompt performance, sentiment.",
    icon: Layers,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    id: "CITATION_AUTHORITY" as const,
    label: "Citation Authority",
    description: "Domain authority, citation sources, opportunity gaps.",
    icon: Link2,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

export function CreateReportForm({
  workspaceId,
  projects,
  basePath,
}: Readonly<{
  workspaceId: string;
  projects: Project[];
  basePath: string;
}>) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [template, setTemplate] = useState<TemplateId>("EXECUTIVE_SUMMARY");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [createShare, setCreateShare] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedTpl = TEMPLATES.find((t) => t.id === template)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Report title is required.");
      return;
    }
    setError(null);
    start(async () => {
      const emailRecipients = recipients
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await createReportAction({
        workspaceId,
        template,
        title: title.trim(),
        projectId: projectId || undefined,
        parameters: {
          rangeStart: rangeStart || undefined,
          rangeEnd: rangeEnd || undefined,
          includeAiSummary,
        },
        emailRecipients: emailRecipients.length ? emailRecipients : undefined,
        createShare,
      });
      if (res.ok && res.data.ok) {
        router.push(`${basePath}/reports`);
        router.refresh();
      } else {
        setError(
          !res.ok
            ? res.error.message
            : "error" in res.data
              ? String(res.data.error)
              : "Failed to create report.",
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Template selector */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Template</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setTemplate(tpl.id)}
              className={`group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
                template === tpl.id
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${tpl.bg}`}
              >
                <tpl.icon className={`h-4 w-4 ${tpl.color}`} />
              </div>
              <div>
                <div className="text-sm font-medium">{tpl.label}</div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {tpl.description}
                </div>
              </div>
              {template === tpl.id && (
                <span className="bg-foreground text-background absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Report title */}
      <div className="space-y-1.5">
        <label htmlFor="report-title" className="text-sm font-medium">
          Report title
        </label>
        <Input
          id="report-title"
          placeholder={`${selectedTpl.label} — ${new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
      </div>

      {/* Project + date range */}
      <div className="grid gap-4 sm:grid-cols-3">
        {projects.length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="project" className="text-sm font-medium">
              Project
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="range-start" className="text-sm font-medium">
            From
          </label>
          <Input
            id="range-start"
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="range-end" className="text-sm font-medium">
            To
          </label>
          <Input
            id="range-end"
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
          />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Options</p>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={includeAiSummary}
            onChange={(e) => setIncludeAiSummary(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded"
          />
          <div>
            <div className="text-sm font-medium">AI executive summary</div>
            <div className="text-muted-foreground text-xs">
              Generate a 2-paragraph narrative using your configured AI
              provider.
            </div>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={createShare}
            onChange={(e) => setCreateShare(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded"
          />
          <div>
            <div className="text-sm font-medium">Create shareable link</div>
            <div className="text-muted-foreground text-xs">
              Generate a public HMAC-signed URL once the PDF is ready.
            </div>
          </div>
        </label>
      </div>

      {/* Email delivery */}
      <div className="space-y-1.5">
        <label htmlFor="recipients" className="text-sm font-medium">
          Email recipients{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="recipients"
          placeholder="alice@example.com, bob@example.com"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Comma or space separated. PDF will be attached once generated.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Queuing…" : "Generate report"}
        </Button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-sm"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
