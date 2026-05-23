import Link from "next/link";
import { ArrowRight, CheckCircle2, X, HelpCircle } from "lucide-react";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/marketing/animate";

export const metadata = {
  title: "Pricing — AIV",
  description:
    "Simple, transparent pricing for AI visibility intelligence. Start free, scale as you grow. Enterprise plans available.",
};

const PLANS = [
  {
    name: "Starter",
    tagline: "Explore AI visibility",
    price: "0",
    period: "",
    priceSuffix: "Free forever",
    cta: "Start free",
    href: "/sign-up",
    highlight: false,
    features: [
      { text: "2 AI providers (ChatGPT + Gemini)", included: true },
      { text: "100 scans per month", included: true },
      { text: "Basic visibility score", included: true },
      { text: "7-day history", included: true },
      { text: "1 workspace", included: true },
      { text: "CSV export", included: true },
      { text: "Market Map", included: false },
      { text: "GEO recommendations", included: false },
      { text: "Competitor tracking", included: false },
      { text: "Shareable reports", included: false },
    ],
  },
  {
    name: "Professional",
    tagline: "For growing brands",
    price: "149",
    period: "/month",
    priceSuffix: "Billed monthly · or $119/mo annually",
    cta: "Start 14-day trial",
    href: "/sign-up",
    highlight: true,
    features: [
      { text: "All 6 AI providers", included: true },
      { text: "2,000 scans per month", included: true },
      { text: "Full visibility intelligence", included: true },
      { text: "90-day history", included: true },
      { text: "3 workspaces", included: true },
      { text: "Full export suite", included: true },
      { text: "Market Map", included: true },
      { text: "GEO recommendations", included: true },
      { text: "5 competitor brands", included: true },
      { text: "Shareable report links", included: true },
    ],
  },
  {
    name: "Enterprise",
    tagline: "For large teams",
    price: "Custom",
    period: "",
    priceSuffix: "Annual contract · volume discounts",
    cta: "Contact sales",
    href: "/contact",
    highlight: false,
    features: [
      { text: "Unlimited AI providers", included: true },
      { text: "Unlimited scans", included: true },
      { text: "Full visibility intelligence", included: true },
      { text: "Unlimited history", included: true },
      { text: "Unlimited workspaces", included: true },
      { text: "Custom exports + API", included: true },
      { text: "Market Map + custom categories", included: true },
      { text: "GEO + custom recommendations", included: true },
      { text: "Unlimited competitors", included: true },
      { text: "White-label reports + delivery", included: true },
    ],
  },
];

const ADD_ONS = [
  { name: "Additional scans", price: "$0.04", unit: "per scan", desc: "Beyond your plan limit" },
  { name: "Extra workspaces", price: "$49", unit: "per workspace/month", desc: "For Professional plan" },
  { name: "API access", price: "$99", unit: "per month", desc: "RESTful API with full data access" },
  { name: "White-label reports", price: "$199", unit: "per month", desc: "Custom branding and domain" },
];

const FAQ = [
  {
    q: "What counts as a scan?",
    a: "Each unique prompt sent to an AI provider counts as one scan. If you send the same prompt to 3 providers, that's 3 scans. Scheduled scans run automatically based on your cadence settings.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes. Upgrade at any time and you'll be prorated. Downgrades take effect at the next billing cycle.",
  },
  {
    q: "Is there a free trial for Professional?",
    a: "Yes — 14 days free, no credit card required. You'll have access to all Professional features during the trial.",
  },
  {
    q: "How does competitor tracking work?",
    a: "You define competitor brands by name. AIV monitors AI responses for mentions of those brands in the same context as yours and surfaces comparative insights.",
  },
  {
    q: "What AI providers are included?",
    a: "ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google), Perplexity, Grok (xAI), and Microsoft Copilot. We add new providers as they reach scale.",
  },
  {
    q: "Do you offer discounts for agencies or startups?",
    a: "Yes. Agencies managing multiple clients and qualifying early-stage startups can reach out for special pricing.",
  },
];

export default function PricingPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[500px] -translate-x-1/2 rounded-full bg-blue-600/6 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <FadeIn>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
              Simple, transparent pricing
            </div>
          </FadeIn>
          <FadeUp delay={0.1}>
            <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
              <span className="gradient-text">Start free.</span>
              <br />
              <span className="text-white">Scale when you&apos;re ready.</span>
            </h1>
            <p className="text-lg text-slate-400">
              No hidden fees. No lock-in. Cancel anytime.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <StaggerContainer className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <StaggerItem key={plan.name}>
                <div
                  className={`glow-card relative flex h-full flex-col rounded-2xl border p-8 transition-all ${
                    plan.highlight
                      ? "border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-blue-500/4 shadow-lg shadow-blue-500/10"
                      : "border-white/[0.06] bg-white/[0.03]"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-xs font-bold text-white shadow-lg shadow-blue-500/20">
                      Most popular
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-sm font-medium text-slate-400">{plan.name}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{plan.tagline}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      {plan.price !== "Custom" && (
                        <span className="text-slate-400 text-2xl">$</span>
                      )}
                      <span className="text-5xl font-bold tracking-tight text-white">{plan.price}</span>
                      {plan.period && <span className="text-slate-500">{plan.period}</span>}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">{plan.priceSuffix}</p>
                  </div>

                  <ul className="mb-8 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-start gap-2 text-sm">
                        {f.included ? (
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-blue-400" />
                        ) : (
                          <X className="mt-0.5 size-3.5 shrink-0 text-slate-700" />
                        )}
                        <span className={f.included ? "text-slate-300" : "text-slate-600"}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
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
        </div>
      </section>

      {/* Add-ons */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <FadeUp className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Add-ons</h2>
            <p className="mt-2 text-slate-400">Extend your plan with optional add-ons.</p>
          </FadeUp>
          <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ADD_ONS.map((addon) => (
              <StaggerItem key={addon.name}>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <p className="text-sm font-medium text-white">{addon.name}</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {addon.price}{" "}
                    <span className="text-sm font-normal text-slate-500">{addon.unit}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{addon.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <FadeUp className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          </FadeUp>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <FadeUp key={item.q} delay={i * 0.06}>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="mt-0.5 size-4 shrink-0 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.q}</h3>
                      <p className="mt-2 text-sm text-slate-400">{item.a}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp>
            <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-12">
              <h2 className="mb-3 text-3xl font-bold tracking-tight">
                Not sure which plan? <span className="gradient-text">Talk to us.</span>
              </h2>
              <p className="mb-6 text-slate-400">
                We&apos;ll help you find the right plan for your team size, scanning volume, and goals.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500"
                >
                  Start free trial <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/contact"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/[0.08]"
                >
                  Talk to sales
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
