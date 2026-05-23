import Link from "next/link";
import { Zap } from "lucide-react";

const LINKS = {
  Product: [
    { href: "/ai-visibility", label: "AI Visibility" },
    { href: "/market-map", label: "Market Map" },
    { href: "/geo-optimization", label: "GEO Optimization" },
    { href: "/enterprise", label: "Enterprise Intelligence" },
    { href: "/reports", label: "Reports" },
    { href: "/pricing", label: "Pricing" },
  ],
  Resources: [
    { href: "/docs", label: "Documentation" },
    { href: "/blog", label: "Blog" },
    { href: "/docs/api", label: "API Reference" },
    { href: "/docs/changelog", label: "Changelog" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/enterprise", label: "Enterprise" },
    { href: "/sign-up", label: "Get started" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/security", label: "Security" },
  ],
};

const PROVIDERS = [
  { label: "ChatGPT", color: "from-emerald-500/20 to-emerald-500/5", text: "text-emerald-400" },
  { label: "Claude", color: "from-orange-500/20 to-orange-500/5", text: "text-orange-400" },
  { label: "Gemini", color: "from-blue-500/20 to-blue-500/5", text: "text-blue-400" },
  { label: "Perplexity", color: "from-violet-500/20 to-violet-500/5", text: "text-violet-400" },
  { label: "Grok", color: "from-slate-500/20 to-slate-500/5", text: "text-slate-400" },
  { label: "Copilot", color: "from-sky-500/20 to-sky-500/5", text: "text-sky-400" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                <Zap className="size-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-base font-semibold tracking-tight text-white">AIV</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Understand how AI engines perceive and recommend your brand. The intelligence layer for the AI-first search era.
            </p>

            <div className="mt-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-600">
                Tracking visibility across
              </p>
              <div className="flex flex-wrap gap-2">
                {PROVIDERS.map((p) => (
                  <span
                    key={p.label}
                    className={`inline-flex items-center rounded-full bg-gradient-to-r ${p.color} border border-white/[0.06] px-2.5 py-1 text-xs font-medium ${p.text}`}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 lg:col-span-3 lg:grid-cols-4">
            {Object.entries(LINKS).map(([section, links]) => (
              <div key={section}>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {section}
                </h3>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-500 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 md:flex-row">
          <p className="text-xs text-slate-600" suppressHydrationWarning>
            © {new Date().getFullYear()} AIV. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">
            AI Search Intelligence Platform
          </p>
        </div>
      </div>
    </footer>
  );
}
