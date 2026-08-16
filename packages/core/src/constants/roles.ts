export const ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;

export type Role = typeof ROLES[number];

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  ADMIN: {
    label: "Admin",
    description: "Full access including user management and settings",
  },
  EDITOR: {
    label: "Editor",
    description: "Curate products, edges, and component lifecycle",
  },
  VIEWER: {
    label: "Viewer",
    description: "Read-only access to all entities",
  },
};
