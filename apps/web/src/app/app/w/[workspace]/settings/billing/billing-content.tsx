"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  ReceiptText,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialBanner } from "@/modules/billing/presentation/components/trial-banner";
import { UsageMeters } from "@/modules/billing/presentation/components/usage-meters";
import { PlanCards } from "@/modules/billing/presentation/components/plan-cards";
import { UpgradeModal } from "@/modules/billing/presentation/components/upgrade-modal";
import { OnboardingChecklist } from "@/modules/billing/presentation/components/onboarding-checklist";
import { toast } from "sonner";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import type { UsageSummary, TrialStatus } from "@/modules/billing/domain/types";
import type { PlanLimits } from "@/modules/billing/domain/plan-limits";

type WorkspaceProps = {
  id: string;
  slug: string;
  name: string;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  latestInvoiceAmount: number | null;
};

type BillingContentProps = {
  workspace: WorkspaceProps;
  usage: UsageSummary;
  trial: TrialStatus;
  onboarding: Awaited<ReturnType<typeof import("@/modules/billing/application/onboarding-service").getOnboardingStatus>>;
  limits: PlanLimits;
  isOwner: boolean;
  flashSuccess: boolean;
  flashCanceled: boolean;
  openUpgrade: boolean;
};

export function BillingContent({
  workspace,
  usage,
  trial,
  onboarding,
  limits,
  isOwner,
  flashSuccess,
  flashCanceled,
  openUpgrade,
}: BillingContentProps) {
  const router = useRouter();
  const [upgradeOpen, setUpgradeOpen] = useState(openUpgrade);
  const [portalPending, startPortalTransition] = useTransition();

  useEffect(() => {
    if (flashSuccess) toast.success("Subscription activated! Welcome aboard.");
    if (flashCanceled) toast.info("Checkout canceled — no changes made.");
  }, [flashSuccess, flashCanceled]);

  const handleUpgrade = async (tier: PlanTier, interval: "monthly" | "annual") => {
    const res = await fetch("/api/v1/billing/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-workspace-id": workspace.id,
      },
      body: JSON.stringify({ planTier: tier, billingInterval: interval }),
    });
    const json = await res.json();
    if (json.data?.url) {
      window.location.href = json.data.url;
    } else {
      toast.error("Could not start checkout. Please try again.");
    }
  };

  const handleManageBilling = () => {
    startPortalTransition(async () => {
      const res = await fetch("/api/v1/billing/portal", {
        method: "POST",
        headers: { "x-workspace-id": workspace.id },
      });
      const json = await res.json();
      if (json.data?.url) {
        window.location.href = json.data.url;
      } else {
        toast.error("Could not open billing portal.");
      }
    });
  };

  const isPaid = !["FREE", "TRIALING"].includes(workspace.subscriptionStatus);
  const isPastDue = workspace.subscriptionStatus === "PAST_DUE";

  return (
    <div className="space-y-8">
      {/* Trial banner */}
      {trial.active && (
        <TrialBanner trial={trial} workspaceSlug={workspace.slug} />
      )}

      {/* Past-due warning */}
      {isPastDue && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">Payment failed</p>
            <p className="text-sm">
              Your last invoice was unpaid. Update your payment method to continue
              using all features.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleManageBilling}
            disabled={portalPending}
            className="ml-auto shrink-0"
          >
            Update payment
          </Button>
        </div>
      )}

      {/* Current plan summary */}
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {workspace.planTier.charAt(0) + workspace.planTier.slice(1).toLowerCase()} Plan
            </h2>
            <p className="text-sm text-muted-foreground capitalize">
              {workspace.subscriptionStatus.toLowerCase().replace("_", " ")}
              {workspace.cancelAtPeriodEnd && " · Cancels at period end"}
            </p>
            {workspace.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                Renews{" "}
                {new Date(workspace.currentPeriodEnd).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          {isOwner && (
            <div className="flex gap-2">
              {isPaid ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageBilling}
                  disabled={portalPending}
                >
                  <Settings2 className="size-4" />
                  Manage billing
                </Button>
              ) : (
                <Button size="sm" onClick={() => setUpgradeOpen(true)}>
                  Upgrade plan
                </Button>
              )}
            </div>
          )}
        </div>

        {workspace.latestInvoiceAmount != null && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
            <ReceiptText className="size-4" />
            Last invoice: ${(workspace.latestInvoiceAmount / 100).toFixed(2)}
          </div>
        )}
      </section>

      {/* Usage meters */}
      <section>
        <h2 className="mb-3 text-base font-semibold">This period's usage</h2>
        <UsageMeters usage={usage} />
      </section>

      {/* Onboarding checklist (during trial) */}
      {(trial.active || !onboarding.activated) && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Getting started</h2>
          <OnboardingChecklist
            milestones={onboarding.milestones}
            activationScore={onboarding.activationScore}
            activated={onboarding.activated}
          />
        </section>
      )}

      {/* Plan cards for upgrade */}
      {isOwner && workspace.planTier !== "ENTERPRISE" && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Available plans</h2>
          <PlanCards
            currentPlan={workspace.planTier}
            workspaceSlug={workspace.slug}
            onSelectPlan={handleUpgrade}
          />
        </section>
      )}

      {/* Upgrade modal */}
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
