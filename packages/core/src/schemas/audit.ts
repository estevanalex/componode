import { z } from "zod";

export const activityFeedQuerySchema = z.object({
  kind: z.enum(["entity", "edge"]).optional(),
  entityType: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  actor: z.string().max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const entityHistoryQuerySchema = z.object({
  kind: z.enum(["entity", "edge"]).optional(),
  action: z.string().max(100).optional(),
  actor: z.string().max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const correctionInputSchema = z.object({
  entryId: z.string().uuid(),
  entryKind: z.enum(["entity", "edge"]),
  note: z.string().min(1).max(2000),
});

export type ActivityFeedQuery = z.infer<typeof activityFeedQuerySchema>;
export type EntityHistoryQuery = z.infer<typeof entityHistoryQuerySchema>;
export type CorrectionInput = z.infer<typeof correctionInputSchema>;
