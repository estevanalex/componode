import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 60000,
    hookTimeout: 60000,
    // Run integration test files sequentially. Each test file spins up a fresh
    // testcontainers Postgres container and Fastify instance; parallel file
    // execution exhausts resources and can crash workers on this repo.
    fileParallelism: false,
  },
});
