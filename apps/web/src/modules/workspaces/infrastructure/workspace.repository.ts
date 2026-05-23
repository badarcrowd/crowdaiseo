import "server-only";
import { prisma } from "@/lib/prisma/client";
import type { WorkspaceRepository } from "../domain/ports";

export const workspaceRepository: WorkspaceRepository = {
  async findBySlug(slug) {
    return prisma.workspace.findUnique({ where: { slug } });
  },

  async findById(id) {
    return prisma.workspace.findUnique({ where: { id } });
  },

  async listForUser(userId) {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { joinedAt: "asc" },
    });
    return memberships.map((m) => m.workspace);
  },

  async create({ slug, name, ownerId }) {
    return prisma.workspace.create({ data: { slug, name, ownerId } });
  },

  async addMember({ workspaceId, userId, role }) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      update: { role },
      create: { workspaceId, userId, role },
    });
  },

  async getMember(workspaceId, userId) {
    return prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  },

  async listMembers(workspaceId) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  },

  async updateRole(workspaceId, userId, role) {
    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    });
  },

  async removeMember(workspaceId, userId) {
    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  },

  async countOwners(workspaceId) {
    return prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" },
    });
  },

  async createInvite(input) {
    return prisma.workspaceInvite.create({ data: input });
  },

  async findInviteByToken(token) {
    return prisma.workspaceInvite.findUnique({ where: { token } });
  },

  async findInviteByEmail(workspaceId, email) {
    return prisma.workspaceInvite.findFirst({
      where: { workspaceId, email, acceptedAt: null, revokedAt: null },
    });
  },

  async listInvites(workspaceId) {
    return prisma.workspaceInvite.findMany({
      where: { workspaceId, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  async markInviteAccepted(id) {
    await prisma.workspaceInvite.update({
      where: { id },
      data: { acceptedAt: new Date() },
    });
  },

  async revokeInvite(id) {
    await prisma.workspaceInvite.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  async setLastWorkspace(userId, workspaceId) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastWorkspaceId: workspaceId },
    });
  },
};
