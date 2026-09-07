import { z } from "zod";
import { PRODUCT_TYPES } from "../constants/product-types.js";
import { COMPONENT_LIFECYCLE } from "../constants/lifecycle.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productTypeSchema = z.enum(PRODUCT_TYPES);
export const productLifecycleSchema = z.enum(COMPONENT_LIFECYCLE);

/** Slug auto-derives from name when omitted (ADR-046 uniqueness enforced by service). */
export const createProductSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z.string().regex(slugPattern).max(100).optional(),
    type: productTypeSchema,
    description: z.string().max(2000).nullable().optional(),
    lobOwnerId: z.string().uuid().nullable().optional(),
    teamOwnerId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().regex(slugPattern).max(100).optional(),
    description: z.string().max(2000).nullable().optional(),
    type: productTypeSchema.optional(),
    lifecycle: productLifecycleSchema.optional(),
    lobOwnerId: z.string().uuid().nullable().optional(),
    teamOwnerId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const listProductsQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(200).optional(),
    type: productTypeSchema.optional(),
    lifecycle: productLifecycleSchema.optional(),
    includeRetired: z
      .union([z.literal("true"), z.literal("false")])
      .transform((v) => v === "true")
      .optional(),
  })
  .strict();

export const addComposesEdgeSchema = z.object({ childId: z.string().uuid() }).strict();
export const addConsumesFromEdgeSchema = z
  .object({ platformId: z.string().uuid() })
  .strict();
export const addDependsOnEdgeSchema = z
  .object({ componentId: z.string().uuid() })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
