import { z } from "zod";

const domainRegex = /^([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/i;

export const projectDomainSchema = z
  .string()
  .min(3)
  .max(253)
  .transform((s) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
  .refine((s) => domainRegex.test(s), "Enter a valid domain (e.g. example.com)");

export const competitorInputSchema = z.object({
  name: z.string().min(1).max(120),
  domain: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().max(253).optional(),
  ),
});

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(120),
  domain: projectDomainSchema,
  description: z.string().max(500).optional(),
  country: z.string().length(2).optional(),
  language: z.string().min(2).max(8).optional(),
  keywords: z.array(z.string().min(1).max(80)).max(200).default([]),
  competitors: z.array(competitorInputSchema).max(50).default([]),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema
  .omit({ workspaceId: true })
  .partial()
  .extend({
    workspaceId: z.string().min(1),
    projectId: z.string().min(1),
  });

export const deleteProjectSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
});
