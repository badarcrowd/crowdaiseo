"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

// Re-export so components can import from one place
export { usePostHog } from "posthog-js/react";

const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // use Next.js router events instead
      capture_pageleave: true,
      persistence: "localStorage+cookie",
    });
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Track page views on client-side navigation
export function PostHogPageView() {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.capture("$pageview");
  }, []);
  return null;
}
