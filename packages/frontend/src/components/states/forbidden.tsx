import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Distinct 403 state per docs/ux.md §6: no retry affordance — the action will
 * keep failing. Offers a path back to the app instead.
 */
export function Forbidden({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-2 p-12 text-center",
        className,
      )}
      data-testid="forbidden-state"
    >
      <ShieldX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="text-sm text-muted-foreground">
        You don&apos;t have permission to view this page.
      </p>
      <Link
        to="/"
        className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
