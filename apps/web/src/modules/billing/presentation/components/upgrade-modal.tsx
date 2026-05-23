"use client";

import { useState, useTransition } from "react";
import { Zap, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLAN_PRICES_USD } from "../../domain/plan-limits";
import type { PlanTier } from "@prisma/client";

type UpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string; // e.g. "You've reached your scan limit"
  recommendedPlan?: PlanTier;
  onUpgrade: (tier: PlanTier, interval: "monthly" | "annual") => Promise<void>;
};

const RECOMMENDED_PLAN: PlanTier = "PRO";

export function UpgradeModal({
  open,
  onOpenChange,
  reason,
  recommendedPlan = RECOMMENDED_PLAN,
  onUpgrade,
}: UpgradeModalProps) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [isPending, startTransition] = useTransition();

  const prices = PLAN_PRICES_USD[recommendedPlan];
  const price = prices
    ? interval === "annual"
      ? prices.annual
      : prices.monthly
    : null;

  const handleUpgrade = () => {
    startTransition(async () => {
      await onUpgrade(recommendedPlan, interval);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            Upgrade your plan
          </DialogTitle>
        </DialogHeader>

        {reason && (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            {reason}
          </p>
        )}

        <div className="space-y-4">
          {/* Interval toggle */}
          <div className="flex rounded-lg border p-1">
            {(["monthly", "annual"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  interval === i
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {i === "annual" ? "Annual (save 20%)" : "Monthly"}
              </button>
            ))}
          </div>

          {/* Price display */}
          {price !== null && (
            <div className="text-center">
              <span className="text-4xl font-bold">${price}</span>
              <span className="text-muted-foreground">/mo</span>
              {interval === "annual" && (
                <p className="text-sm text-muted-foreground">
                  Billed annually · ${(price * 12).toLocaleString()}/yr
                </p>
              )}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleUpgrade}
            disabled={isPending}
          >
            {isPending ? "Redirecting to Stripe…" : `Upgrade to ${recommendedPlan}`}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Secure payment via Stripe · Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
