import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Square, Clock, AlertCircle } from "lucide-react";
import {
  useImporterRun,
  useCancelImportRun,
  useImportRunErrors,
} from "@/api/hooks/importers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ImportRun, ImportRunError } from "@/api/types";

function statusBadge(status: ImportRun["status"]) {
  switch (status) {
    case "COMPLETED":
      return <Badge variant="secondary">{status}</Badge>;
    case "RUNNING":
      return <Badge className="bg-blue-600 hover:bg-blue-600">{status}</Badge>;
    case "PENDING":
      return <Badge variant="outline">{status}</Badge>;
    case "FAILED":
    case "INTERRUPTED":
    case "CANCELLED":
      return <Badge variant="destructive">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function ImporterRunPage() {
  const { configId, runId } = useParams<{
    configId: string;
    runId: string;
  }>();

  const { data, isLoading, error } = useImporterRun(configId ?? null, runId ?? null);
  const { data: errorsData } = useImportRunErrors(configId ?? null, runId ?? null);
  const cancel = useCancelImportRun();

  const run = data?.run;
  const errors = errorsData?.errors ?? [];

  const isActive = run?.status === "PENDING" || run?.status === "RUNNING";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/importers">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to importers
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Import run</h1>
          {isActive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (configId && runId) {
                  cancel.mutate({ configId, runId });
                }
              }}
              disabled={cancel.isPending}
            >
              <Square className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-destructive">Failed to load run.</p>
        ) : !run ? (
          <p className="text-muted-foreground">Run not found.</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Status</CardTitle>
                  {statusBadge(run.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {run.currentPhase && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className={cn("w-4 h-4", isActive && "animate-spin")} />
                    <span className="font-medium text-foreground">{run.currentPhase}</span>
                  </div>
                )}

                {run.errorMessage && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span>{run.errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="Processed" value={run.assetsProcessed} />
                  <Stat label="Created" value={run.assetsCreated} />
                  <Stat label="Updated" value={run.assetsUpdated} />
                  <Stat label="Orphaned" value={run.instancesOrphaned} />
                  <Stat label="Retired" value={run.componentsRetired} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2 border-t">
                  <DateField label="Created" value={run.createdAt} />
                  <DateField label="Started" value={run.startedAt} />
                  <DateField label="Completed" value={run.completedAt} />
                </div>
              </CardContent>
            </Card>

            {errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Run errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.map((err: ImportRunError) => (
                        <TableRow key={err.id}>
                          <TableCell>{err.assetExternalId ?? "—"}</TableCell>
                          <TableCell>{err.errorType}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {err.errorMessage}
                          </TableCell>
                          <TableCell>{formatDate(err.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DateField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span>{formatDate(value)}</span>
    </div>
  );
}
