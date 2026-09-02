import { describe, it, expect } from "vitest";
import { generateSessionToken, generateResetToken, hashToken } from "../../src/utils/crypto.js";

describe("crypto utils", () => {
  it("generates 32-byte session tokens (43 base64url chars)", () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique session tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSessionToken());
    }
    expect(tokens.size).toBe(100);
  });

  it("generates 32-byte reset tokens", () => {
    const token = generateResetToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("hashes a token with SHA-256 (64 hex chars)", () => {
    const token = "test-token-value";
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("produces deterministic hash for same input", () => {
    const token = "deterministic-test";
    expect(hashToken(token)).toBe(hashToken(token));
  });
});
