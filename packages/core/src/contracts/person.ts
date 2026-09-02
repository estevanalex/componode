import type { Role } from "../constants/roles.js";

export interface Person {
  id: string;
  username: string;
  passwordHash?: string | null;
  oidcSubject?: string | null;
  role: Role;
  displayName?: string | null;
  email?: string | null;
  teamId?: string | null;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
