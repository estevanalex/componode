/** Shared API contract types for the Componode frontend. */

export type UserRole = "VIEWER" | "EDITOR" | "ADMIN";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface AppSettings {
  allowSelfRegistration: boolean;
  sessionIdleTimeoutMs: number;
  sessionAbsoluteTimeoutMs: number;
  defaultUserRole: UserRole;
}

export interface OidcConfig {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecretRef: string;
  roleClaimPath: string;
  claimValueField: string;
  roleMapping: Record<string, string>;
}

export interface OidcStatus {
  enabled: boolean;
}
