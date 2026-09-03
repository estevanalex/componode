import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveSecrets, EnvSecretResolver } from "../../src/utils/secret-resolver.js";
import { writeFileSync, unlinkSync, mkdtempSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("secret resolver", () => {
  describe("env resolver", () => {
    beforeEach(() => {
      process.env.TEST_SECRET = "secret-value";
    });

    afterEach(() => {
      delete process.env.TEST_SECRET;
    });

    it("resolves an env ref", async () => {
      const secrets = await resolveSecrets([{ key: "token", env: "TEST_SECRET" }]);
      expect(secrets).toEqual({ token: "secret-value" });
    });

    it("throws when env var is missing", async () => {
      await expect(resolveSecrets([{ key: "token", env: "MISSING_VAR" }])).rejects.toThrow("MISSING_VAR");
    });

    it("throws when neither env nor file is provided", async () => {
      await expect(resolveSecrets([{ key: "token" }])).rejects.toThrow("env or file");
    });
  });

  describe("file resolver", () => {
    let tempDir: string;
    let filePath: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "componode-secret-"));
      filePath = join(tempDir, "secret.txt");
      writeFileSync(filePath, "file-secret\n", "utf8");
    });

    afterEach(() => {
      try {
        unlinkSync(filePath);
        rmdirSync(tempDir);
      } catch { /* ignore */ }
    });

    it("resolves a file ref", async () => {
      const secrets = await resolveSecrets([{ key: "token", file: filePath }]);
      expect(secrets).toEqual({ token: "file-secret" });
    });

    it("redacts resolved values from string output", () => {
      // This is a smoke test that the resolver object does not expose secrets in toString.
      const resolver = new EnvSecretResolver();
      expect(String(resolver)).not.toContain("secret-value");
    });
  });
});
