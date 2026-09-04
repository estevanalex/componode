import { z } from "zod";

export const kubernetesConfigSchema = z.object({
  namespace: z.string().default("default"),
  resourceTypes: z.array(z.string().min(1)).default(["apps/v1:Deployment"]),
  endpoint: z.string().url().optional(),
});

export type KubernetesConfig = z.infer<typeof kubernetesConfigSchema>;
