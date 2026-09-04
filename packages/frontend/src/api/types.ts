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

export interface ComponentGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  lifecycle: string;
}

export interface Component {
  id: string;
  name: string;
  slug: string;
  category: string;
  provider: string;
  resourceType: string;
  lifecycle: string;
  componentGroupId: string | null;
  componentGroupName: string | null;
  instanceCount: number;
}

export interface ComponentInstance {
  id: string;
  componentId: string;
  environment: string;
  url: string | null;
  region: string | null;
  status: string;
  version: string | null;
  deployedAt: string | null;
  externalId: string;
  slug: string;
  lastSeenAt: string | null;
}

export interface ComponentWithInstances extends Component {
  externalId: string | null;
  details: Record<string, unknown> | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  instances: ComponentInstance[];
}

export interface ComponentListResponse {
  data: Component[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
    hasNext: boolean;
  };
}
