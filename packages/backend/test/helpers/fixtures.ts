import { hashPassword } from "../../src/utils/argon2.js";

export const TEST_PASSWORD = "TestPassword123!";
export const TEST_USERNAME = "testuser";

export interface TestUser {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  displayName: string | null;
  isActive: boolean;
  slug: string;
}

export async function createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
  const passwordHash = await hashPassword(overrides.passwordHash ?? TEST_PASSWORD);
  return {
    id: overrides.id ?? crypto.randomUUID(),
    username: overrides.username ?? TEST_USERNAME,
    passwordHash,
    role: overrides.role ?? "VIEWER",
    displayName: overrides.displayName ?? "Test User",
    isActive: overrides.isActive ?? true,
    slug: overrides.slug ?? (overrides.username ?? TEST_USERNAME).toLowerCase(),
  };
}
