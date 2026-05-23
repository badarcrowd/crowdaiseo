import Link from "next/link";
import {
  BarChart2,
  Map,
  Target,
  Building2,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Eye,
  Zap,
  Globe,
  Shield,
  Star,
  ChevronRight,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import {
  FadeUp,
  FadeIn,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
  HeroEntrance,
} from "@/components/marketing/animate";

export const metadata = {
  title: "AIV — AI Search Intelligence Platform",
  description:
    "Understand how AI engines perceive and recommend your brand. Track visibility across ChatGPT, Claude, Gemini, Perplexity, and more.",
};

// ─── Provider data ────────────────────────────────────────────────────────────
const PROVIDERS = [
  { name: "ChatGPT", color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/20", score: 84 },
  { name: "Claude", color: "#f97316", bg: "bg-orange-500/10", border: "border-orange-500/20", score: 71 },
  { name: "Gemini", color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/20", score: 62 },
  { name: "Perplexity", color: "#8b5cf6", bg: "bg-violet-500/10", border: "border-violet-500/20", score: 79 },
  { name: "Grok", color: "#94a3b8", bg: "bg-slate-500/10", border: "border-slate-500/20", score: 55 },
  { name: "Copilot", color: "#0ea5e9", bg: "bg-sky-500/10", border: "border-sky-500/20", score: 67 },
];

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "6", label: "AI engines monitored", suffix: "" },
  { value: "3.5B", label: "Daily AI queries tracked", suffix: "+" },
  { value: "94", label: "Avg accuracy score", suffix: "%" },
  { value: "48h", label: "Time to first insight", suffix: "" },
];

// ─── Features ────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    href: "/ai-visibility",
    icon: BarChart2,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    tag: "Core",
    title: "AI Visibility Intelligence",
    body:
      "See exactly how ChatGPT, Claude, Gemini, and Perplexity mention, rank, and recommend your brand. Real-time scanning with deterministic scoring.",
    bullets: [
      "Cross-provider brand mention detection",
      "Explainable visibility scoring (0–100)",
      "Sentiment and context classification",
      "Historical trend analysis",
    ],
  },
  {
    href: "/market-map",
    icon: Map,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    tag: "Competitive",
    title: "Market Map",
    body:
      "Map your entire competitive AI landscape. Understand who owns which categories, where you're losing share of voice, and where the opportunities are.",
    bullets: [
      "Share-of-voice by category",
      "Competitor gap analysis",
      "Category ownership insights",
      "Citation authority ranking",
    ],
  },
  {
    href: "/geo-optimization",
    icon: Target,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    tag: "Action",
    title: "GEO Optimization",
    body:
      "Turn AI visibility insights into a prioritized action plan. Every recommendation scored by impact and effort — so your team always works on what matters.",
    bullets: [
      "AI-prioritized content actions",
      "Impact × difficulty scoring",
      "Technical and authority signals",
      "Progress tracking and ROI",
    ],
  },
  {
    href: "/enterprise",
    icon: Building2,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    tag: "Enterprise",
    title: "Executive Intelligence",
    body:
      "Board-ready reports, custom dashboards, and deep brand perception analysis designed for enterprise growth teams and C-suite stakeholders.",
    bullets: [
      "One-click executive PDF reports",
      "Multi-brand workspaces",
      "Custom AI provider weighting",
      "Audit logs and SSO",
    ],
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "AIV completely changed how we think about content strategy. We went from guessing to knowing exactly what moves the needle in AI search.",
    name: "Sarah Chen",
    title: "VP of Growth, TechCorp",
    initials: "SC",
    color: "from-blue-500 to-indigo-600",
  },
  {
    quote: "The Market Map feature alone is worth it. We discovered three categories where competitors were dominating AI answers — and we fixed it in 6 weeks.",
    name: "Marcus Williams",
    title: "Head of SEO, ScaleUp Inc",
    initials: "MW",
    color: "from-violet-500 to-purple-600",
  },
  {
    quote: "Our executive team finally has a clear picture of AI brand perception. The reports save us hours of manual analysis every week.",
    name: "Priya Sharma",
    title: "CMO, Enterprise Co",
    initials: "PS",
    color: "from-emerald-500 to-teal-600",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MarketingNav />

      <main>
        <Hero />
        <ProviderBar />
        <StatsSection />
        <FeaturesSection />
        <DashboardPreview />
        <TestimonialsSection />
        <PricingPreview />
        <CtaSection />
      </main>

      <MarketingFooter />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-32">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-pulse-glow absolute left-1/2 top-1/4 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="animate-pulse-glow absolute right-1/4 top-3/4 size-[400px] rounded-full bg-indigo-600/6 blur-3xl" style={{ animationDelay: "2s" }} />
        <div className="absolute left-1/4 top-2/3 size-[300px] rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      {/* Grid background */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950" />

      {/* Floating provider badges */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="animate-float absolute left-[8%] top-[30%] rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
          ChatGPT · 84
        </div>
        <div className="animate-float-delay absolute right-[10%] top-[28%] rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400">
          Claude · 71
        </div>
        <div className="animate-float-delay-2 absolute left-[12%] top-[65%] rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400">
          Perplexity · 79
        </div>
        <div className="animate-float absolute right-[8%] top-[62%] rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
          Gemini · 62
        </div>
      </div>

      <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
        <HeroEntrance>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
            <span className="size-1.5 animate-pulse rounded-full bg-blue-400" />
            Now tracking 6 AI providers in real-time
            <ChevronRight className="size-3.5 text-blue-400" />
          </div>

          <h1 className="mb-6 text-6xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-[80px]">
            <span className="gradient-text">Understand how AI</span>
            <br />
            <span className="gradient-text">engines perceive</span>
            <br />
            <span className="text-white/50">your brand</span>
          </h1>

          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            The AI search revolution is rewriting discovery. Track your visibility across ChatGPT, Claude, Gemini,
            Perplexity, and more — score, benchmark competitors, and act on prioritized recommendations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/35 hover:-translate-y-0.5"
            >
              Start free — no card required
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/ai-visibility"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/[0.08]"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-600">
            Used by 500+ growth teams · No credit card required · 14-day trial
          </p>
        </HeroEntrance>
      </div>
    </section>
  );
}

