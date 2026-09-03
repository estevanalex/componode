import type { ImportRunStatus } from "../constants/index.js";

export interface ImportRun {
  id: string;
  configId: string;
  status: ImportRunStatus;
  triggeredBy?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  assetsProcessed: number;
  assetsCreated: number;
  assetsUpdated: number;
  instancesOrphaned: number;
  componentsRetired: number;
  currentPhase?: string | null;
  cancelRequestedAt?: string | null;
  errorMessage?: string | null;
  errorStack?: string | null;
  errorType?: string | null;
  createdAt: string;
}

export interface ImportRunError {
  id: string;
  runId: string;
  assetExternalId?: string | null;
  errorType: string;
  errorMessage: string;
  errorStack?: string | null;
  createdAt: string;
}
