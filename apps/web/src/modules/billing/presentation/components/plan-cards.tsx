"use client";

import { useState, useTransition } from "react";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { PLAN_LIMITS, PLAN_PRICES_USD, type PlanLimits } from "../../domain/plan-limits";
import type { PlanTier } from "@prisma/client";

type BillingInterval = "monthly" | "annual";

type PlanCardsProps = {
  currentPlan: PlanTier;
  workspaceSlug: string;
  onSelectPlan: (tier: PlanTier, interval: BillingInterval) => Promise<void>;
};

const PLANS: { tier: PlanTier; name: string; description: string }[] = [
  { tier: "FREE", name: "Free", description: "Try the platform at no cost" },
  { tier: "STARTER", name: "Starter", description: "For solo practitioners" },
  { tier: "PRO", name: "Pro", description: "For growing teams" },
  { tier: "AGENCY", name: "Agency", description: "For client-facing agencies" },
  { tier: "ENTERPRISE", name: "Enterprise", description: "Custom scale and SLAs" },
];

const FEATURE_LABELS: (keyof PlanLimits)[] = [
  "projects",
  "seats",
  "scansPerMonth",
  "reportsPerMonth",
  "aiProviders",
  "whiteLabel",
  "apiAccess",
  "scheduledReports",
  "advancedAnalytics",
  "ssoEnabled",
  "prioritySupport",
];

const FEATURE_DISPLAY: Partial<Record<keyof PlanLimits, string>> = {
  projects: "Projects",
  seats: "Team seats",
  scansPerMonth: "Scans / month",
  reportsPerMonth: "Reports / month",
  aiProviders: "AI providers",
  whiteLabel: "White label",
  apiAccess: "API access",
  scheduledReports: "Scheduled reports",
  advancedAnalytics: "Advanced analytics",
  ssoEnabled: "Single sign-on",
  prioritySupport: "Priority support",
};

function formatLimitValue(key: keyof PlanLimits, value: unknown): string {
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (value === -1) return "Unlimited";
  if (value === 0) return "—";
  return String(value);
}

export function PlanCards({ currentPlan, onSelectPlan }: PlanCardsProps) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [selecting, setSelecting] = useState<PlanTier | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (tier: PlanTier) => {
    if (tier === "FREE" || tier === "ENTERPRISE") return;
    setSelecting(tier);
    startTransition(async () => {
      await onSelectPlan(tier, interval);
      setSelecting(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Interval toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm", interval === "monthly" ? "font-semibold" : "text-muted-foreground")}>
          Monthly
        </span>
        <button
          onClick={() => setInterval((i) => (i === "monthly" ? "annual" : "monthly"))}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            interval === "annual" ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 translate-x-1 rounded-full bg-white transition-transform",
              interval === "annual" && "translate-x-6",
            )}
          />
        </button>
        <span className={cn("text-sm", interval === "annual" ? "font-semibold" : "text-muted-foreground")}>
          Annual
          <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Save 20%
          </span>
        </span>
      </div>

      {/* Plan grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.filter((p) => p.tier !== "FREE" && p.tier !== "BUSINESS").map(({ tier, name, description }) => {
          const limits = PLAN_LIMITS[tier];
          const prices = PLAN_PRICES_USD[tier];
          const isCurrent = currentPlan === tier;
          const isEnterprise = tier === "ENTERPRISE";
          const price = prices
            ? interval === "annual"
              ? prices.annual
              : prices.monthly
            : null;

          return (
            <div
              key={tier}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6",
                isCurrent && "border-primary ring-2 ring-primary/20",
                tier === "PRO" && !isCurrent && "border-primary/50 bg-primary/[0.02]",
              )}
            >
              {tier === "PRO" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold">{name}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>

              <div className="mb-6">
                {isEnterprise ? (
                  <div className="text-2xl font-bold">Custom</div>
                ) : price !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                ) : null}
                {interval === "annual" && price && !isEnterprise && (
                  <p className="text-xs text-muted-foreground">
                    Billed annually (${(price * 12).toLocaleString()}/yr)
                  </p>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-2">
                {FEATURE_LABELS.map((key) => {
                  const value = limits[key];
                  const label = FEATURE_DISPLAY[key];
                  const display = formatLimitValue(key, value);
                  const isDisabled = display === "—";
                  return (
                    <li
                      key={key}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        isDisabled && "text-muted-foreground/50",
                      )}
                    >
                      <Check
                        className={cn(
                          "size-3.5 shrink-0",
                          isDisabled ? "text-muted-foreground/30" : "text-emerald-500",
                        )}
                      />
                      <span>
                        {label}
                        {display !== "✓" && display !== "—" && (
                          <span className="ml-1 font-medium">{display}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <Button
                variant={isCurrent ? "outline" : "default"}
                disabled={isCurrent || isPending}
                onClick={() => handleSelect(tier)}
                className="w-full"
              >
                {selecting === tier ? (
                  "Redirecting…"
                ) : isCurrent ? (
                  "Current plan"
                ) : isEnterprise ? (
                  "Contact sales"
                ) : (
                  <>
                    <Zap className="size-4" />
                    Upgrade to {name}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
