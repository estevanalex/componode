export const IMPORT_RUN_STATUS = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "INTERRUPTED",
] as const;

export type ImportRunStatus = typeof IMPORT_RUN_STATUS[number];

export const IMPORT_RUN_STATUS_META: Record<
  ImportRunStatus,
  { label: string; description: string }
> = {
  PENDING: {
    label: "Pending",
    description: "Run is queued and has not started yet",
  },
  RUNNING: {
    label: "Running",
    description: "Run is currently executing",
  },
  COMPLETED: {
    label: "Completed",
    description: "Run finished successfully",
  },
  FAILED: {
    label: "Failed",
    description: "Run terminated due to an error",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "Run was cancelled by a user",
  },
  INTERRUPTED: {
    label: "Interrupted",
    description: "Run was interrupted (e.g. process restart) before completion",
  },
};
