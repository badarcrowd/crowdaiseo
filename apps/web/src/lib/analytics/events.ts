// Typed event catalog — every tracked event lives here.
// Server events use trackServer(), client events use the PostHog client directly.

export type AnalyticsEventName =
  // Activation
  | "workspace.created"
  | "onboarding.milestone_completed"
  | "onboarding.activated"
  // Subscription
  | "subscription.trial_started"
  | "subscription.checkout_started"
  | "checkout.completed"
  | "subscription.updated"
  | "subscription.canceled"
  | "subscription.upgraded"
  | "subscription.downgraded"
  // Core product
  | "project.created"
  | "scan.started"
  | "scan.completed"
  | "scan.failed"
  | "report.generated"
  | "report.exported"
  | "report.shared"
  | "report.viewed_public"
  | "insight.viewed"
  | "insight.shared"
  | "insight.acknowledged"
  // Growth
  | "invite.sent"
  | "invite.accepted"
  | "public_link.created"
  | "public_link.viewed"
  // Feature usage
  | "api_key.created"
  | "white_label.configured"
  | "crawl.started"
  | "crawl.completed"
  // Retention
  | "user.signed_in"
  | "user.signed_out"
  | "workspace.switched"
  | "dashboard.viewed"
  | "billing_page.viewed"
  | "upgrade_modal.opened"
  | "upgrade_modal.cta_clicked";

export type AnalyticsEventProperties = {
  // Common
  workspaceId?: string;
  userId?: string;
  planTier?: string;
  // Contextual
  [key: string]: unknown;
};

export type TrackEventInput = {
  event: AnalyticsEventName | string;
  workspaceId?: string;
  userId?: string;
  properties?: AnalyticsEventProperties;
};
