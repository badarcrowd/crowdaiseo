import { prisma } from "@/lib/prisma/client";
import type { EntityResolver } from "../domain/ports";

/**
 * Pulls brand + competitor names for a project. Brand is derived from
 * the Project's `name` (and `domain` as an additional alias); the
 * `competitors` table supplies the rest.
 */
export const entityResolver: EntityResolver = {
  async forProject(projectId) {
    const [project, competitors] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, domain: true },
      }),
      prisma.competitor.findMany({
        where: { projectId },
        select: { name: true, aliases: true },
      }),
    ]);
    if (!project) {
      return { brand: { name: "", aliases: [] }, competitors: [] };
    }
    const brandAliases = project.domain
      ? [project.domain, project.domain.replace(/^www\./, "")]
      : [];
    return {
      brand: { name: project.name, aliases: brandAliases },
      competitors: competitors.map((c) => ({
        name: c.name,
        aliases: c.aliases,
      })),
    };
  },
};
