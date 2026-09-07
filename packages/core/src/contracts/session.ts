export interface Session {
  /** Non-secret public identifier (UUID). The bearer token itself is never
   *  exposed by the API — only its last 4 characters via `tokenLast4`. */
  id: string;
  tokenLast4?: string;
  userId: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}
