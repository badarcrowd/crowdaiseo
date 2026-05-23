"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils/cn";
import { COUNTRIES, LANGUAGES } from "./locales";
import { useWizardState } from "./wizard-state";
import { createProjectAction } from "./actions";
import { discoverProjectSuggestions } from "./discover-action";
import type { DiscoverSuggestions } from "./discover-action";

const STEPS = [
  { key: "basics", label: "Basics", description: "Name & website" },
  { key: "locale", label: "Locale", description: "Country & language" },
  { key: "keywords", label: "Keywords", description: "What you track" },
  { key: "competitors", label: "Competitors", description: "Who you compete with" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const domainRe = /^([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/i;

export function ProjectWizard({
  workspaceId,
  trigger,
}: Readonly<{ workspaceId: string; trigger: React.ReactNode }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const { state, setState, reset, hydrated } = useWizardState(workspaceId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoverProvider, setDiscoverProvider] = useState<string | null>(null);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const handleDiscover = async () => {
    setDiscovering(true);
    setError(null);
    const res = await discoverProjectSuggestions({
      name: state.name.trim(),
      domain: state.domain,
      description: state.description.trim() || undefined,
      country: state.country || undefined,
      language: state.language || undefined,
      keywords: state.keywords,
    });
    setDiscovering(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    const suggestions: DiscoverSuggestions = res.data;
    setDiscoverProvider(suggestions.provider);
    // Merge keywords (dedupe)
    const existingKeywords = new Set(state.keywords.map((k) => k.toLowerCase()));
    const newKeywords = suggestions.keywords.filter(
      (k) => !existingKeywords.has(k.toLowerCase()),
    );
    // Merge competitors (dedupe by name)
    const existingNames = new Set(
      state.competitors.map((c) => c.name.toLowerCase()),
    );
    const newCompetitors = suggestions.competitors.filter(
      (c) => !existingNames.has(c.name.toLowerCase()),
    );
    setState((s) => ({
      ...s,
      keywords: [...s.keywords, ...newKeywords],
      competitors: [
        ...s.competitors,
        ...newCompetitors.map((c) => ({ name: c.name, domain: c.domain })),
      ],
    }));
  };

  const validateStep = (key: StepKey): string | null => {
    if (key === "basics") {
      if (state.name.trim().length < 1) return "Enter a project name.";
      const clean = state.domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "");
      if (!domainRe.test(clean)) return "Enter a valid domain (e.g. example.com).";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step.key);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const back = () => {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createProjectAction({
        workspaceId,
        name: state.name.trim(),
        domain: state.domain,
        description: state.description.trim() || undefined,
        country: state.country || undefined,
        language: state.language || undefined,
        keywords: state.keywords,
        competitors: state.competitors.filter((c) => c.name.trim().length > 0),
      });
      if (res.ok) {
        reset();
        setOpen(false);
        setStepIdx(0);
        router.refresh();
      } else {
        setError(res.error.message);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <DialogContent size="lg" className="p-0">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Set up tracking for a website. You can edit these later.
          </DialogDescription>
        </DialogHeader>

        <Stepper currentIdx={stepIdx} />

        <DialogBody className="space-y-5">
          {!hydrated ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              Loading…
            </div>
          ) : (
            <>
              {step.key === "basics" && (
                <BasicsStep
                  name={state.name}
                  domain={state.domain}
                  description={state.description}
                  onChange={(patch) =>
                    setState((s) => ({ ...s, ...patch }))
                  }
                />
              )}
              {step.key === "locale" && (
                <LocaleStep
                  country={state.country}
                  language={state.language}
                  onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
                />
              )}
              {step.key === "keywords" && (
                <KeywordsStep
                  keywords={state.keywords}
                  onChange={(keywords) =>
                    setState((s) => ({ ...s, keywords }))
                  }
                  onDiscover={handleDiscover}
                  discovering={discovering}
                  discoveredProvider={discoverProvider}
                  domainEntered={!!state.domain}
                />
              )}
              {step.key === "competitors" && (
                <CompetitorsStep
                  competitors={state.competitors}
                  onChange={(competitors) =>
                    setState((s) => ({ ...s, competitors }))
                  }
                  onDiscover={handleDiscover}
                  discovering={discovering}
                  discoveredProvider={discoverProvider}
                  domainEntered={!!state.domain}
                />
              )}
              {error && (
                <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={back}
            disabled={stepIdx === 0 || pending}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Step {stepIdx + 1} / {STEPS.length}
            </span>
            {isLast ? (
              <Button onClick={submit} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Create project
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={next} disabled={pending}>
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------
// Stepper
// ----------------------------------------------------------------------

function Stepper({ currentIdx }: Readonly<{ currentIdx: number }>) {
  return (
    <div className="border-border bg-muted/30 border-b px-6 py-3">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li
              key={s.key}
              className="flex flex-1 items-center gap-2 last:flex-none"
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                  done && "bg-foreground text-background",
                  active &&
                    "border-foreground bg-background text-foreground border-2",
                  !done && !active &&
                    "border-border bg-background text-muted-foreground border",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate text-xs font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    done ? "bg-foreground" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ----------------------------------------------------------------------
// Steps
// ----------------------------------------------------------------------

function BasicsStep({
  name,
  domain,
  description,
  onChange,
}: Readonly<{
  name: string;
  domain: string;
  description: string;
  onChange: (patch: Partial<{ name: string; domain: string; description: string }>) => void;
}>) {
  return (
    <div className="space-y-4">
      <Field label="Project name" required>
        <Input
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Acme Marketing Site"
          autoFocus
        />
      </Field>
      <Field
        label="Website domain"
        required
        hint="Just the domain — no protocol or path."
      >
        <Input
          value={domain}
          onChange={(e) => onChange({ domain: e.target.value })}
          placeholder="acme.com"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Field label="Description" hint="Internal note — visible to your team only.">
        <Textarea
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What is this project tracking?"
          rows={3}
        />
      </Field>
    </div>
  );
}

function LocaleStep({
  country,
  language,
  onChange,
}: Readonly<{
  country: string;
  language: string;
  onChange: (patch: Partial<{ country: string; language: string }>) => void;
}>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Target country"
        hint="Primary market for ranking & AI tracking."
      >
        <Select value={country} onValueChange={(v) => onChange({ country: v })}>
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
      <Field label="Language" hint="Primary content language.">
        <Select value={language} onValueChange={(v) => onChange({ language: v })}>
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
  );
}

// ----------------------------------------------------------------------
// Shared discovery button label (avoids nested ternaries)
// ----------------------------------------------------------------------

function DiscoverButtonLabel({
  discovering,
  rescan,
}: Readonly<{ discovering: boolean; rescan: boolean }>) {
  if (discovering) {
    return (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning…
      </>
    );
  }
  if (rescan) {
    return (
      <>
        <Sparkles className="h-3.5 w-3.5" /> Re-scan
      </>
    );
  }
  return (
    <>
      <Sparkles className="h-3.5 w-3.5" /> Scan with AI
    </>
  );
}

function KeywordsStep({
  keywords,
  onChange,
  onDiscover,
  discovering,
  discoveredProvider,
  domainEntered,
}: Readonly<{
  keywords: string[];
  onChange: (next: string[]) => void;
  onDiscover: () => Promise<void>;
  discovering: boolean;
  discoveredProvider: string | null;
  domainEntered: boolean;
}>) {
  return (
    <div className="space-y-4">
      <div className="bg-muted/50 border-border flex flex-col gap-2.5 rounded-lg border p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-foreground text-sm font-medium">
            Discover with AI
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {discoveredProvider
              ? `Powered by ${discoveredProvider} — keywords & competitors populated below.`
              : "Let AI analyse your domain and suggest relevant keywords and competitors."}
          </div>
        </div>
        <Button
          type="button"
          variant={discoveredProvider ? "outline" : "default"}
          size="sm"
          onClick={onDiscover}
          disabled={discovering || !domainEntered}
          className="shrink-0"
        >
          <DiscoverButtonLabel discovering={discovering} rescan={!!discoveredProvider} />
        </Button>
      </div>
      <Field
        label="Keywords"
        hint="Press Enter or comma to add. AI suggestions appear above."
      >
        <TagInput
          values={keywords}
          onChange={onChange}
          max={200}
          placeholder="e.g. ai seo platform"
        />
      </Field>
      {keywords.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            {keywords.length} keyword{keywords.length === 1 ? "" : "s"} added
            {keywords.length < 200 ? ` · up to ${200 - keywords.length} more` : ""}
          </p>
          {discoveredProvider && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Sparkles className="h-2.5 w-2.5" />
              AI-assisted
            </Badge>
          )}
        </div>
      )}
      {keywords.length === 0 && !discovering && (
        <p className="text-muted-foreground text-xs">
          Add up to 200 keywords. You can bulk-import more later.
        </p>
      )}
    </div>
  );
}

function CompetitorsStep({
  competitors,
  onChange,
  onDiscover,
  discovering,
  discoveredProvider,
  domainEntered,
}: Readonly<{
  competitors: Array<{ name: string; domain?: string }>;
  onChange: (next: Array<{ name: string; domain?: string }>) => void;
  onDiscover: () => Promise<void>;
  discovering: boolean;
  discoveredProvider: string | null;
  domainEntered: boolean;
}>) {
  return (
    <div className="space-y-3">
      <div className="bg-muted/50 border-border flex flex-col gap-2.5 rounded-lg border p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-foreground text-sm font-medium">
            Discover with AI
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {discoveredProvider
              ? `Powered by ${discoveredProvider} — competitors pre-filled below. Edit freely.`
              : "AI identifies real brands a buyer would evaluate alongside yours."}
          </div>
        </div>
        <Button
          type="button"
          variant={discoveredProvider ? "outline" : "default"}
          size="sm"
          onClick={onDiscover}
          disabled={discovering || !domainEntered}
          className="shrink-0"
        >
          <DiscoverButtonLabel discovering={discovering} rescan={!!discoveredProvider} />
        </Button>
      </div>
      <Field
        label="Competitors"
        hint="Brands tracked alongside yours in AI responses."
      >
        <div />
      </Field>
      <div className="space-y-2">
        {competitors.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={c.name}
              onChange={(e) => {
                const next = [...competitors];
                next[i] = { ...next[i], name: e.target.value };
                onChange(next);
              }}
              placeholder="Competitor name"
              className="flex-1"
            />
            <Input
              value={c.domain ?? ""}
              onChange={(e) => {
                const next = [...competitors];
                next[i] = { ...next[i], domain: e.target.value };
                onChange(next);
              }}
              placeholder="competitor.com"
              className="flex-1"
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(competitors.filter((_, idx) => idx !== i))}
              aria-label="Remove competitor"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange([...competitors, { name: "", domain: "" }])}
            disabled={competitors.length >= 50}
          >
            <Plus className="h-3.5 w-3.5" /> Add manually
          </Button>
          {discoveredProvider && competitors.length > 0 && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Sparkles className="h-2.5 w-2.5" />
              AI-assisted
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
