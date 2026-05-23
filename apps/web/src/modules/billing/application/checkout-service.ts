import "server-only";
import { prisma } from "@/lib/prisma/client";
import { getStripe, getStripePriceId, isStripeConfigured } from "../infrastructure/stripe";
import type { CheckoutResult, CreateCheckoutInput, CreatePortalInput } from "../domain/types";
import { AppError } from "@/lib/errors";

export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) {
    throw new AppError({
      code: "SERVICE_UNAVAILABLE",
      message: "Billing is not configured",
      status: 503,
    });
  }

  const { workspaceId, userId, userEmail, planTier, billingInterval, successUrl, cancelUrl } = input;

  // Reuse existing Stripe customer or create a new one
  let customerId = await getOrCreateStripeCustomer(workspaceId, userEmail);

  const priceId = getStripePriceId(planTier, billingInterval);
  if (!priceId) {
    throw new AppError({
      code: "BAD_REQUEST",
      message: `Price not configured for ${planTier} ${billingInterval}`,
      status: 400,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: planTier !== "FREE" ? 7 : undefined,
      metadata: {
        workspaceId,
        userId,
        plan: planTier.toLowerCase(),
      },
    },
    metadata: { workspaceId, userId },
    client_reference_id: workspaceId,
  });

  return { url: session.url!, sessionId: session.id };
}

export async function createPortalSession(
  input: CreatePortalInput,
): Promise<string> {
  const stripe = getStripe();
  if (!stripe) {
    throw new AppError({
      code: "SERVICE_UNAVAILABLE",
      message: "Billing is not configured",
      status: 503,
    });
  }

  const { workspaceId, returnUrl } = input;

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { billingCustomerId: true },
  });

  if (!workspace.billingCustomerId) {
    throw new Error("No billing customer associated with this workspace");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.billingCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

async function getOrCreateStripeCustomer(
  workspaceId: string,
  email: string,
): Promise<string> {
  const stripe = getStripe();

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { billingCustomerId: true, name: true },
  });

  if (workspace.billingCustomerId) return workspace.billingCustomerId;

  const customer = await stripe.customers.create({
    email,
    name: workspace.name,
    metadata: { workspaceId },
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { billingCustomerId: customer.id },
  });

  return customer.id;
}
