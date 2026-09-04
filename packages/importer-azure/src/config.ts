import { z } from "zod";

export const azureConfigSchema = z.object({
  subscriptionId: z.string().optional(),
  resourceTypes: z.array(z.string().min(1)).default(["Microsoft.Compute/virtualMachines"]),
  endpoint: z.string().url().optional(),
});

export type AzureConfig = z.infer<typeof azureConfigSchema>;
