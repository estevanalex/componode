import { z } from "zod";

export const awsConfigSchema = z.object({
  region: z.string().default("us-east-1"),
  resourceTypes: z.array(z.string().min(1)).default(["ec2:instance"]),
  endpoint: z.string().url().optional(),
});

export type AwsConfig = z.infer<typeof awsConfigSchema>;
