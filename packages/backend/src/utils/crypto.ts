import { randomBytes, createHash } from "crypto";

/**
 * Generates a 32-byte cryptographically random session token (ADR-099).
 * Returns a 43-character base64url-encoded string.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Generates a 32-byte cryptographically random password reset token (ADR-099).
 * Returns a 43-character base64url-encoded string.
 */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes a token with SHA-256 for safe storage (ADR-099).
 * The plaintext token is never stored in the database.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
