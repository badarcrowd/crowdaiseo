"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/** Cookie name per workspace — keeps project selection isolated between workspaces. */
const projectCookieName = (workspaceId: string) =>
  `psel_${workspaceId}`;

/**
 * Persist the selected project in a server-side cookie so every page in the
 * workspace picks it up without needing URL search params on every route.
 */
export async function selectProjectAction(
  workspaceId: string,
  projectId: string,
  workspaceSlug: string,
) {
  const jar = await cookies();
  jar.set(projectCookieName(workspaceId), projectId, {
    path: `/app/w/${workspaceSlug}`,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false, // readable client-side if needed
    sameSite: "lax",
  });
  revalidatePath(`/app/w/${workspaceSlug}`, "layout");
}

/**
 * Read the currently selected project ID from the cookie.
 * Returns `undefined` if nothing has been selected yet.
 */
export async function getSelectedProjectId(
  workspaceId: string,
): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(projectCookieName(workspaceId))?.value;
}
