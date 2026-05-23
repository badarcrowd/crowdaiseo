import Link from "next/link";
import { Target, ArrowRight, CheckCircle2, Zap, TrendingUp, FileText, Code, Globe } from "lucide-react";
import { FadeUp, FadeIn, ScaleIn, StaggerContainer, StaggerItem } from "@/components/marketing/animate";

export const metadata = {
  title: "GEO Optimization — AIV",
  description:
    "Prioritized recommendations to grow your AI visibility. Impact-scored content, technical, and authority actions to help AI engines recommend your brand.",
};

const RECOMMENDATIONS = [
  {
    type: "Content",
    icon: FileText,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    impact: 94,
    effort: "Medium",
    title: "Add structured FAQ to /product page",
    desc: "ChatGPT and Perplexity frequently cite structured Q&A when answering category queries. Adding an AI-readable FAQ block would increase citations by ~40%.",
  },
  {
    type: "Technical",
    icon: Code,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    impact: 87,
    effort: "Low",
    title: "Implement Article schema on blog posts",
    desc: "3 of your top 5 ranking blog posts lack proper Article schema markup. Gemini specifically relies on this signal for citation decisions.",
  },
  {
    type: "Authority",
    icon: Globe,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    impact: 82,
    effort: "High",
    title: "Expand third-party coverage in 'Enterprise Software' category",
    desc: "Your competitors have 3x more authoritative third-party mentions in this category. Increasing G2, Gartner, and industry press coverage would boost all provider scores.",
  },
  {
    type: "Content",
    icon: FileText,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    impact: 76,
    effort: "Medium",
    title: "Create a comprehensive comparison page vs. Competitor A",
    desc: "Users frequently ask AI engines to compare you with Competitor A. A dedicated, balanced comparison page would capture this high-intent traffic.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    icon: Target,
    title: "Analyze your visibility gaps",
    body: "We analyze every prompt where competitors are recommended over you and identify the root cause.",
  },
  {
    num: "02",
    icon: Zap,
    title: "Generate scored recommendations",
    body: "Our AI engine produces specific, actionable recommendations scored by expected impact and implementation effort.",
  },
  {
    num: "03",
    icon: TrendingUp,
    title: "Implement and track progress",
    body: "Execute the recommendations and watch your AI visibility scores improve with each subsequent scan.",
  },
];

const EFFORT_COLOR: Record<string, string> = {
  Low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  High: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function GeoOptimizationPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-emerald-600/8 blur-3xl" />
        </div>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
              <Target className="size-3.5" />
              GEO Optimization
            </div>
          </FadeIn>
          <FadeUp delay={0.1}>
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              <span className="gradient-text">Turn insights into</span>
              <br />
              <span className="text-white">AI search wins</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
              GEO (Generative Engine Optimization) is the practice of optimizing for AI-generated responses. AIV gives you a prioritized, impact-scored playbook — so your team always works on what moves the needle.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-teal-500"
            >
              Get your GEO playbook <ArrowRight className="size-4" />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* Recommendations list */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Your AI optimization <span className="gradient-text-blue">action plan</span>
            </h2>
            <p className="mt-3 text-slate-400">
              Every recommendation is specific, explainable, and scored by expected impact.
            </p>
          </FadeUp>

          <ScaleIn delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/50">
              <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">GEO Recommendations — Priority Queue</p>
                  <p className="text-xs text-slate-500">Sorted by impact score · 24 total recommendations</p>
                </div>
                <div className="text-xs text-slate-500">Est. +28 visibility points with top 3</div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {RECOMMENDATIONS.map((r, i) => (
                  <div key={i} className="flex gap-4 p-6 transition-colors hover:bg-white/[0.02]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <r.icon className={`size-4 ${r.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${r.color} ${r.bg} border-current/20`}>
                          {r.type}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${EFFORT_COLOR[r.effort]}`}>
                          {r.effort} effort
                        </span>
                      </div>
                      <h3 className="mb-1 text-sm font-semibold text-white">{r.title}</h3>
                      <p className="text-xs leading-relaxed text-slate-500">{r.desc}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-bold text-white">{r.impact}</div>
                      <div className="text-xs text-slate-600">impact</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* Process */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">How GEO Optimization works</h2>
          </FadeUp>
          <StaggerContainer className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <StaggerItem key={step.num}>
                <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center transition-all">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <step.icon className="size-6 text-emerald-400" />
                  </div>
                  <div className="mb-2 text-4xl font-bold text-white/10">{step.num}</div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-sm text-slate-400">{step.body}</p>
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
              Ready to optimize for <span className="gradient-text">AI search?</span>
            </h2>
            <p className="mb-8 text-slate-400">
              Get your first GEO playbook in under an hour. Specific, prioritized, and ready for your team.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-teal-500"
            >
              Start optimizing free <ArrowRight className="size-4" />
            </Link>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
