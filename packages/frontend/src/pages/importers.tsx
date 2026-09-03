import { useState } from "react";
import { Plus, Play, Trash2, Edit, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useSession } from "@/api/hooks/auth";
import {
  useImporters,
  useImporterConfigs,
  useCreateImporterConfig,
  useUpdateImporterConfig,
  useDeleteImporterConfig,
  useTriggerImportRun,
  useImporterRuns,
} from "@/api/hooks/importers";
import { ImporterConfigForm } from "@/components/importer-config-form";
import type { ImporterConfigFormOutput } from "@/components/importer-config-form";
import type { ImporterManifest, ImporterConfig, ImportRun } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApiError } from "@/api/client";

const ROLE_LEVEL: Record<string, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

function hasRole(userRole: string | undefined, required: "EDITOR" | "ADMIN"): boolean {
  const userLevel = ROLE_LEVEL[userRole ?? "VIEWER"] ?? 0;
  const requiredLevel = ROLE_LEVEL[required] ?? 0;
  return userLevel >= requiredLevel;
}

function errMessage(err: unknown): string {
  return (err as ApiError).message ?? "Something went wrong";
}

function statusBadge(status: string) {
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

interface ConfigDialogProps {
  mode: "create" | "edit";
  config?: ImporterConfig | null;
  manifests: ImporterManifest[];
  onClose: () => void;
}

function ConfigDialog({ mode, config, manifests, onClose }: ConfigDialogProps) {
  const create = useCreateImporterConfig();
  const update = useUpdateImporterConfig();
  const isPending = create.isPending || update.isPending;

  async function handleSubmit(values: ImporterConfigFormOutput) {
    if (mode === "edit" && config) {
      await update.mutateAsync({ id: config.id, ...values });
    } else {
      await create.mutateAsync(values);
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add importer" : "Edit importer"}</DialogTitle>
          <DialogDescription>
            Configure how Componode discovers components from an external source.
          </DialogDescription>
        </DialogHeader>
        <ImporterConfigForm
          mode={mode}
          config={config}
          manifests={manifests}
          isPending={isPending}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

interface RunsPanelProps {
  config: ImporterConfig;
}

function RunsPanel({ config }: RunsPanelProps) {
  const { data, isLoading, error } = useImporterRuns(config.id);
  const runs = data?.runs ?? [];

  return (
    <div className="mt-4 rounded-md border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold mb-3">Recent runs</h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{errMessage(error)}</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Orphaned</TableHead>
              <TableHead>Retired</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead className="w-24">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run: ImportRun) => (
              <TableRow key={run.id}>
                <TableCell>{statusBadge(run.status)}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {run.currentPhase ?? "—"}
                </TableCell>
                <TableCell>{run.assetsProcessed}</TableCell>
                <TableCell>{run.assetsCreated}</TableCell>
                <TableCell>{run.assetsUpdated}</TableCell>
                <TableCell>{run.instancesOrphaned}</TableCell>
                <TableCell>{run.componentsRetired}</TableCell>
                <TableCell>{formatDate(run.createdAt)}</TableCell>
                <TableCell>{formatDate(run.completedAt)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/importers/${config.id}/runs/${run.id}`}>
                      <Eye className="w-4 h-4" />
                      <span className="sr-only">View run</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {runs[0]?.errorMessage && (
        <p className="mt-3 text-sm text-destructive">{runs[0].errorMessage}</p>
      )}
    </div>
  );
}

export function ImportersPage() {
  const { data: user } = useSession();
  const userRole = user?.role ?? "VIEWER";

  const { data: importersData, isLoading: importersLoading } = useImporters();
  const { data: configsData, isLoading: configsLoading } = useImporterConfigs();

  const trigger = useTriggerImportRun();
  const deleteConfig = useDeleteImporterConfig();

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingConfig, setEditingConfig] = useState<ImporterConfig | null>(null);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);

  const configs = configsData?.configs ?? [];
  const manifests = importersData?.importers ?? [];

  function startCreate() {
    setEditingConfig(null);
    setDialogMode("create");
  }

  function startEdit(config: ImporterConfig) {
    setEditingConfig(config);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingConfig(null);
  }

  async function handleTrigger(config: ImporterConfig) {
    try {
      await trigger.mutateAsync(config.id);
      setExpandedConfigId(config.id);
    } catch {
      // no-op; errors surface in the runs panel
    }
  }

  async function handleDelete(config: ImporterConfig) {
    if (!confirm(`Delete importer "${config.label}"?`)) return;
    try {
      await deleteConfig.mutateAsync(config.id);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Importers</h1>
        {hasRole(userRole, "ADMIN") && (
          <Button onClick={startCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add importer
          </Button>
        )}
      </div>

      {configsLoading || importersLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No importers configured yet. Add one to start importing components.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => {
            const expanded = expandedConfigId === config.id;
            return (
              <Card key={config.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{config.label}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {config.importerName} · {config.enabled ? "Enabled" : "Disabled"}
                        {config.schedule ? ` · ${config.schedule}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasRole(userRole, "EDITOR") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTrigger(config)}
                          disabled={trigger.isPending}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Run
                        </Button>
                      )}
                      {hasRole(userRole, "ADMIN") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(config)}
                          >
                            <Edit className="w-4 h-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(config)}
                            disabled={deleteConfig.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedConfigId(expanded ? null : config.id)}
                      >
                        {expanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span className="sr-only">{expanded ? "Collapse" : "Expand"}</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expanded && (
                  <CardContent>
                    <RunsPanel config={config} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {dialogMode && (
        <ConfigDialog
          mode={dialogMode}
          config={editingConfig}
          manifests={manifests}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
