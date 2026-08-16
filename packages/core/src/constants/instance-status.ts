export const INSTANCE_STATUS = ["RUNNING", "STOPPED", "ERROR", "GONE"] as const;

export type InstanceStatus = typeof INSTANCE_STATUS[number];

export const INSTANCE_STATUS_META: Record<
  InstanceStatus,
  { label: string; description: string }
> = {
  RUNNING: {
    label: "Running",
    description: "Instance is currently operating normally",
  },
  STOPPED: {
    label: "Stopped",
    description: "Instance is intentionally not running",
  },
  ERROR: {
    label: "Error",
    description: "Instance is in a failed or degraded state",
  },
  GONE: {
    label: "Gone",
    description: "Instance was present in a prior run but is no longer yielded",
  },
};
