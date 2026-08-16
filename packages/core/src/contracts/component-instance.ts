import type { Environment, InstanceStatus } from "../constants/index.js";

export interface ComponentInstance {
  id: string;
  componentId: string;
  environment: Environment;
  url?: string | null;
  region?: string | null;
  status: InstanceStatus;
  version?: string | null;
  deployedAt?: string | null;
  rawConfig?: Record<string, unknown> | null;
  externalId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
