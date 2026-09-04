import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: [
      "test/unit/**/*.test.ts",
      "test/unit/**/*.test.tsx",
      "src/test/unit/**/*.test.ts",
      "src/test/unit/**/*.test.tsx",
      "test/perf/**/*.test.ts",
      "test/perf/**/*.test.tsx",
    ],
    environment: "jsdom",
  },
});
