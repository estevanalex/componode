import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * OIDC callback placeholder.
 *
 * The backend handles the actual OIDC callback
 * (GET /api/v1/auth/oidc/callback) by issuing a session and returning a 302
 * redirect at the browser level. This page is only reached if the redirect
 * lands here; it shows a loading state and then forwards the user to the
 * dashboard.
 */
export function OidcCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <div className="text-center space-y-2">
        <div
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">Completing login…</p>
      </div>
    </div>
  );
}
