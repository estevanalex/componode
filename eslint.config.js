import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: ["packages/importer-*/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@componode/backend", "@componode/backend/*"],
              message: "Importers MUST NOT import from @componode/backend (ADR-065).",
            },
            {
              group: ["@componode/importer-*"],
              message: "Importers MUST NOT depend on other importers (ADR-065).",
            },
            {
              group: ["fs", "fs/*", "child_process", "child_process/*"],
              message: "Importers MUST NOT use fs or child_process (ADR-098).",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "process",
          message: "Importers MUST NOT access process.env directly (ADR-098). Use the SecretResolver from the run context.",
        },
        {
          name: "eval",
          message: "eval is prohibited (ADR-098).",
        },
      ],
    },
  },
);
