import Link from "next/link";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/marketing/animate";

export const metadata = {
  title: "Blog — AIV",
  description:
    "Insights on AI search visibility, GEO optimization, and brand intelligence for the AI-first era.",
};

const FEATURED = {
  slug: "what-is-geo-optimization",
  tag: "GEO Strategy",
  tagColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  title: "What is GEO Optimization and why it matters in 2025",
  excerpt:
    "Generative Engine Optimization (GEO) is the emerging practice of optimizing content and brand signals so that AI engines — not just search engines — recommend and cite your brand. Here's everything you need to know.",
  date: "May 15, 2025",
  readTime: "8 min read",
  author: "AIV Team",
};

const POSTS = [
  {
    slug: "chatgpt-brand-mentions",
    tag: "AI Visibility",
    tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    title: "How ChatGPT decides which brands to mention — and how to influence it",
    excerpt: "A deep-dive into the signals ChatGPT uses when constructing brand recommendations, based on our analysis of 2M+ queries.",
    date: "May 10, 2025",
    readTime: "12 min read",
  },
  {
    slug: "share-of-voice-ai",
    tag: "Market Intelligence",
    tagColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    title: "Share of voice in AI search: the metric your competitors are ignoring",
    excerpt: "Traditional SOV measures social and search. AI SOV measures something more valuable — the percentage of AI recommendations that name your brand.",
    date: "May 6, 2025",
    readTime: "7 min read",
  },
  {
    slug: "structured-data-ai",
    tag: "Technical SEO",
    tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Structured data for AI engines: which schemas actually work",
    excerpt: "Not all structured data is equal in the eyes of AI. We tested 40 schema types across 6 providers and ranked them by citation impact.",
    date: "April 29, 2025",
    readTime: "10 min read",
  },
  {
    slug: "perplexity-citations",
    tag: "AI Visibility",
    tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    title: "Perplexity citation intelligence: what gets cited and why",
    excerpt: "Perplexity is uniquely transparent about its source citations. Here's what our research reveals about the anatomy of a Perplexity citation.",
    date: "April 22, 2025",
    readTime: "9 min read",
  },
  {
    slug: "geo-vs-seo",
    tag: "GEO Strategy",
    tagColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    title: "GEO vs. SEO: how to build a strategy that wins in both",
    excerpt: "GEO and SEO are not in conflict — but they're optimized for different signals. Here's how to build a unified approach.",
    date: "April 15, 2025",
    readTime: "6 min read",
  },
  {
    slug: "enterprise-ai-brand",
    tag: "Enterprise",
    tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Enterprise AI brand perception: what the C-suite needs to know",
    excerpt: "AI engines are forming opinions about your brand at scale. Here's how to measure, manage, and improve enterprise AI brand perception.",
    date: "April 8, 2025",
    readTime: "11 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="pt-16">
      <section className="relative overflow-hidden px-6 pb-12 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[400px] -translate-x-1/2 rounded-full bg-blue-600/6 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <FadeUp>
            <div className="mb-4 flex justify-center">
              <BookOpen className="size-8 text-blue-400" />
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight">
              <span className="gradient-text">AI Visibility</span>{" "}
              <span className="text-white">Blog</span>
            </h1>
            <p className="text-lg text-slate-400">
              Strategies, research, and insights for the AI-first search era.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Featured post */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <FadeUp>
            <Link href={`/blog/${FEATURED.slug}`} className="group block">
              <div className="glow-card overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-slate-900 to-slate-950 transition-all hover:-translate-y-0.5">
                <div className="grid items-center gap-8 p-8 lg:grid-cols-2">
                  <div>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${FEATURED.tagColor}`}>
                      {FEATURED.tag}
                    </span>
                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-white group-hover:text-blue-300 transition-colors md:text-3xl">
                      {FEATURED.title}
                    </h2>
                    <p className="mt-3 text-slate-400">{FEATURED.excerpt}</p>
                    <div className="mt-5 flex items-center gap-4 text-xs text-slate-500">
                      <span>{FEATURED.date}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {FEATURED.readTime}
                      </span>
                    </div>
                    <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-blue-400 group-hover:gap-2.5 transition-all">
                      Read article <ArrowRight className="size-3.5" />
                    </div>
                  </div>
                  <div className="flex h-48 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-violet-500/5 border border-white/[0.06] lg:h-64">
                    <div className="text-center">
                      <div className="text-5xl font-bold gradient-text">GEO</div>
                      <div className="mt-2 text-sm text-slate-500">Generative Engine Optimization</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* Post grid */}
      <section className="px-6 py-8 pb-24">
        <div className="mx-auto max-w-7xl">
          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((post) => (
              <StaggerItem key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block h-full">
                  <div className="glow-card flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition-all hover:-translate-y-0.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${post.tagColor}`}>
                      {post.tag}
                    </span>
                    <h3 className="mt-4 flex-1 text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {post.title}
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
                    <div className="mt-5 flex items-center justify-between text-xs text-slate-600">
                      <span>{post.date}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {post.readTime}
                      </span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </div>
  );
}
