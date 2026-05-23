"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  Map,
  Target,
  Building2,
  FileBarChart,
  ChevronDown,
  Menu,
  X,
  Zap,
} from "lucide-react";

const PRODUCT_LINKS = [
  {
    href: "/ai-visibility",
    icon: BarChart2,
    label: "AI Visibility",
    desc: "Track brand mentions across all AI engines",
  },
  {
    href: "/market-map",
    icon: Map,
    label: "Market Map",
    desc: "Visualize your competitive AI landscape",
  },
  {
    href: "/geo-optimization",
    icon: Target,
    label: "GEO Optimization",
    desc: "Prioritized actions to grow AI presence",
  },
  {
    href: "/enterprise",
    icon: Building2,
    label: "Enterprise Intelligence",
    desc: "Executive reporting and deep insights",
  },
  {
    href: "/reports",
    icon: FileBarChart,
    label: "Reports",
    desc: "Shareable AI visibility reports",
  },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
            <Zap className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">AIV</span>
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          <div className="relative">
            <button
              onClick={() => setProductOpen(!productOpen)}
              onBlur={() => setTimeout(() => setProductOpen(false), 150)}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              Product
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${productOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {productOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-76 rounded-xl border border-white/[0.08] bg-slate-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
                  style={{ width: 300 }}
                >
                  {PRODUCT_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setProductOpen(false)}
                      className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
                        <item.icon className="size-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{item.label}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{item.desc}</div>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {[
            { href: "/pricing", label: "Pricing" },
            { href: "/blog", label: "Blog" },
            { href: "/docs", label: "Docs" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/sign-in"
            className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/30"
          >
            Get started free
          </Link>
        </div>

        <button
          className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/[0.06] bg-slate-950/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-0.5 px-4 py-3">
              <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-600">
                Product
              </p>
              {PRODUCT_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <item.icon className="size-4 text-blue-400" />
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-white/[0.06]" />
              {[
                { href: "/pricing", label: "Pricing" },
                { href: "/blog", label: "Blog" },
                { href: "/docs", label: "Docs" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-2 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-white/[0.06]" />
              <div className="flex flex-col gap-2 pb-2 pt-1">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className="w-full rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm text-slate-300"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setMobileOpen(false)}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white"
                >
                  Get started free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
