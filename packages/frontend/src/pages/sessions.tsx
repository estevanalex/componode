import { useState } from "react";
import { Monitor } from "lucide-react";
import { useSessions, useRevokeSession } from "@/api/hooks/sessions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/states/skeletons";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Forbidden } from "@/components/states/forbidden";
import { relativeTime, absoluteTime } from "@/lib/format";
import type { ApiError } from "@/api/client";

export function SessionsPage() {
  const { data, isPending, isFetching, error, refetch } = useSessions();
  const revoke = useRevokeSession();
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const sessions = data?.sessions ?? [];
  const isForbidden = error ? ((error as unknown) as ApiError).code === "FORBIDDEN" : false;

  async function handleRevoke(id: string) {
    setRevokeError(null);
    try {
      await revoke.mutateAsync(id);
    } catch (err) {
      setRevokeError((err as ApiError).message ?? "Failed to revoke session");
    }
  }

  return (
    <div className="bg-background p-6">
      <h1 className="text-2xl font-bold mb-4">Active Sessions</h1>

      {isFetching && !isPending && sessions.length > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">Updating…</p>
      )}

      {revokeError && (
        <p className="text-sm text-destructive mb-4">{revokeError}</p>
      )}

      <Card>
        <CardContent className="p-0">
          {isPending && sessions.length === 0 && <TableSkeleton />}

          {!isPending && isForbidden && <Forbidden />}

          {!isPending && !isForbidden && error && (
            <ErrorState error={error} onRetry={() => refetch()} />
          )}

          {!isPending && !error && sessions.length === 0 && (
            <EmptyState
              icon={Monitor}
              title="No active sessions"
              description="There are no active sessions on this account."
            />
          )}

          {!isPending && !error && sessions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <span title={absoluteTime(session.createdAt)}>
                        {relativeTime(session.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span title={absoluteTime(session.lastSeenAt)}>
                        {relativeTime(session.lastSeenAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span title={absoluteTime(session.expiresAt)}>
                        {relativeTime(session.expiresAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(session.id)}
                        disabled={revoke.isPending}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
