"use client";

import { useTransition, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createReportScheduleAction } from "./actions";

type Project = { id: string; name: string };

const CRON_PRESETS = [
  { label: "Every Monday at 9 AM", value: "weekly@1:09:00" },
  { label: "Daily at midnight", value: "daily@00:00" },
  { label: "Every 6 hours", value: "every 6h" },
  { label: "1st of each month at 8 AM", value: "monthly@08:00" },
  { label: "Custom…", value: "custom" },
] as const;

const TEMPLATE_OPTIONS = [
  { value: "EXECUTIVE_SUMMARY", label: "Executive Summary" },
  { value: "COMPETITOR_ANALYSIS", label: "Competitor Analysis" },
  { value: "GEO_OPTIMIZATION", label: "GEO Optimization" },
  { value: "AI_VISIBILITY_DEEP_DIVE", label: "AI Visibility Deep Dive" },
  { value: "CITATION_AUTHORITY", label: "Citation Authority" },
] as const;

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

type Props = {
  workspaceId: string;
  projects: Project[];
  onSuccess?: () => void;
};

export function CreateScheduleForm({ workspaceId, projects, onSuccess }: Props) {
  const [pending, start] = useTransition();

  const [template, setTemplate] = useState("EXECUTIVE_SUMMARY");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [cronPreset, setCronPreset] = useState<string>(CRON_PRESETS[0].value);
  const [customCron, setCustomCron] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [recipients, setRecipients] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const effectiveCron = cronPreset === "custom" ? customCron : cronPreset;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Schedule title is required.");
      return;
    }
    if (!effectiveCron.trim()) {
      setError("Cron expression is required.");
      return;
    }
    setError(null);
    start(async () => {
      const emailRecipients = recipients
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await createReportScheduleAction({
        workspaceId,
        template,
        title: title.trim(),
        projectId: projectId || undefined,
        parameters: {},
        cron: effectiveCron.trim(),
        timezone,
        recipients: emailRecipients,
      });
      if (res.ok && res.data.ok) {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError(
          !res.ok
            ? res.error.message
            : "Failed to create schedule.",
        );
      }
    });
  };

  if (success) {
    return (
      <div className="rounded-xl border bg-green-500/5 p-6 text-center">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          Schedule created successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input
            placeholder="Weekly Executive Report"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Template</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Project</label>
          <select
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Frequency</label>
          <select
            value={cronPreset}
            onChange={(e) => setCronPreset(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CRON_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {cronPreset === "custom" && (
            <Input
              placeholder="e.g. daily@08:00 or every 12h"
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              className="mt-2"
            />
          )}
          <p className="text-muted-foreground text-xs">
            Supported: <code>daily@HH:MM</code>, <code>weekly@D:HH:MM</code>,{" "}
            <code>every Nh/Nm</code>
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Email recipients{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          placeholder="alice@example.com, bob@example.com"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Creating…" : "Create schedule"}
        </Button>
      </div>
    </form>
  );
}
