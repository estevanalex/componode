import { githubConfigSchema } from "./config.js";

export const manifest = {
  name: "github",
  label: "GitHub",
  description: "Import GitHub repositories as components and instances.",
  version: "1.0.0",
  implPath: "@componode/importer-github/importer",
  configSchema: githubConfigSchema,
};
