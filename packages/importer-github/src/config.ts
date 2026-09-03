import { z } from "zod";

export const githubConfigSchema = z.object({
  org: z.string().min(1, "Organization is required"),
  repos: z.array(z.string().min(1)).optional(),
  includeForks: z.boolean().default(false),
  includeArchived: z.boolean().default(false),
});

export type GithubConfig = z.infer<typeof githubConfigSchema>;
