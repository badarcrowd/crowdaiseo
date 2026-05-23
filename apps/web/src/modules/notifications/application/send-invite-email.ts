import "server-only";

export type SendInviteEmailInput = {
  to: string;
  workspaceName: string;
  inviterEmail: string;
  acceptUrl: string;
};

/**
 * Stub transport. Replace with a Resend / Postmark / SES adapter — the
 * worker queue is already wired (see lib/queue), so the production
 * implementation should enqueue a job rather than send inline.
 */
export const sendInviteEmail = async (input: SendInviteEmailInput) => {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[email] invite -> ${input.to}\n  workspace: ${input.workspaceName}\n  url: ${input.acceptUrl}`,
    );
    return;
  }
  // TODO: wire to real transport (Resend recommended).
};
