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

export type ImportRunStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "INTERRUPTED";

export interface ImportRunError {
  id: string;
  runId: string;
  assetExternalId: string | null;
  errorType: string;
  errorMessage: string;
  createdAt: string;
}

export interface ImporterManifest {
  name: string;
  label: string;
  description: string;
  configSchema: Record<string, unknown>;
}

export interface ImporterConfig {
  id: string;
  importerName: string;
  label: string;
  scope: Record<string, unknown>;
  secretRefs: Array<{ key: string; env?: string; file?: string }>;
  schedule: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRun {
  id: string;
  configId: string;
  status: ImportRunStatus;
  triggeredBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  assetsProcessed: number;
  assetsCreated: number;
  assetsUpdated: number;
  instancesOrphaned: number;
  componentsRetired: number;
  currentPhase: string | null;
  cancelRequestedAt: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  errorType: string | null;
  createdAt: string;
}
