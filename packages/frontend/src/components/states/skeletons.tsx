import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Table-shaped skeleton for list pages (docs/ux.md §6). */
export function TableSkeleton({
  rows = 8,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("p-4 space-y-2", className)} data-testid="table-skeleton">
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card-grid skeleton (dashboard stat cards, etc.). */
export function CardGridSkeleton({
  cards = 3,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}
      data-testid="card-grid-skeleton"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-lg" />
      ))}
    </div>
  );
}

/** Generic page skeleton: title bar + content block. */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-6", className)} data-testid="page-skeleton">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <TableSkeleton />
    </div>
  );
}
