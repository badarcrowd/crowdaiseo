import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/modules/billing/infrastructure/stripe";
import { serverEnv } from "@/config/env";
import {
  syncSubscriptionFromStripe,
  syncInvoiceFromStripe,
} from "@/modules/billing/application/subscription-service";
import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/logger";
import { trackServer } from "@/lib/analytics/track";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  if (!serverEnv.STRIPE_WEBHOOK_SECRET) {
    logger.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.warn({ err }, "stripe webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  logger.info({ type: event.type, id: event.id }, "stripe webhook received");

  try {
    await dispatchEvent(event);
  } catch (err) {
    logger.error({ err, type: event.type, id: event.id }, "stripe webhook dispatch failed");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function dispatchEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.resumed": {
      const sub = event.data.object;
      await syncSubscriptionFromStripe(sub);
      await trackServer({
        event: "subscription.updated",
        properties: {
          stripeEvent: event.type,
          subscriptionId: sub.id,
          status: sub.status,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await syncSubscriptionFromStripe(sub);
      await trackServer({
        event: "subscription.canceled",
        properties: { subscriptionId: sub.id },
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      await syncInvoiceFromStripe(invoice);
      // When Stripe charges for a new period, update workspace period fields.
      // In Stripe v22 the subscription ID moved to invoice.parent.subscription_details.subscription.
      const subscriptionId =
        invoice.parent?.type === "subscription_details"
          ? (invoice.parent.subscription_details?.subscription as string | null)
          : null;
      if (invoice.billing_reason === "subscription_cycle" && subscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        await syncSubscriptionFromStripe(sub);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await syncInvoiceFromStripe(invoice);
      await notifyPaymentFailed(invoice);
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.subscription) {
        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const sub = await getStripe().subscriptions.retrieve(subId);
        await syncSubscriptionFromStripe(sub);
      }
      await trackServer({
        event: "checkout.completed",
        properties: {
          workspaceId: session.metadata?.workspaceId,
          userId: session.metadata?.userId,
          sessionId: session.id,
        },
      });
      break;
    }

    case "customer.created": {
      const customer = event.data.object;
      const workspaceId = customer.metadata?.workspaceId;
      if (workspaceId) {
        await prisma.workspace.updateMany({
          where: { id: workspaceId },
          data: { billingCustomerId: customer.id },
        });
      }
      break;
    }

    default:
      logger.debug({ type: event.type }, "unhandled stripe webhook event");
  }
}

async function notifyPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? "");

  const workspace = await prisma.workspace.findFirst({
    where: { billingCustomerId: customerId },
    select: { id: true, name: true },
  });

  if (!workspace) return;

  logger.warn(
    { workspaceId: workspace.id, invoiceId: invoice.id, amount: invoice.amount_due },
    "payment failed",
  );

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { subscriptionStatus: "PAST_DUE" },
  });
}
