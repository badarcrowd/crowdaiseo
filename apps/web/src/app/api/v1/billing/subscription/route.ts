import { z } from "zod";
import { withErrorHandling, ok } from "@/lib/api/response";
import { requireWorkspace } from "@/lib/api/context";
import { prisma } from "@/lib/prisma/client";
import { getPlanLimits } from "@/modules/billing/domain/plan-limits";
import { getTrialStatus } from "@/modules/billing/application/trial-service";
import type { PlanTier } from "@prisma/client";

/**
 * GET /api/v1/billing/subscription
 * Returns current subscription state, plan limits, and trial status.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ctx = await requireWorkspace(
    req.headers.get("x-workspace-id") ?? "",
    "VIEWER",
  );

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: ctx.workspaceId },
    select: {
      planTier: true,
      subscriptionStatus: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      subscription: {
        select: {
          stripeSubscriptionId: true,
          cancelAtPeriodEnd: true,
          quantity: true,
          latestInvoiceAmount: true,
          latestInvoiceStatus: true,
          trialEnd: true,
        },
      },
    },
  });

  const limits = getPlanLimits(workspace.planTier as PlanTier);
  const trial = await getTrialStatus(ctx.workspaceId);

  return ok({
    planTier: workspace.planTier,
    status: workspace.subscriptionStatus,
    currentPeriodStart: workspace.currentPeriodStart,
    currentPeriodEnd: workspace.currentPeriodEnd,
    cancelAtPeriodEnd: workspace.subscription?.cancelAtPeriodEnd ?? false,
    seats: workspace.subscription?.quantity ?? 1,
    latestInvoice: workspace.subscription?.latestInvoiceAmount != null
      ? {
          amount: workspace.subscription.latestInvoiceAmount,
          status: workspace.subscription.latestInvoiceStatus,
        }
      : null,
    limits,
    trial,
  });
});
