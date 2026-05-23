import Link from "next/link";
import {
  Book,
  Zap,
  Code,
  BarChart2,
  Map,
  Target,
  Building2,
  FileBarChart,
  Settings,
  Key,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/marketing/animate";

export const metadata = {
  title: "Documentation — AIV",
  description:
    "Everything you need to get started with AIV. Quickstart guides, API reference, and integration documentation.",
};

const QUICKSTART = [
  { step: "1", title: "Create your account", href: "/sign-up", desc: "Sign up and create your first workspace." },
  { step: "2", title: "Define your brand", href: "#", desc: "Add your brand name, website, and key identifiers." },
  { step: "3", title: "Author prompts", href: "#", desc: "Write prompts that reflect how customers find brands like yours." },
  { step: "4", title: "Run your first scan", href: "#", desc: "Trigger a scan and get results across 6 AI providers." },
];

const SECTIONS = [
  {
    icon: Zap,
    title: "Getting started",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    links: [
      { label: "Quickstart guide", href: "#" },
      { label: "Workspace setup", href: "#" },
      { label: "Your first scan", href: "#" },
      { label: "Understanding your score", href: "#" },
    ],
  },
  {
    icon: BarChart2,
    title: "AI Visibility",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    links: [
      { label: "Prompt authoring guide", href: "#" },
      { label: "Scan scheduling", href: "#" },
      { label: "Score methodology", href: "#" },
      { label: "Provider comparison", href: "#" },
    ],
  },
  {
    icon: Map,
    title: "Market Map",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    links: [
      { label: "Setting up competitors", href: "#" },
      { label: "Category configuration", href: "#" },
      { label: "Share of voice explained", href: "#" },
      { label: "Gap analysis", href: "#" },
    ],
  },
  {
    icon: Target,
    title: "GEO Optimization",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    links: [
      { label: "Recommendation types", href: "#" },
      { label: "Impact scoring", href: "#" },
      { label: "Content recommendations", href: "#" },
      { label: "Technical recommendations", href: "#" },
    ],
  },
  {
    icon: FileBarChart,
    title: "Reports",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    links: [
      { label: "Generating reports", href: "#" },
      { label: "Sharing and permissions", href: "#" },
      { label: "Scheduled delivery", href: "#" },
      { label: "Custom branding", href: "#" },
    ],
  },
  {
    icon: Building2,
    title: "Enterprise",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    links: [
      { label: "SSO configuration", href: "#" },
      { label: "SCIM provisioning", href: "#" },
      { label: "Audit logs", href: "#" },
      { label: "Multi-workspace setup", href: "#" },
    ],
  },
  {
    icon: Key,
    title: "API Reference",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    links: [
      { label: "Authentication", href: "#" },
      { label: "Scans API", href: "#" },
      { label: "Visibility API", href: "#" },
      { label: "Webhooks", href: "#" },
    ],
  },
  {
    icon: Settings,
    title: "Administration",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    links: [
      { label: "Workspace settings", href: "#" },
      { label: "Member management", href: "#" },
      { label: "Billing and usage", href: "#" },
      { label: "Data export", href: "#" },
    ],
  },
];

const CODE_EXAMPLE = `curl -X POST https://api.aiv.app/v1/scans \\
  -H "Authorization: Bearer $AIV_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workspace": "ws_acme",
    "prompts": ["best CRM software 2025"],
    "providers": ["chatgpt", "claude", "gemini"],
    "brand": "Acme CRM"
  }'`;

export default function DocsPage() {
  return (
    <div className="pt-16">
      <section className="relative overflow-hidden px-6 pb-12 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[400px] -translate-x-1/2 rounded-full bg-blue-600/6 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <FadeUp>
            <div className="mb-4 flex justify-center">
              <Book className="size-8 text-blue-400" />
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight">
              <span className="gradient-text">Documentation</span>
            </h1>
            <p className="text-lg text-slate-400">
              Everything you need to get started with AI visibility intelligence.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Quickstart */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">Quickstart</h2>
            <p className="mt-2 text-slate-400">Up and running in under 10 minutes.</p>
          </FadeUp>

          <div className="grid gap-4 md:grid-cols-4">
            {QUICKSTART.map((step) => (
              <FadeUp key={step.step} delay={parseInt(step.step) * 0.05}>
                <Link href={step.href} className="group glow-card block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all hover:-translate-y-0.5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-400">
                      {step.step}
                    </div>
                    <ArrowRight className="size-3.5 text-slate-600 transition-all group-hover:text-blue-400 group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{step.desc}</p>
                </Link>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* API preview */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <FadeUp>
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
                <div className="flex items-center gap-2">
                  <Code className="size-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">API — Quick example</span>
                </div>
                <Link href="#" className="flex items-center gap-1 text-xs text-slate-500 hover:text-white">
                  Full API reference <ExternalLink className="size-3" />
                </Link>
              </div>
              <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-slate-300">
                <code>{CODE_EXAMPLE}</code>
              </pre>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Doc sections */}
      <section className="px-6 py-12 pb-24">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">All documentation</h2>
          </FadeUp>

          <StaggerContainer className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {SECTIONS.map((section) => (
              <StaggerItem key={section.title}>
                <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all">
                  <div className={`mb-4 flex size-9 items-center justify-center rounded-xl ${section.bg}`}>
                    <section.icon className={`size-4 ${section.color}`} />
                  </div>
                  <h3 className="mb-3 text-sm font-semibold text-white">{section.title}</h3>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="flex items-center justify-between text-xs text-slate-500 transition-colors hover:text-white"
                        >
                          {link.label}
                          <ArrowRight className="size-2.5 opacity-0 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </div>
  );
}
