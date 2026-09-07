import { Users } from "lucide-react";
import { useUsers } from "@/api/hooks/users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { StatusBadge } from "@/components/states/status-badge";
import { relativeTime, absoluteTime } from "@/lib/format";
import type { ApiError } from "@/api/client";

export function UsersPage() {
  const { data, isPending, isFetching, error, refetch } = useUsers();
  const users = data?.users ?? [];

  const isForbidden = error ? ((error as unknown) as ApiError).code === "FORBIDDEN" : false;

  return (
    <div className="bg-background p-6">
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      {isFetching && !isPending && users.length > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">Updating…</p>
      )}

      <Card>
        <CardContent className="p-0">
          {isPending && users.length === 0 && <TableSkeleton />}

          {!isPending && isForbidden && <Forbidden />}

          {!isPending && !isForbidden && error && (
            <ErrorState error={error} onRetry={() => refetch()} />
          )}

          {!isPending && !error && users.length === 0 && (
            <EmptyState
              icon={Users}
              title="No users found"
              description="There are no user accounts on this instance."
            />
          )}

          {!isPending && !error && users.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>{user.displayName ?? "—"}</TableCell>
                    <TableCell>{user.email ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={user.isActive ? "ACTIVE" : "RETIRED"} />
                    </TableCell>
                    <TableCell>
                      <span title={absoluteTime(user.createdAt)}>
                        {relativeTime(user.createdAt)}
                      </span>
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
