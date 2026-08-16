import { z } from "zod";

export const updateSettingsSchema = z.object({
  allowSelfRegistration: z.boolean().optional(),
  sessionIdleTimeoutMs: z.number().int().min(60000).optional(),
  sessionAbsoluteTimeoutMs: z.number().int().min(60000).optional(),
  defaultUserRole: z.enum(["ADMIN", "EDITOR", "VIEWER"]).optional(),
});

export const updateOidcConfigSchema = z.object({
  enabled: z.boolean(),
  issuer: z.string().url().optional().nullable(),
  clientId: z.string().optional().nullable(),
  clientSecretRef: z.string().optional().nullable(),
  roleClaimPath: z.string().optional().nullable(),
  claimValueField: z.string().optional().nullable(),
  roleMapping: z.record(z.string(), z.enum(["ADMIN", "EDITOR", "VIEWER"])).optional().nullable(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateOidcConfigInput = z.infer<typeof updateOidcConfigSchema>;
