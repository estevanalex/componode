import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/api/client";

interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

function errorMessage(error: unknown): string | null {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as ApiError).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return null;
}

/**
 * Inline error panel with retry per docs/ux.md §6. Section-level failures use
 * this inside their region; the rest of the page survives.
 */
export function ErrorState({
  error,
  onRetry,
  title = "Something went wrong",
  className,
}: ErrorStateProps) {
  const detail = errorMessage(error);
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-12 text-center",
        className,
      )}
      data-testid="error-state"
    >
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">
        {detail ?? "The request failed. You can try again."}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
