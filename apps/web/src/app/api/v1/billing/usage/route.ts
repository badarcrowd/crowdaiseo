import { withErrorHandling, ok } from "@/lib/api/response";
import { requireWorkspace } from "@/lib/api/context";
import { getUsageSummary } from "@/modules/billing/application/usage-service";
import { getOnboardingStatus } from "@/modules/billing/application/onboarding-service";

/**
 * GET /api/v1/billing/usage
 * Returns the workspace's current period usage counters and onboarding status.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ctx = await requireWorkspace(
    req.headers.get("x-workspace-id") ?? "",
    "VIEWER",
  );

  const [usage, onboarding] = await Promise.all([
    getUsageSummary(ctx.workspaceId),
    getOnboardingStatus(ctx.workspaceId),
  ]);

  return ok({ usage, onboarding });
});
