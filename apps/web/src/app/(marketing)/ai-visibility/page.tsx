import Link from "next/link";
import {
  BarChart2,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Eye,
  Zap,
  MessageSquare,
  Activity,
  Search,
  AlertCircle,
} from "lucide-react";
import { FadeUp, FadeIn, ScaleIn, StaggerContainer, StaggerItem } from "@/components/marketing/animate";

export const metadata = {
  title: "AI Visibility — AIV",
  description:
    "Track and score your brand's visibility across ChatGPT, Claude, Gemini, Perplexity, and every major AI engine. Real-time scanning, explainable scoring.",
};

const PROVIDERS = [
  { name: "ChatGPT", color: "#10b981", mentions: 284, score: 84, trend: "+12%" },
  { name: "Claude", color: "#f97316", mentions: 197, score: 71, trend: "+5%" },
  { name: "Gemini", color: "#3b82f6", mentions: 156, score: 62, trend: "-2%" },
  { name: "Perplexity", color: "#8b5cf6", mentions: 231, score: 79, trend: "+18%" },
  { name: "Grok", color: "#94a3b8", mentions: 89, score: 55, trend: "+3%" },
  { name: "Copilot", color: "#0ea5e9", mentions: 143, score: 67, trend: "+7%" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Search,
    title: "Define your prompts",
    body: "Author prompts that reflect how your customers discover brands like yours — by category, use case, or comparison queries.",
  },
  {
    step: "02",
    icon: Zap,
    title: "Scan all AI engines",
    body: "We fire your prompts across every major AI provider simultaneously and collect the raw responses in real-time.",
  },
  {
    step: "03",
    icon: BarChart2,
    title: "Score and analyze",
    body: "Our AI engine detects brand mentions, measures prominence, analyzes sentiment, and calculates your visibility score.",
  },
  {
    step: "04",
    icon: TrendingUp,
    title: "Track and benchmark",
    body: "Monitor trends over time, benchmark against competitors, and surface the prompts where you're winning or losing.",
  },
];

const CAPABILITIES = [
  {
    icon: Eye,
    title: "Brand mention detection",
    body: "Identify every instance your brand appears in AI responses — direct mentions, implicit references, and comparative rankings.",
  },
  {
    icon: BarChart2,
    title: "Visibility scoring (0–100)",
    body: "An explainable, confidence-weighted score for each AI provider based on mention frequency, position, and sentiment.",
  },
  {
    icon: Activity,
    title: "Trend analysis",
    body: "Track how your score changes over time. Identify volatility, detect drops early, and correlate with content changes.",
  },
  {
    icon: MessageSquare,
    title: "Context and sentiment",
    body: "Understand not just whether AI mentions your brand — but how. Positive, neutral, negative, with full response context.",
  },
  {
    icon: AlertCircle,
    title: "Prompt performance",
    body: "See exactly which prompts trigger your brand mentions and which ones don't — so you can optimize systematically.",
  },
  {
    icon: TrendingUp,
    title: "Citation tracking",
    body: "Track which of your web assets are cited as sources in AI responses, and build your citation authority over time.",
  },
];

export default function AIVisibilityPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-blue-600/8 blur-3xl" />
        </div>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
              <BarChart2 className="size-3.5" />
              AI Visibility Intelligence
            </div>
          </FadeIn>

          <FadeUp delay={0.1}>
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              <span className="gradient-text">See exactly where</span>
              <br />
              <span className="text-white">you stand in AI search</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
              Real-time scanning across every major AI engine. Track brand mentions, score your visibility, analyze sentiment, and benchmark competitors — all from one dashboard.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500"
              >
                Start tracking free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Provider comparison */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Unified view across <span className="gradient-text-blue">every AI engine</span>
            </h2>
            <p className="mt-3 text-slate-400">
              Every provider scored, every trend tracked, every mention catalogued.
            </p>
          </FadeUp>

          <ScaleIn delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/50">
              <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">
                <p className="text-sm font-medium text-white">Provider Visibility Dashboard — Acme Corp</p>
                <p className="text-xs text-slate-500">Last scanned: 2 minutes ago · 847 prompts · 6 providers</p>
              </div>
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {PROVIDERS.map((p) => (
                    <div
                      key={p.name}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-sm font-medium text-white">{p.name}</span>
                        </div>
                        <span className={`text-xs font-medium ${p.trend.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                          {p.trend}
                        </span>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-xs text-slate-500">Visibility score</span>
                          <span className="text-lg font-bold text-white">{p.score}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${p.score}%`, backgroundColor: p.color, opacity: 0.7 }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium text-white">{p.mentions}</span> mentions today
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-12 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-400">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              From setup to insights in minutes
            </h2>
          </FadeUp>

          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <StaggerItem key={step.step}>
                <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <step.icon className="size-5 text-blue-400" />
                    </div>
                    <span className="text-3xl font-bold text-white/10">{step.step}</span>
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{step.title}</h3>
                  <p className="text-sm text-slate-400">{step.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Capabilities */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything in AI Visibility
            </h2>
          </FadeUp>

          <StaggerContainer className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => (
              <StaggerItem key={cap.title}>
                <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <cap.icon className="size-5 text-blue-400" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{cap.title}</h3>
                  <p className="text-sm text-slate-400">{cap.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp>
            <h2 className="mb-4 text-4xl font-bold tracking-tight">
              Start tracking your <span className="gradient-text">AI visibility</span>
            </h2>
            <p className="mb-8 text-slate-400">
              Set up in 5 minutes. First scan results in under an hour.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500"
              >
                Get started free <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white transition-all hover:bg-white/[0.08]"
              >
                Talk to sales
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
