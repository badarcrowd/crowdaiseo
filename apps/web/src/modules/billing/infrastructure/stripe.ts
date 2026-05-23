import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/config/env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!_stripe) {
    _stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
      telemetry: false,
    });
  }
  return _stripe;
}

// Stripe price IDs per plan tier + billing interval
// Set STRIPE_PRICE_ID_* in env to wire up real prices
export function getStripePriceId(
  planTier: string,
  interval: "monthly" | "annual",
): string {
  const key = `STRIPE_PRICE_ID_${planTier.toUpperCase()}_${interval === "annual" ? "ANNUAL" : "MONTHLY"}` as keyof typeof serverEnv;
  const priceId = (serverEnv as Record<string, string | undefined>)[key];
  if (!priceId) {
    throw new Error(`Stripe price ID not configured for ${planTier} ${interval}: set ${key}`);
  }
  return priceId;
}
