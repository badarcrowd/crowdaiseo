import Link from "next/link";
import { FileBarChart, ArrowRight, Download, Share2, Eye, CheckCircle2 } from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { FadeUp, FadeIn, StaggerContainer, StaggerItem } from "@/components/marketing/animate";

export const metadata = {
  title: "Reports — AIV",
  description:
    "One-click AI visibility reports. Executive PDFs, shareable links, and automated delivery for your brand intelligence program.",
};

const REPORT_TYPES = [
  {
    name: "AI Visibility Report",
    desc: "Full breakdown of your brand's visibility score across all AI engines with trend analysis and top citations.",
    pages: "8–12 pages",
    cadence: "Weekly or on-demand",
    tags: ["Score", "Trends", "Citations", "Providers"],
    highlight: true,
  },
  {
    name: "Competitive Intelligence Report",
    desc: "Share-of-voice analysis, competitor comparison matrix, category ownership, and gap identification.",
    pages: "10–15 pages",
    cadence: "Monthly or on-demand",
    tags: ["Market Map", "SOV", "Gaps", "Opportunities"],
    highlight: false,
  },
  {
    name: "GEO Optimization Report",
    desc: "Prioritized action plan with impact scoring, implementation guidance, and progress tracking.",
    pages: "6–10 pages",
    cadence: "After each scan cycle",
    tags: ["Actions", "Impact", "Progress", "ROI"],
    highlight: false,
  },
  {
    name: "Executive Summary",
    desc: "Board-ready one-pager with key metrics, strategic insights, and quarter-over-quarter comparison.",
    pages: "1–3 pages",
    cadence: "Quarterly or on-demand",
    tags: ["KPIs", "Strategy", "QoQ", "Board"],
    highlight: false,
  },
];

const FEATURES = [
  { icon: Download, title: "One-click PDF export", body: "Premium, branded PDFs ready for exec distribution or client delivery." },
  { icon: Share2, title: "Shareable links", body: "Generate secure, expiring share links for external stakeholders — no account required." },
  { icon: Eye, title: "Live report viewer", body: "Interactive web viewer with drill-down data, not just static PDFs." },
  { icon: FileBarChart, title: "Automated delivery", body: "Schedule weekly or monthly reports delivered directly to stakeholder inboxes." },
];

export default function ReportsMarketingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MarketingNav />
      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-24 pt-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-sky-600/8 blur-3xl" />
          </div>
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <FadeIn>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-300">
                <FileBarChart className="size-3.5" />
                Reports
              </div>
            </FadeIn>
            <FadeUp delay={0.1}>
              <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
                <span className="gradient-text">AI intelligence</span>
                <br />
                <span className="text-white">your team will actually read</span>
              </h1>
              <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
                Executive-quality reports that turn complex AI visibility data into clear, actionable insights. One click from dashboard to boardroom.
              </p>
            </FadeUp>
            <FadeUp delay={0.2}>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-sky-500/20 transition-all hover:from-sky-500 hover:to-blue-500"
              >
                Generate your first report <ArrowRight className="size-4" />
              </Link>
            </FadeUp>
          </div>
        </section>

        {/* Report types */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <FadeUp className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Four report types, <span className="gradient-text-blue">one platform</span>
              </h2>
            </FadeUp>

            <StaggerContainer className="grid gap-5 md:grid-cols-2">
              {REPORT_TYPES.map((r) => (
                <StaggerItem key={r.name}>
                  <div
                    className={`glow-card relative rounded-2xl border p-6 transition-all ${
                      r.highlight
                        ? "border-sky-500/25 bg-gradient-to-b from-sky-500/8 to-sky-500/3"
                        : "border-white/[0.06] bg-white/[0.03]"
                    }`}
                  >
                    {r.highlight && (
                      <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-1 text-xs font-semibold text-white">
                        Most popular
                      </div>
                    )}
                    <h3 className="mb-2 text-lg font-semibold text-white">{r.name}</h3>
                    <p className="mb-4 text-sm text-slate-400">{r.desc}</p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {r.tags.map((t) => (
                        <span key={t} className="rounded-full bg-white/5 border border-white/[0.06] px-2.5 py-1 text-xs text-slate-400">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-white/[0.04]">
                      <span>{r.pages}</span>
                      <span>·</span>
                      <span>{r.cadence}</span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <FadeUp className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Report delivery and sharing</h2>
            </FadeUp>
            <StaggerContainer className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <StaggerItem key={f.title}>
                  <div className="glow-card rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-sky-500/10">
                      <f.icon className="size-5 text-sky-400" />
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
                Start with a <span className="gradient-text">free report</span>
              </h2>
              <p className="mb-8 text-slate-400">Generate your first AI visibility report in minutes.</p>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-sky-500/20 transition-all hover:from-sky-500 hover:to-blue-500"
              >
                Generate free report <ArrowRight className="size-4" />
              </Link>
            </FadeUp>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
