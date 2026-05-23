"use client";

import { useEffect, useState } from "react";

export type WizardState = {
  name: string;
  domain: string;
  description: string;
  country: string;
  language: string;
  keywords: string[];
  competitors: Array<{ name: string; domain?: string }>;
};

export const EMPTY_STATE: WizardState = {
  name: "",
  domain: "",
  description: "",
  country: "US",
  language: "en",
  keywords: [],
  competitors: [],
};

const STORAGE_PREFIX = "aiv.project-wizard";

/**
 * Autosave wizard state to localStorage scoped by workspace, so users
 * can refresh / navigate away mid-wizard without losing progress.
 */
export const useWizardState = (workspaceId: string) => {
  const key = `${STORAGE_PREFIX}:${workspaceId}`;
  const [state, setState] = useState<WizardState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState({ ...EMPTY_STATE, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota — fine to drop
    }
  }, [state, hydrated, key]);

  const reset = () => {
    setState(EMPTY_STATE);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return { state, setState, reset, hydrated };
};
