import { z } from "zod";

export const mcpServerConfigSchema = z.object({
  resourceTypes: z.array(z.string().min(1)).default(["tools/list"]),
  endpoint: z.string().url().optional(),
});

export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>;
