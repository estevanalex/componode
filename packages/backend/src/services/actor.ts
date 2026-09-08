import type { AuthenticatedRequest } from "../plugins/session.js";
import type { Actor } from "./audit-service.js";

export function toActor(req: AuthenticatedRequest): Actor {
  const user = req.user;
  if (!user) {
    return { id: null, name: null };
  }
  return { id: user.id, name: user.displayName ?? user.username };
}
