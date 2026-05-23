"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Building2, ArrowRight, CheckCircle2 } from "lucide-react";
import { FadeUp, FadeIn } from "@/components/marketing/animate";

const CONTACT_OPTIONS = [
  {
    icon: MessageSquare,
    title: "Sales inquiry",
    desc: "Talk to our sales team about Professional or Enterprise plans.",
    action: "sales",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Building2,
    title: "Enterprise",
    desc: "Custom deployments, security reviews, and volume pricing.",
    action: "enterprise",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Mail,
    title: "General inquiry",
    desc: "Questions, feedback, or partnership opportunities.",
    action: "general",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [type, setType] = useState("sales");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="pt-16">
      <section className="relative overflow-hidden px-6 pb-24 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 size-[500px] -translate-x-1/2 rounded-full bg-blue-600/6 blur-3xl" />
        </div>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <div>
              <FadeIn>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
                  <Mail className="size-3.5" />
                  Contact us
                </div>
              </FadeIn>
              <FadeUp delay={0.1}>
                <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                  <span className="gradient-text">Let&apos;s talk</span>
                  <br />
                  <span className="text-white">about your AI visibility</span>
                </h1>
                <p className="mb-8 text-lg text-slate-400">
                  Whether you&apos;re exploring a free trial, evaluating enterprise, or just have questions — we&apos;re here.
                </p>
              </FadeUp>

              <FadeUp delay={0.2}>
                <div className="space-y-3">
                  {CONTACT_OPTIONS.map((opt) => (
                    <button
                      key={opt.action}
                      onClick={() => setType(opt.action)}
                      className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                        type === opt.action
                          ? "border-blue-500/30 bg-blue-500/10"
                          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${opt.bg}`}>
                        <opt.icon className={`size-4 ${opt.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{opt.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </FadeUp>

              <FadeUp delay={0.3} className="mt-8">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">What to expect</p>
                  <div className="space-y-2">
                    {[
                      "Response within 24 hours",
                      "No sales pressure",
                      "Personalized demo available",
                      "Custom pricing for Enterprise",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            </div>

            <FadeIn delay={0.2}>
              {submitted ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-12 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <CheckCircle2 className="size-8 text-emerald-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">Message received</h3>
                  <p className="text-slate-400">We&apos;ll get back to you within 24 hours.</p>
                  <Link
                    href="/"
                    className="mt-6 text-sm text-blue-400 hover:text-blue-300"
                  >
                    ← Back to home
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">
                          First name
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                          placeholder="Alex"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">
                          Last name
                        </label>
                        <input
                          required
                          type="text"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                          placeholder="Johnson"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Work email
                      </label>
                      <input
                        required
                        type="email"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                        placeholder="alex@company.com"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Company
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                        placeholder="Acme Corp"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Team size
                      </label>
                      <select className="w-full rounded-xl border border-white/[0.08] bg-slate-900 px-4 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50">
                        <option value="">Select team size</option>
                        <option>1–10</option>
                        <option>11–50</option>
                        <option>51–200</option>
                        <option>200+</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">
                        Message
                      </label>
                      <textarea
                        rows={4}
                        className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                        placeholder="Tell us about your brand and what you're trying to achieve with AI visibility…"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500"
                    >
                      Send message <ArrowRight className="size-4" />
                    </button>
                  </form>
                </div>
              )}
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}
