import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createOrgEntitySchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z.string().regex(slugPattern).max(100).optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .strict();

export const updateOrgEntitySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().regex(slugPattern).max(100).optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .strict();

export type CreateOrgEntityInput = z.infer<typeof createOrgEntitySchema>;
export type UpdateOrgEntityInput = z.infer<typeof updateOrgEntitySchema>;
