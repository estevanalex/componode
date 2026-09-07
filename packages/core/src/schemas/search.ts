import { z } from "zod";

/**
 * Global search query schema (spec 004 / contracts/api.md).
 * `.strict()` rejects unknown fields per ADR-095.
 */
export const searchQuerySchema = z
  .object({
    q: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "q is required").max(100)),
    limit: z.coerce.number().int().min(1).max(20).default(8),
  })
  .strict();

export type SearchQuery = z.infer<typeof searchQuerySchema>;
