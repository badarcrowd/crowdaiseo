import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { getPlanLimits } from "@/modules/billing/domain/plan-limits";
import { getUsageSummary } from "@/modules/billing/application/usage-service";
import { getTrialStatus } from "@/modules/billing/application/trial-service";
import { getOnboardingStatus } from "@/modules/billing/application/onboarding-service";
import { BillingContent } from "./billing-content";
import type { PlanTier } from "@prisma/client";

type Props = {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ success?: string; canceled?: string; upgrade?: string }>;
};

export const metadata = { title: "Billing & Plans" };

export default async function BillingPage({ params, searchParams }: Props) {
  const { workspace: slug } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const workspace = await prisma.workspace.findFirst({
    where: { slug, members: { some: { userId: user.id } } },
    select: {
      id: true,
      slug: true,
      name: true,
      planTier: true,
      subscriptionStatus: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      subscription: {
        select: {
          cancelAtPeriodEnd: true,
          latestInvoiceAmount: true,
          latestInvoiceStatus: true,
        },
      },
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });

  if (!workspace) redirect("/");

  const isOwnerOrAdmin = ["OWNER", "ADMIN"].includes(
    workspace.members[0]?.role ?? "",
  );

  const [usage, trial, onboarding] = await Promise.all([
    getUsageSummary(workspace.id),
    getTrialStatus(workspace.id),
    getOnboardingStatus(workspace.id),
  ]);

  const limits = getPlanLimits(workspace.planTier as PlanTier);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground">
          Manage your subscription, usage, and billing details.
        </p>
      </div>

      <Suspense>
        <BillingContent
          workspace={{
            id: workspace.id,
            slug: workspace.slug,
            name: workspace.name,
            planTier: workspace.planTier as PlanTier,
            subscriptionStatus: workspace.subscriptionStatus,
            cancelAtPeriodEnd: workspace.subscription?.cancelAtPeriodEnd ?? false,
            currentPeriodStart: workspace.currentPeriodStart,
            currentPeriodEnd: workspace.currentPeriodEnd,
            latestInvoiceAmount: workspace.subscription?.latestInvoiceAmount ?? null,
          }}
          usage={usage}
          trial={trial}
          onboarding={onboarding}
          limits={limits}
          isOwner={isOwnerOrAdmin}
          flashSuccess={!!sp.success}
          flashCanceled={!!sp.canceled}
          openUpgrade={!!sp.upgrade}
        />
      </Suspense>
    </div>
  );
}
