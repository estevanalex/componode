import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/api/hooks/auth";
import { PageSkeleton } from "@/components/states/skeletons";
import { Forbidden } from "@/components/states/forbidden";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
}

const ROLE_LEVEL: Record<string, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { data: user, isPending } = useSession();

  if (isPending) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    requiredRole &&
    ROLE_LEVEL[user.role] !== undefined &&
    ROLE_LEVEL[requiredRole] !== undefined &&
    ROLE_LEVEL[user.role]! < ROLE_LEVEL[requiredRole]!
  ) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
