import "server-only";
import { PostHog } from "posthog-node";
import { serverEnv } from "@/config/env";

let _client: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  const key = (serverEnv as Record<string, string | undefined>).POSTHOG_API_KEY;
  if (!key) return null;

  if (!_client) {
    _client = new PostHog(key, {
      host: (serverEnv as Record<string, string | undefined>).POSTHOG_HOST ?? "https://app.posthog.com",
      flushAt: 20,
      flushInterval: 10_000,
    });
  }
  return _client;
}

export async function shutdownPostHog(): Promise<void> {
  await _client?.shutdown();
}
