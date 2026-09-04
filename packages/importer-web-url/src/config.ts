import { z } from "zod";

export const webUrlConfigSchema = z.object({
  url: z.string().url(),
});

export type WebUrlConfig = z.infer<typeof webUrlConfigSchema>;
