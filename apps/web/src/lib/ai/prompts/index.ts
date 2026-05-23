/**
 * Versioned prompt registry. Reference prompts by id everywhere instead
 * of inlining strings so they can be audited, A/B tested, and updated
 * without code changes in the future.
 */
export const PROMPTS = {
  AI_VISIBILITY_SCAN_V1: {
    id: "ai-visibility.scan.v1",
    system:
      "You are an unbiased market analyst. When asked, list brands neutrally.",
  },
} as const;

export type PromptId = (typeof PROMPTS)[keyof typeof PROMPTS]["id"];
