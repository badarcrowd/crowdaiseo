import { prisma } from "@/lib/prisma/client";
import type { PromptStore } from "../domain/ports";
import type { PromptInput } from "../domain/entities";

const toInput = (
  p: {
    id: string;
    workspaceId: string;
    projectId: string;
    name: string;
    intent: string | null;
  },
  v: { version: number; content: string; variables: unknown },
): PromptInput => ({
  id: p.id,
  workspaceId: p.workspaceId,
  projectId: p.projectId,
  name: p.name,
  intent: p.intent,
  version: v.version,
  content: v.content,
  variables: Array.isArray(v.variables)
    ? (v.variables as Array<{ name: string; required?: boolean }>)
    : [],
});

export const promptStore: PromptStore = {
  async getActive(promptId) {
    const p = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!p || p.versions.length === 0) return null;
    return toInput(p, p.versions[0]);
  },

  async getVersion(promptId, version) {
    const v = await prisma.promptVersion.findUnique({
      where: { promptId_version: { promptId, version } },
      include: {
        prompt: {
          select: {
            id: true,
            workspaceId: true,
            projectId: true,
            name: true,
            intent: true,
          },
        },
      },
    });
    if (!v) return null;
    return toInput(v.prompt, v);
  },

  async listForProject(projectId) {
    const ps = await prisma.prompt.findMany({
      where: { projectId, status: "ACTIVE" },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    return ps
      .filter((p) => p.versions.length > 0)
      .map((p) => toInput(p, p.versions[0]));
  },
};
