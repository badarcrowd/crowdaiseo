"use client";
import { create } from "zustand";

/**
 * Current-workspace pointer. The server is authoritative — this store
 * caches the slug for fast client-side route building. React Query owns
 * the actual workspace data.
 */
type WorkspaceState = {
  currentSlug: string | null;
  setCurrentSlug: (slug: string | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentSlug: null,
  setCurrentSlug: (slug) => set({ currentSlug: slug }),
}));
