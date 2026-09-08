import { History } from "lucide-react";
import { useEntityHistory, type ActivityFeedQuery } from "@/api/hooks/audit";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/error-state";
import { EmptyState } from "@/components/states/empty-state";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityFeedItem } from "@componode/core";

interface EntityHistoryProps {
  entityType: string;
  entityId: string;
  query?: Omit<ActivityFeedQuery, "entityType">;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function describeItem(item: ActivityFeedItem) {
  if (item.kind === "edge") {
    return `${item.edgeType} edge ${item.action}: ${item.fromEntityType}:${item.fromEntityId} → ${item.toEntityType}:${item.toEntityId}`;
  }
  if (item.entityType === "correction") {
    return `Correction: ${item.action}`;
  }
  return `${item.action}`;
}

export function EntityHistory({ entityType, entityId, query = {} }: EntityHistoryProps) {
  const { data, isPending, error, refetch } = useEntityHistory(entityType, entityId, query);

  if (isPending) {
    return (
      <div className="space-y-2 py-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No history"
        description="No changes have been recorded for this entity yet."
      />
    );
  }

  return (
    <div className="py-2">
      <Table aria-label={`History for ${entityType} ${entityId}`}>
        <TableCaption>{data.total} entr{data.total === 1 ? "y" : "ies"} found</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item) => (
            <TableRow key={`${item.kind}-${item.id}`}>
              <TableCell>{formatTime(item.createdAt)}</TableCell>
              <TableCell>{item.createdByName ?? item.createdBy ?? "—"}</TableCell>
              <TableCell className="capitalize">{item.kind}</TableCell>
              <TableCell>{describeItem(item)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
