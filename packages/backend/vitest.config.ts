import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    // Integration tests spin up testcontainers Postgres containers and must
    // run sequentially to avoid resource contention and worker crashes. Unit
    // tests are fast enough that sequential execution is acceptable.
  },
});
