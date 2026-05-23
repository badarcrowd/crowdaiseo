"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Check,
  ChevronRight,
  Globe,
  Loader2,
  Plus,
  Sparkles,
  Users,
  X,
  Zap,
  ShieldCheck,
  DollarSign,
  Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_META, PROVIDER_LABEL } from "./labels";
import { generatePromptsAction, saveGeneratedPromptsAction } from "./actions";
import type { GeneratedPrompt, GeoStrategy, Persona } from "../application/generate-prompts";

// ─── Types ────────────────────────────────────────────────────────────────

type Provider = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "PERPLEXITY";

type Step = "configure" | "generating" | "preview";

type PersonaWithId = Persona & { _id: string };

let _uid = 0;
const uid = () => String(++_uid);

const addId = (p: Persona): PersonaWithId => ({ ...p, _id: uid() });

// ─── Strategy config ──────────────────────────────────────────────────────

type StrategyConfig = {
  id: GeoStrategy;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const STRATEGIES: StrategyConfig[] = [
  {
    id: "PERSONA",
    label: "Persona × Journey",
    description: "Buyer-journey queries tailored to each persona — awareness, consideration, decision",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "COMPETITOR",
    label: "Competitor comparison",
    description: "Brand-vs-competitor queries that surface your brand when users compare options",
    icon: <Swords className="h-4 w-4" />,
  },
  {
    id: "GEO",
    label: "GEO-targeted",
    description: "Region and language-scoped queries for local AI visibility",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    id: "BRAND",
    label: "Brand SERP",
    description: "Protect and amplify direct brand discovery — reviews, features, trust signals",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    id: "TRANSACTIONAL",
    label: "Transactional",
    description: "Late-stage purchase intent: pricing, demos, trials, onboarding",
    icon: <DollarSign className="h-4 w-4" />,
  },
];

const PROVIDER_OPTIONS: { id: Provider; label: string; badge: string }[] = [
  { id: "OPENAI", label: "ChatGPT / GPT-4o", badge: "OpenAI" },
  { id: "ANTHROPIC", label: "Claude Sonnet", badge: "Anthropic" },
  { id: "GOOGLE", label: "Gemini 2.5 Pro", badge: "Google" },
  { id: "PERPLEXITY", label: "Sonar Pro", badge: "Perplexity" },
];

const DEFAULT_PERSONAS: Persona[] = [
  {
    name: "Evaluation buyer",
    role: "Commercial decision maker",
    intent: "Compare vendors and shortlist the best option before purchase",
  },
  {
    name: "Technical validator",
    role: "Technical evaluator",
    intent: "Validate capabilities, integrations, and implementation risk",
  },
  {
    name: "Problem researcher",
    role: "Category researcher",
    intent: "Understand available solutions before naming a specific vendor",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────

export function PersonaCard({
  persona,
  canRemove,
  onRemove,
  onChange,
}: Readonly<{
  persona: PersonaWithId;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (updated: Persona) => void;
}>) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <div className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{persona.name}</div>
          <div className="text-muted-foreground truncate text-xs">{persona.role}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
          >
            edit
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Input
        value={persona.name}
        onChange={(e) => onChange({ ...persona, name: e.target.value })}
        placeholder="Persona name"
        className="h-7 text-sm"
      />
      <Input
        value={persona.role}
        onChange={(e) => onChange({ ...persona, role: e.target.value })}
        placeholder="Role / title"
        className="h-7 text-sm"
      />
      <Textarea
        value={persona.intent}
        onChange={(e) => onChange({ ...persona, intent: e.target.value })}
        placeholder="Search intent / goal"
        className="h-14 text-sm"
      />
      <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-6 text-xs">
        Done
      </Button>
    </div>
  );
}

export function PreviewPromptRow({
  prompt,
  selected,
  onToggle,
}: Readonly<{
  prompt: GeneratedPrompt;
  selected: boolean;
  onToggle: () => void;
}>) {
  const meta = CATEGORY_META[prompt.category];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected ? "border-primary/50 bg-primary/5" : "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
            selected ? "border-primary bg-primary" : "border-border",
          )}
        >
          {selected && <Check className="h-2.5 w-2.5 text-white" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{prompt.name}</span>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={{ color: meta.color, borderColor: meta.color + "50" }}
            >
              {meta.label}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {prompt.persona}
            </Badge>
          </div>
          <p className="text-sm text-foreground/80 leading-snug">{prompt.content}</p>
          <p className="text-xs text-muted-foreground italic">{prompt.rationale}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────

interface Props {
  workspaceId: string;
  projectId: string;
  projectName: string;
  initialPersonas?: Persona[];
}

export function GeneratePromptsDialog({
  workspaceId,
  projectId,
  projectName,
  initialPersonas,
}: Readonly<Props>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("configure");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Configure state
  const [selectedStrategies, setSelectedStrategies] = useState<Set<GeoStrategy>>(
    new Set(["PERSONA", "COMPETITOR"]),
  );
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null); // null = auto
  const [personas, setPersonas] = useState<PersonaWithId[]>(
    (initialPersonas ?? DEFAULT_PERSONAS).map(addId),
  );

  // Preview state
  const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
  const [usedProvider, setUsedProvider] = useState<string | null>(null);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set());

  const resetDialog = () => {
    setStep("configure");
    setError(null);
    setGeneratedPrompts([]);
    setSelectedPrompts(new Set());
    setUsedProvider(null);
  };

  const toggleStrategy = (id: GeoStrategy) =>
    setSelectedStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const addPersona = () =>
    setPersonas((prev) => [
      ...prev,
      addId({ name: "New persona", role: "Role", intent: "Search intent" }),
    ]);

  const removePersona = (id: string) =>
    setPersonas((prev) => prev.filter((p) => p._id !== id));

  const updatePersona = (id: string, updated: Persona) =>
    setPersonas((prev) => prev.map((p) => (p._id === id ? { ...updated, _id: id } : p)));

  const generate = () => {
    setError(null);
    setStep("generating");
    startTransition(async () => {
      const res = await generatePromptsAction({
        workspaceId,
        projectId,
        provider: selectedProvider,
        strategies: [...selectedStrategies],
        personas: personas.map(({ _id: _ignored, ...p }) => p),
      });
      if (!res.ok) {
        setError(res.error.message);
        setStep("configure");
        return;
      }
      setGeneratedPrompts(res.data.prompts);
      setUsedProvider(
        PROVIDER_LABEL[res.data.provider as keyof typeof PROVIDER_LABEL] ?? res.data.provider,
      );
      setSelectedPrompts(new Set(res.data.prompts.map((_, i) => i)));
      setStep("preview");
    });
  };

  const save = () => {
    const toSave = generatedPrompts.filter((_, i) => selectedPrompts.has(i));
    if (toSave.length === 0) return;
    startTransition(async () => {
      const res = await saveGeneratedPromptsAction({
        workspaceId,
        projectId,
        prompts: toSave,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      resetDialog();
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sparkles className="h-3.5 w-3.5" />
          Generate with AI
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="text-primary h-4 w-4" />
            Generate GEO Prompts
            {step === "preview" && usedProvider && (
              <Badge variant="secondary" className="text-xs">
                via {usedProvider}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "configure" &&
              `AI-crafted visibility queries for ${projectName} across buyer stages, personas, and LLMs.`}
            {step === "generating" && "Calling the LLM to generate optimised queries…"}
            {step === "preview" &&
              `${generatedPrompts.length} queries generated — select the ones to save.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* ── Configure ── */}
        {step === "configure" && (
          <div className="space-y-5">
            {/* Strategies */}
            <div>
              <p className="text-sm font-medium mb-2">Prompt strategies</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STRATEGIES.map((s) => {
                  const active = selectedStrategies.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStrategy(s.id)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
                        active
                          ? "border-primary/50 bg-primary/5"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          active ? "border-primary bg-primary" : "border-border",
                        )}
                      >
                        {active && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {s.icon}
                          {s.label}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                          {s.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LLM provider */}
            <div>
              <p className="text-sm font-medium mb-2">LLM for generation</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className={cn(
                    "rounded-md border px-3 py-1 text-sm transition-colors",
                    selectedProvider === null
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted/40",
                  )}
                >
                  <Zap className="mr-1 inline h-3 w-3" />
                  Auto (best available)
                </button>
                {PROVIDER_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.id)}
                    className={cn(
                      "rounded-md border px-3 py-1 text-sm transition-colors",
                      selectedProvider === p.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted/40",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs">
                Different LLMs have different industry knowledge. Try several for broader coverage.
              </p>
            </div>

            {/* Personas */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Personas</p>
                <button
                  type="button"
                  onClick={addPersona}
                  disabled={personas.length >= 6}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" /> Add persona
                </button>
              </div>
              <div className="space-y-2">
                {personas.map((persona) => (
                  <PersonaCard
                    key={persona._id}
                    canRemove={personas.length > 1}
                    persona={persona}
                    onRemove={() => removePersona(persona._id)}
                    onChange={(updated) => updatePersona(persona._id, updated)}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={generate} disabled={isPending}>
                <ChevronRight className="h-4 w-4" />
                Generate queries
              </Button>
            </div>
          </div>
        )}

        {/* ── Generating ── */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">
              Asking{" "}
              {selectedProvider
                ? PROVIDER_LABEL[selectedProvider]
                : "the best available LLM"}{" "}
              for GEO-quality queries…
            </p>
          </div>
        )}

        {/* ── Preview ── */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedPrompts.size} of {generatedPrompts.length} selected
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPrompts(new Set(generatedPrompts.map((_, i) => i)))
                  }
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPrompts(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {generatedPrompts.map((prompt, i) => {
                const key = `${prompt.name}-${String(i)}`;
                return (
                  <PreviewPromptRow
                    key={key}
                    prompt={prompt}
                    selected={selectedPrompts.has(i)}
                    onToggle={() => {
                      setSelectedPrompts((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      });
                    }}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("configure");
                  setGeneratedPrompts([]);
                }}
              >
                ← Back
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={save}
                  disabled={selectedPrompts.size === 0 || isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save {selectedPrompts.size} prompt
                  {selectedPrompts.size === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
