import Link from "next/link";
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  Shield,
  Users,
  BarChart2,
  Lock,
  Zap,
  Globe,
  HeadphonesIcon,
} from "lucide-react";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/marketing/animate";

export const metadata = {
  title: "Enterprise Intelligence — AIV",
  description:
    "Enterprise-grade AI visibility intelligence. Custom dashboards, executive reports, SSO, audit logs, and dedicated support for large-scale teams.",
};

const ENTERPRISE_FEATURES = [
  {
    icon: BarChart2,
    title: "Executive dashboards",
    body: "Board-ready visualizations of AI brand perception. Custom KPIs, branded reports, and one-click PDF exports for executive stakeholders.",
  },
  {
    icon: Building2,
    title: "Multi-brand workspaces",
    body: "Manage multiple brands, sub-brands, or client accounts from a single workspace. Role-based access with full isolation.",
  },
  {
    icon: Globe,
    title: "Custom AI provider weighting",
    body: "Tune which AI engines matter most for your industry. Weight visibility scores based on your actual audience behavior.",
  },
  {
    icon: Lock,
    title: "SSO & enterprise auth",
    body: "SAML 2.0 and OIDC SSO with your identity provider. SCIM provisioning for automated user management.",
  },
  {
    icon: Shield,
    title: "Audit logs & compliance",
    body: "Full audit trail of every action, every scan, and every export. SOC 2 Type II certified with GDPR-ready data processing.",
  },
  {
    icon: Users,
    title: "Granular permissions",
    body: "Owner, Admin, Editor, and Viewer roles. Workspace-level and project-level access controls with custom role creation.",
  },
  {
    icon: Zap,
    title: "Priority scan throughput",
    body: "Dedicated scan infrastructure for enterprise accounts. No queue, no throttling — your scans run when you need them.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated success team",
    body: "Named customer success manager, slack connect, quarterly business reviews, and 24/7 emergency support.",
  },
];

const LOGOS = [
  "Acme Corp", "Globex", "TechScale", "Momentum AI", "Vertex Labs", "Nova Analytics"
];

export default function EnterprisePage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-amber-600/6 blur-3xl" />
          <div className="absolute right-1/4 top-1/2 size-[400px] rounded-full bg-blue-600/5 blur-3xl" />
        </div>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <FadeIn>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-300">
                  <Building2 className="size-3.5" />
                  Enterprise Intelligence
                </div>
              </FadeIn>
              <FadeUp delay={0.1}>
                <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                  <span className="gradient-text">AI visibility</span>
                  <br />
                  <span className="text-white">built for enterprise</span>
                </h1>
                <p className="mb-8 text-lg text-slate-400">
                  Custom dashboards, executive reports, SSO, granular permissions, and dedicated support. Everything your enterprise team needs to own AI brand perception at scale.
                </p>
              </FadeUp>
              <FadeUp delay={0.2}>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/contact"
                    className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-amber-500/20 transition-all hover:from-amber-500 hover:to-orange-500"
                  >
                    Talk to our team <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white transition-all hover:bg-white/[0.08]"
                  >
                    See pricing
                  </Link>
                </div>
              </FadeUp>
            </div>

            <FadeIn delay={0.3}>
              <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Executive Summary</p>
                    <p className="text-xs text-slate-500">Q4 2024 · 12 brands · 6 AI engines</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                    Enterprise
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                  {[
                    { label: "Portfolio Score", value: "78.4", unit: "/100", change: "+6.2 QoQ" },
                    { label: "Brands Tracked", value: "12", unit: "", change: "Across 3 regions" },
                    { label: "AI Coverage", value: "6", unit: " engines", change: "100% coverage" },
                    { label: "Recommendations", value: "247", unit: "", change: "94 completed" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-500">{m.label}</p>
                      <p className="text-xl font-bold text-white">
                        {m.value}<span className="text-sm font-normal text-slate-500">{m.unit}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-400">{m.change}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {["Board report ready", "SOC 2 certified", "GDPR compliant", "99.9% SLA uptime"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Trust logos */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] py-8">
        <FadeIn>
          <div className="mx-auto max-w-7xl px-6">
            <p className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-slate-600">
              Trusted by enterprise growth teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {LOGOS.map((logo) => (
                <span key={logo} className="text-sm font-medium text-slate-600">
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Features grid */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Enterprise-grade <span className="gradient-text-blue">from day one</span>
            </h2>
            <p className="mt-3 text-slate-400">
              Built for security, compliance, and scale.
            </p>
          </FadeUp>

          <StaggerContainer className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {ENTERPRISE_FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
                    <f.icon className="size-5 text-amber-400" />
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
              Ready for <span className="gradient-text">enterprise AI intelligence?</span>
            </h2>
            <p className="mb-8 text-slate-400">
              Talk to our team. We&apos;ll scope a custom deployment, provide a security review, and run a pilot with your team.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-amber-500/20 transition-all hover:from-amber-500 hover:to-orange-500"
              >
                Contact enterprise sales <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-600">Response within 24 hours · Custom contract · Dedicated onboarding</p>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
