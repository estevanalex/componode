import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { api, type ApiError } from "@/api/client";

interface AuthUser {
  id: string;
  username: string;
  role: string;
  displayName: string | null;
}

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<AuthUser & { user: AuthUser }>("/auth/session")
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch((err: ApiError) => {
        if (err.code === "AUTH_NO_SESSION") {
          setError(true);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && ROLE_LEVEL[user.role] !== undefined && ROLE_LEVEL[requiredRole] !== undefined && ROLE_LEVEL[user.role]! < ROLE_LEVEL[requiredRole]!) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
