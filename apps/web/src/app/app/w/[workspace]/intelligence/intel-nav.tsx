"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Lightbulb, Swords, Quote, Map, Globe } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "", label: "Overview", icon: Brain },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/competitors", label: "Competitors", icon: Swords },
  { href: "/citations", label: "Citations", icon: Quote },
  { href: "/recommendations", label: "Recommendations", icon: Map },
  { href: "/market-map", label: "Market Map", icon: Globe },
];

export function IntelNav({ base }: Readonly<{ base: string }>) {
  const pathname = usePathname();

  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const full = `${base}${href}`;
        const active =
          href === ""
            ? pathname === full
            : pathname === full || pathname.startsWith(`${full}/`);
        return (
          <Link
            key={label}
            href={full}
            className={cn(
              "group flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
