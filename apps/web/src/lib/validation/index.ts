import { z } from "zod";

export const idSchema = z.string().min(1);
export const uuidSchema = z.string().uuid();
export const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes only");

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const parse = <T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> => {
  return schema.parse(input);
};
