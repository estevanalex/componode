export interface ImporterConfig {
  id: string;
  importerName: string;
  label: string;
  config: Record<string, unknown>;
  secretRefs?: Record<string, string> | null;
  scope?: Record<string, unknown> | null;
  schedule?: string | null;
  enabled: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
