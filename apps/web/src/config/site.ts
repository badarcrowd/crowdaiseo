export const siteConfig = {
  name: "AIV",
  shortName: "AIV",
  description:
    "Understand how AI engines perceive and recommend your brand. Track visibility across ChatGPT, Claude, Gemini, Perplexity, and more.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    docs: "/docs",
    support: "mailto:support@aiv.app",
    twitter: "https://twitter.com/aivapp",
  },
  marketing: {
    product: [
      { label: "AI Visibility", href: "/ai-visibility", desc: "Track brand mentions across all AI engines" },
      { label: "Market Map", href: "/market-map", desc: "Visualize your competitive AI landscape" },
      { label: "GEO Optimization", href: "/geo-optimization", desc: "Prioritized actions to grow AI presence" },
      { label: "Enterprise Intelligence", href: "/enterprise", desc: "Executive reporting and deep insights" },
      { label: "Reports", href: "/reports", desc: "Shareable AI visibility reports" },
    ],
    pages: [
      { label: "Pricing", href: "/pricing" },
      { label: "Blog", href: "/blog" },
      { label: "Docs", href: "/docs" },
      { label: "Contact", href: "/contact" },
    ],
  },
  nav: {
    primary: [
      { label: "Dashboard", href: "/app/w" },
      { label: "AI Visibility", href: "/ai-visibility" },
      { label: "Market Map", href: "/market-map" },
      { label: "GEO Optimization", href: "/geo-optimization" },
      { label: "Reports", href: "/reports" },
      { label: "Settings", href: "/settings" },
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;
