import { z } from "zod";
import { withErrorHandling, created } from "@/lib/api/response";
import { requireWorkspace } from "@/lib/api/context";
import { createCheckoutSession } from "@/modules/billing/application/checkout-service";
import { clientEnv } from "@/config/env";
import type { PlanTier } from "@prisma/client";

const schema = z.object({
  planTier: z.enum(["STARTER", "PRO", "AGENCY", "ENTERPRISE"]),
  billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
});

/**
 * POST /api/v1/billing/checkout
 * Creates a Stripe Checkout session and returns the redirect URL.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const body = schema.parse(await req.json());
  const ctx = await requireWorkspace(
    // workspaceId from x-workspace-id header
    req.headers.get("x-workspace-id") ?? "",
    "OWNER",
  );

  const appUrl = clientEnv.NEXT_PUBLIC_APP_URL;
  const result = await createCheckoutSession({
    workspaceId: ctx.workspaceId,
    userId: ctx.user.id,
    userEmail: ctx.user.email,
    planTier: body.planTier as PlanTier,
    billingInterval: body.billingInterval,
    successUrl: `${appUrl}/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/settings/billing?canceled=1`,
  });

  return created(result);
});
