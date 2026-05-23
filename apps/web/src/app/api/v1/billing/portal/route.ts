import { withErrorHandling, created } from "@/lib/api/response";
import { requireWorkspace } from "@/lib/api/context";
import { createPortalSession } from "@/modules/billing/application/checkout-service";
import { clientEnv } from "@/config/env";

/**
 * POST /api/v1/billing/portal
 * Creates a Stripe Customer Portal session for managing invoices,
 * payment methods, and subscriptions.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const ctx = await requireWorkspace(
    req.headers.get("x-workspace-id") ?? "",
    "OWNER",
  );

  const url = await createPortalSession({
    workspaceId: ctx.workspaceId,
    returnUrl: `${clientEnv.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return created({ url });
});
