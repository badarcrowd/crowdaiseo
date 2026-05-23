import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import { getStripe } from "../infrastructure/stripe";
import { resetPeriodQuota } from "./usage-service";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  incomplete: "INCOMPLETE",
  incomplete_expired: "CANCELED",
  paused: "PAUSED",
};

const STRIPE_TIER_MAP: Record<string, PlanTier> = {
  starter: "STARTER",
  pro: "PRO",
  agency: "AGENCY",
  business: "AGENCY",
  enterprise: "ENTERPRISE",
};

// Resolves the PlanTier from Stripe metadata or price nickname
function resolvePlanTier(sub: Stripe.Subscription): PlanTier {
  const meta = (sub.metadata?.plan ?? "").toLowerCase();
  if (meta && STRIPE_TIER_MAP[meta]) return STRIPE_TIER_MAP[meta];
  const nickname = ((sub.items.data[0]?.price?.nickname) ?? "").toLowerCase();
  for (const [key, tier] of Object.entries(STRIPE_TIER_MAP)) {
    if (nickname.includes(key)) return tier;
  }
  return "PRO";
}

// Full upsert of local Subscription mirror from a Stripe subscription object.
// Called by the webhook handler for created/updated/deleted events.
export async function syncSubscriptionFromStripe(
  stripeSub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof stripeSub.customer === "string"
      ? stripeSub.customer
      : stripeSub.customer.id;

  const workspace = await prisma.workspace.findFirst({
    where: { billingCustomerId: customerId },
  });

  if (!workspace) {
    logger.warn({ customerId }, "stripe subscription sync: no workspace for customer");
    return;
  }

  const planTier = resolvePlanTier(stripeSub);
  const status = STRIPE_STATUS_MAP[stripeSub.status] ?? "ACTIVE";
  const firstItem = stripeSub.items.data[0];
  const periodStart = new Date((firstItem?.current_period_start ?? stripeSub.billing_cycle_anchor) * 1000);
  const periodEnd = new Date((firstItem?.current_period_end ?? stripeSub.billing_cycle_anchor) * 1000);
  const trialStart = stripeSub.trial_start
    ? new Date(stripeSub.trial_start * 1000)
    : null;
  const trialEnd = stripeSub.trial_end
    ? new Date(stripeSub.trial_end * 1000)
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        stripeSubscriptionId: stripeSub.id,
        stripeCustomerId: customerId,
        stripePriceId: stripeSub.items.data[0]?.price?.id ?? "",
        planTier,
        status,
        quantity: stripeSub.items.data[0]?.quantity ?? 1,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        canceledAt: stripeSub.canceled_at
          ? new Date(stripeSub.canceled_at * 1000)
          : null,
        trialStart,
        trialEnd,
        metadata: stripeSub.metadata as never,
      },
      update: {
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: stripeSub.items.data[0]?.price?.id ?? "",
        planTier,
        status,
        quantity: stripeSub.items.data[0]?.quantity ?? 1,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        canceledAt: stripeSub.canceled_at
          ? new Date(stripeSub.canceled_at * 1000)
          : null,
        trialStart,
        trialEnd,
        metadata: stripeSub.metadata as never,
      },
    });

    // Keep workspace denormalized fields in sync
    await tx.workspace.update({
      where: { id: workspace.id },
      data: {
        planTier: status === "CANCELED" ? "FREE" : planTier,
        subscriptionId: stripeSub.id,
        subscriptionStatus: status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialEndsAt: trialEnd,
      },
    });
  });

  // Reset usage quota when a new period starts
  if (status === "ACTIVE") {
    await resetPeriodQuota(workspace.id, periodStart, periodEnd);
  }

  logger.info(
    { workspaceId: workspace.id, planTier, status },
    "subscription synced from stripe",
  );
}

// Sync latest invoice fields to the subscription row
export async function syncInvoiceFromStripe(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? "");

  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      latestInvoiceId: invoice.id,
      latestInvoiceStatus: invoice.status,
      latestInvoiceAmount: invoice.amount_due,
    },
  });

  if (invoice.status === "open") {
    await prisma.workspace.update({
      where: { id: sub.workspaceId },
      data: { subscriptionStatus: "PAST_DUE" },
    });
  }
}

// Cancel a subscription at period end (graceful)
export async function cancelSubscription(workspaceId: string): Promise<void> {
  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { workspaceId },
  });
  const stripe = getStripe();
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  await prisma.subscription.update({
    where: { workspaceId },
    data: { cancelAtPeriodEnd: true },
  });
}

// Immediately cancel (used on fraud detection or admin action)
export async function cancelSubscriptionImmediately(
  workspaceId: string,
): Promise<void> {
  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { workspaceId },
  });
  const stripe = getStripe();
  await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
  await prisma.$transaction([
    prisma.subscription.update({
      where: { workspaceId },
      data: { status: "CANCELED", canceledAt: new Date() },
    }),
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { planTier: "FREE", subscriptionStatus: "CANCELED" },
    }),
  ]);
}

// Change plan mid-cycle (proration handled by Stripe)
export async function changePlan(
  workspaceId: string,
  newPriceId: string,
  newPlanTier: PlanTier,
): Promise<void> {
  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { workspaceId },
  });
  const stripe = getStripe();
  const updated = await stripe.subscriptions.update(
    sub.stripeSubscriptionId,
    {
      items: [{ id: sub.stripeSubscriptionId, price: newPriceId }],
      proration_behavior: "create_prorations",
      metadata: { plan: newPlanTier.toLowerCase() },
    },
  );
  await syncSubscriptionFromStripe(updated);
}
