import type { Role } from "../constants/roles.js";

export interface AppSettings {
  allowSelfRegistration: boolean;
  sessionIdleTimeoutMs: number;
  sessionAbsoluteTimeoutMs: number;
  defaultUserRole: Role;
}
