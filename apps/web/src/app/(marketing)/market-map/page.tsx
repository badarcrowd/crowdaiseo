import Link from "next/link";
import { Map, ArrowRight, TrendingUp, PieChart, BarChart2, Crosshair } from "lucide-react";
import { FadeUp, FadeIn, ScaleIn, StaggerContainer, StaggerItem } from "@/components/marketing/animate";

export const metadata = {
  title: "Market Map — AIV",
  description:
    "Visualize your competitive AI landscape. Understand share of voice, category ownership, and where competitors are dominating AI recommendations.",
};

const CATEGORIES = [
  { name: "Project Management", you: 72, top: "Competitor A", topScore: 89, trend: "+4%" },
  { name: "Team Collaboration", you: 45, top: "Competitor B", topScore: 91, trend: "-1%" },
  { name: "Enterprise Software", you: 83, top: "You", topScore: 83, trend: "+12%" },
  { name: "Productivity Tools", you: 61, top: "Competitor C", topScore: 77, trend: "+2%" },
  { name: "Remote Work", you: 58, top: "Competitor A", topScore: 85, trend: "+6%" },
];

const FEATURES = [
  {
    icon: PieChart,
    title: "Share of voice",
    body: "See exactly what percentage of AI recommendations in your category go to you versus competitors. Updated with every scan.",
  },
  {
    icon: Crosshair,
    title: "Competitor gap analysis",
    body: "Identify which categories competitors own that you don't — and the prompts where you should be appearing but aren't.",
  },
  {
    icon: BarChart2,
    title: "Category ownership",
    body: "Discover which AI categories you dominate, which are contested, and which are entirely unclaimed opportunities.",
  },
  {
    icon: TrendingUp,
    title: "Position tracking",
    body: "Track your market position over time. See which way momentum is moving across every AI engine.",
  },
];

export default function MarketMapPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-violet-600/8 blur-3xl" />
        </div>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
              <Map className="size-3.5" />
              Market Map
            </div>
          </FadeIn>
          <FadeUp delay={0.1}>
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              <span className="gradient-text">Map your competitive</span>
              <br />
              <span className="text-white">AI landscape</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
              Understand who owns which categories in AI search. Visualize share of voice, surface competitor gaps, and find the opportunities they&apos;re missing.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500"
              >
                Explore your market map <ArrowRight className="size-4" />
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Market map visual */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Category-level AI visibility
            </h2>
            <p className="mt-3 text-slate-400">
              See your score versus the category leader across every relevant topic area.
            </p>
          </FadeUp>

          <ScaleIn delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/50">
              <div className="border-b border-white/[0.06] bg-white/[0.02] px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Category Market Map</p>
                  <p className="text-xs text-slate-500">Acme Corp vs. category leaders</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full bg-blue-500/70" /> You
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full bg-slate-600" /> Category leader
                  </div>
                </div>
              </div>
              <div className="divide-y divide-white/[0.04] p-6">
                {CATEGORIES.map((cat) => (
                  <div key={cat.name} className="py-4 first:pt-0 last:pb-0">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-white">{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${cat.trend.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                          {cat.trend}
                        </span>
                        {cat.top === "You" && (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                            Category leader
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs text-slate-500">You</span>
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-blue-500/70"
                            style={{ width: `${cat.you}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs font-medium text-white">{cat.you}</span>
                      </div>
                      {cat.top !== "You" && (
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-xs text-slate-500">{cat.top}</span>
                          <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5">
                            <div
                              className="h-full rounded-full bg-slate-600/70"
                              style={{ width: `${cat.topScore}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-medium text-slate-400">{cat.topScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Market Map capabilities</h2>
          </FadeUp>
          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-violet-500/10">
                    <f.icon className="size-5 text-violet-400" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{f.title}</h3>
                  <p className="text-sm text-slate-400">{f.body}</p>
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
              Know your <span className="gradient-text">AI market position</span>
            </h2>
            <p className="mb-8 text-slate-400">
              Stop guessing. Start knowing exactly where you stand vs. every competitor in AI search.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-indigo-500"
            >
              Build your Market Map <ArrowRight className="size-4" />
            </Link>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
