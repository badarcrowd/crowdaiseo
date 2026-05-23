import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/config/env";

let _stripe: Stripe | null = null;

/**
 * Get Stripe client. Returns null if not configured.
 */
export function getStripe(): Stripe | null {
  if (!serverEnv.STRIPE_SECRET_KEY) {
    return null; // Stripe not configured
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

/**
 * Check if Stripe is configured.
 */
export function isStripeConfigured(): boolean {
  return Boolean(serverEnv.STRIPE_SECRET_KEY);
}

// Stripe price IDs per plan tier + billing interval
// Set STRIPE_PRICE_ID_* in env to wire up real prices
export function getStripePriceId(
  planTier: string,
  interval: "monthly" | "annual",
): string | null {
  if (!isStripeConfigured()) return null;
  const key = `STRIPE_PRICE_ID_${planTier.toUpperCase()}_${interval === "annual" ? "ANNUAL" : "MONTHLY"}` as keyof typeof serverEnv;
  const priceId = (serverEnv as Record<string, string | undefined>)[key];
  return priceId ?? null;
}
