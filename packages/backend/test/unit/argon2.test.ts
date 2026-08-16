import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../src/utils/argon2.js";

describe("argon2", () => {
  it("hashes a password and verifies it", async () => {
    const plain = "MySecurePassword123!";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash.length).toBeGreaterThan(50);

    const valid = await verifyPassword(plain, hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("CorrectPassword123!");
    const valid = await verifyPassword("WrongPassword456!", hash);
    expect(valid).toBe(false);
  });

  it("produces different hashes for same password (salt)", async () => {
    const hash1 = await hashPassword("SamePassword123!");
    const hash2 = await hashPassword("SamePassword123!");
    expect(hash1).not.toBe(hash2);
  });
});