// ─── Provider Bar ─────────────────────────────────────────────────────────────
function ProviderBar() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.02] py-6">
      <FadeIn>
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-slate-600">
            Monitoring brand visibility across every major AI engine
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PROVIDERS.map((p) => (
              <div
                key={p.name}
                className={`flex items-center gap-2 rounded-full border ${p.border} ${p.bg} px-4 py-2`}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm font-medium text-white">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <FadeUp className="mb-4 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Why AI visibility matters now
          </p>
        </FadeUp>
        <FadeUp delay={0.1} className="mb-12 text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            AI is rewriting{" "}
            <span className="gradient-text-blue">how brands get discovered</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Billions of users now rely on AI engines as their primary search interface. Your brand&apos;s
            AI visibility directly determines your reach, trust, and revenue.
          </p>
        </FadeUp>

        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center transition-all">
                <div className="mb-2 text-4xl font-bold tracking-tight text-white">
                  {stat.value}
                  <span className="text-2xl text-blue-400">{stat.suffix}</span>
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <FadeUp className="mb-16 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-blue-400">Platform</p>
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Everything you need to <span className="gradient-text">own AI search</span>
          </h2>
        </FadeUp>

        <div className="grid gap-6 lg:grid-cols-2">
          {FEATURES.map((f, i) => (
            <FadeUp key={f.href} delay={i * 0.08}>
              <Link
                href={f.href}
                className="glow-card group block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 transition-all hover:-translate-y-1"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${f.iconBg}`}>
                    <f.icon className={`size-5 ${f.iconColor}`} />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-400">
                    {f.tag}
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-semibold text-white">{f.title}</h3>
                <p className="mb-5 text-sm leading-relaxed text-slate-400">{f.body}</p>

                <ul className="mb-6 space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle2 className="size-3.5 shrink-0 text-blue-400" />
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-1 text-sm font-medium text-blue-400 transition-all group-hover:gap-2">
                  Learn more <ArrowRight className="size-3.5" />
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Dashboard Preview ────────────────────────────────────────────────────────
function DashboardPreview() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-slate-900 to-slate-950 p-1">
          <FadeUp className="p-8 pb-0">
            <div className="mb-8 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-400">
                Live dashboard
              </p>
              <h2 className="text-4xl font-bold tracking-tight">
                Your AI visibility, <span className="gradient-text">at a glance</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-400">
                A unified view of your brand&apos;s AI presence — scores, trends, citations, and competitive position in one premium dashboard.
              </p>
            </div>
          </FadeUp>

          <ScaleIn delay={0.2}>
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-950 glow-blue">
              {/* Mock browser chrome */}
              <div className="flex items-center gap-2 border-b border-white/[0.06] bg-slate-900/50 px-4 py-3">
                <div className="size-3 rounded-full bg-red-500/50" />
                <div className="size-3 rounded-full bg-amber-500/50" />
                <div className="size-3 rounded-full bg-emerald-500/50" />
                <div className="mx-3 flex-1 rounded-md bg-white/5 px-3 py-1 text-center text-xs text-slate-600">
                  app.aiv.com · workspace/acme-corp · ai-visibility
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="p-6">
                {/* Top metric row */}
                <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Overall Score", value: "73", change: "+5.2", unit: "/100", up: true },
                    { label: "Mentions Today", value: "284", change: "+18%", unit: "", up: true },
                    { label: "Competitors", value: "6", change: "tracked", unit: "", up: null },
                    { label: "Citations", value: "1,247", change: "+8.4%", unit: "", up: true },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <p className="mb-1 text-xs text-slate-500">{m.label}</p>
                      <p className="text-2xl font-bold text-white">
                        {m.value}
                        <span className="text-sm font-normal text-slate-500">{m.unit}</span>
                      </p>
                      <p className={`mt-1 text-xs ${m.up === true ? "text-emerald-400" : m.up === false ? "text-red-400" : "text-slate-500"}`}>
                        {m.change}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Provider scores */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="mb-4 text-sm font-medium text-slate-400">AI Provider Comparison</p>
                  <div className="space-y-3">
                    {PROVIDERS.map((p) => (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-slate-500">{p.name}</span>
                        <div className="flex-1 overflow-hidden rounded-full bg-white/5 h-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${p.score}%`,
                              backgroundColor: p.color,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs font-medium text-white">{p.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScaleIn>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function TestimonialsSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <FadeUp className="mb-12 text-center">
          <div className="mb-3 flex justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Trusted by growth teams</h2>
          <p className="mt-3 text-slate-400">Join 500+ companies that use AIV to understand and grow their AI visibility</p>
        </FadeUp>

        <StaggerContainer className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-slate-300">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`flex size-9 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-bold text-white`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.title}</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ─── Pricing Preview ──────────────────────────────────────────────────────────
function PricingPreview() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      period: "",
      desc: "For individuals exploring AI visibility",
      features: ["2 AI providers", "100 scans/month", "Basic visibility score", "7-day history"],
      cta: "Start free",
      href: "/sign-up",
      highlight: false,
    },
    {
      name: "Professional",
      price: "$149",
      period: "/month",
      desc: "For growing brands and marketing teams",
      features: ["6 AI providers", "2,000 scans/month", "Full Market Map", "GEO recommendations", "Competitor tracking", "Shareable reports"],
      cta: "Start 14-day trial",
      href: "/sign-up",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "For enterprise teams with complex needs",
      features: ["Unlimited providers", "Unlimited scans", "Custom dashboards", "SSO & audit logs", "Dedicated support", "SLA guarantee"],
      cta: "Contact sales",
      href: "/contact",
      highlight: false,
    },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <FadeUp className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-400">Pricing</p>
          <h2 className="text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-slate-400">Start free and scale as your AI visibility program grows</p>
        </FadeUp>

        <StaggerContainer className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <StaggerItem key={plan.name}>
              <div
                className={`glow-card relative flex h-full flex-col rounded-2xl border p-6 transition-all ${
                  plan.highlight
                    ? "border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-blue-500/5"
                    : "border-white/[0.06] bg-white/[0.03]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-blue-500/20">
                    Most popular
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-sm font-medium text-slate-400">{plan.name}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-slate-500">{plan.period}</span>}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{plan.desc}</p>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="size-3.5 shrink-0 text-blue-400" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeUp delay={0.2} className="mt-8 text-center">
          <Link href="/pricing" className="text-sm text-slate-500 underline-offset-4 hover:text-white hover:underline">
            View full pricing details →
          </Link>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CtaSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <FadeUp>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-violet-600/10 border border-blue-500/20 p-16 text-center glow-blue">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
            <div className="relative z-10">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30">
                <Zap className="size-8 text-white" />
              </div>
              <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
                Start understanding your
                <br />
                <span className="gradient-text">AI visibility today</span>
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-slate-400">
                Join 500+ teams already using AIV to track, benchmark, and grow their presence across every major AI engine.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/sign-up"
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-blue-500/30 transition-all hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5"
                >
                  Get started free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-8 py-4 text-base font-medium text-white transition-all hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Talk to sales
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500">
                {[
                  { icon: Shield, text: "SOC 2 compliant" },
                  { icon: Globe, text: "Global coverage" },
                  { icon: TrendingUp, text: "14-day free trial" },
                  { icon: Eye, text: "No credit card" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon className="size-4 text-blue-500/70" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
