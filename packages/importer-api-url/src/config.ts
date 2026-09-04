import { z } from "zod";

export const apiUrlConfigSchema = z.object({
  url: z.string().url(),
});

export type ApiUrlConfig = z.infer<typeof apiUrlConfigSchema>;
