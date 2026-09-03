export interface ImporterConfig {
  id: string;
  importerName: string;
  label: string;
  scope: Record<string, unknown>;
  secretRefs?: Array<{ key: string; env?: string; file?: string }> | null;
  schedule?: string | null;
  enabled: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
