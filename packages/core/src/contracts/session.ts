export interface Session {
  id: string; // 32-byte base64url crypto-random token
  userId: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}
