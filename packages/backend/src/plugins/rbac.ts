import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "@componode/core";

// RBAC permission matrix (ADR-054)
// Maps action → required role (minimum role needed)
const PERMISSIONS: Record<string, Role> = {
  // Admin-only actions
  "user:create": "ADMIN",
  "user:update": "ADMIN",
  "user:list": "ADMIN",
  "user:listSessions": "ADMIN",
  "session:revokeAny": "ADMIN",
  "settings:update": "ADMIN",
  "oidc:configure": "ADMIN",
  "password:reset:generate": "ADMIN",
  // Importer actions
  "importer:config:create": "ADMIN",
  "importer:config:update": "ADMIN",
  "importer:config:delete": "ADMIN",
  "importer:run:trigger": "EDITOR",
  "importer:run:cancel": "EDITOR",
  // Editor actions (not in foundation, but defined for future)
  // Viewer = read-only (default for all GET routes)
};

const ROLE_LEVEL: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

export function hasPermission(userRole: string, action: string): boolean {
  const requiredRole = PERMISSIONS[action];
  if (!requiredRole) return true; // No restriction = allowed for all authenticated users
  return ROLE_LEVEL[userRole as Role] >= ROLE_LEVEL[requiredRole];
}

export function requireRole(action: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as unknown as { user?: { role: string } }).user;
    if (!user) {
      return reply.status(401).send({ code: "AUTH_NO_SESSION", message: "Authentication required" });
    }
    if (!hasPermission(user.role, action)) {
      return reply.status(403).send({
        code: "AUTH_FORBIDDEN",
        message: "Insufficient permissions for this action",
      });
    }
  };
}
