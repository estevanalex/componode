import { Fragment, useState } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useSession } from "@/api/hooks/auth";
import { useTeamMembers } from "@/api/hooks/org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/states/skeletons";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Forbidden } from "@/components/states/forbidden";
import { MONO_CLASS } from "@/lib/format";
import type { OrgEntity } from "@/api/types";
import type { ApiError } from "@/api/client";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";

const ROLE_LEVEL: Record<string, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

interface OrgPageProps {
  title: string;
  icon: LucideIcon;
  entityKey: "lobs" | "teams";
  useList: () => UseQueryResult<Record<string, OrgEntity[]>>;
  useCreate: () => UseMutationResult<unknown, unknown, { name: string; slug?: string; description?: string | null }>;
  useUpdate: () => UseMutationResult<unknown, unknown, { id: string } & Partial<{ name: string; slug: string; description: string | null }>>;
  useDelete: () => UseMutationResult<unknown, unknown, string>;
  /** Teams show a read-only member roster per row. */
  showRoster?: boolean;
}

function Roster({ teamId }: { teamId: string }) {
  const { data, isPending } = useTeamMembers(teamId);
  if (isPending) return <p className="py-2 text-sm text-muted-foreground">Loading members…</p>;
  const members = data?.members ?? [];
  return (
    <ul className="space-y-1 py-2 text-sm" aria-label="Team members">
      {members.length === 0 && (
        <li className="text-muted-foreground">No members assigned.</li>
      )}
      {members.map((m) => (
        <li key={m.id}>
          {m.displayName ?? m.username}{" "}
          <span className="text-muted-foreground">({m.username})</span>
        </li>
      ))}
    </ul>
  );
}

/** Generic LOB/Team CRUD page (spec 005, US4). */
export function OrgPage({
  title,
  icon: Icon,
  entityKey,
  useList,
  useCreate,
  useUpdate,
  useDelete,
  showRoster = false,
}: OrgPageProps) {
  const { data: user } = useSession();
  const editor = (ROLE_LEVEL[user?.role ?? "VIEWER"] ?? 0) >= 1;

  const { data, isPending, error, refetch } = useList();
  const entities = data?.[entityKey] ?? [];

  const create = useCreate();
  const update = useUpdate();
  const del = useDelete();

  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; entity: OrgEntity } | null
  >(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isForbidden = error ? (error as unknown as ApiError).code === "FORBIDDEN" : false;

  async function handleSubmit() {
    if (dialog?.mode === "create") {
      await create.mutateAsync({
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || undefined,
      });
    } else if (dialog?.mode === "edit") {
      await update.mutateAsync({
        id: dialog.entity.id,
        name: form.name || undefined,
        slug: form.slug || undefined,
        description: form.description || null,
      });
    }
    setDialog(null);
  }

  async function handleDelete(entity: OrgEntity) {
    setDeleteError(null);
    try {
      await del.mutateAsync(entity.id);
    } catch (err) {
      const e = err as unknown as ApiError;
      const counts = (e.details as { counts?: Record<string, number> } | undefined)?.counts;
      const summary = counts
        ? Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(", ")
        : "existing references";
      setDeleteError(`Cannot delete ${entity.name}: still referenced by ${summary}. Reassign first.`);
    }
  }

  return (
    <div className="bg-background p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        {editor && (
          <Button
            onClick={() => {
              setForm({ name: "", slug: "", description: "" });
              setDialog({ mode: "create" });
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New
          </Button>
        )}
      </div>

      {deleteError && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {deleteError}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {isPending && entities.length === 0 && <TableSkeleton />}
          {!isPending && isForbidden && <Forbidden />}
          {!isPending && !isForbidden && error && (
            <ErrorState error={error} onRetry={() => refetch()} />
          )}
          {!isPending && !error && entities.length === 0 && (
            <EmptyState
              icon={Icon}
              title={`No ${title.toLowerCase()} yet`}
              description="Create one to assign it as an owner."
            />
          )}
          {!isPending && !error && entities.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {showRoster && <TableHead className="w-8" />}
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((entity) => (
                  <Fragment key={entity.id}>
                    <TableRow>
                      {showRoster && (
                        <TableCell>
                          <button
                            type="button"
                            aria-label={`Show members of ${entity.name}`}
                            aria-expanded={expanded.has(entity.id)}
                            onClick={() =>
                              setExpanded((s) => {
                                const n = new Set(s);
                                if (n.has(entity.id)) n.delete(entity.id);
                                else n.add(entity.id);
                                return n;
                              })
                            }
                            className="rounded p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {expanded.has(entity.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{entity.name}</TableCell>
                      <TableCell>
                        <span className={MONO_CLASS}>{entity.slug}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entity.description ?? "—"}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {editor && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setForm({
                                  name: entity.name,
                                  slug: entity.slug,
                                  description: entity.description ?? "",
                                });
                                setDialog({ mode: "edit", entity });
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(entity)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                    {showRoster && expanded.has(entity.id) && (
                      <TableRow>
                        <TableCell />
                        <TableCell colSpan={4}>
                          <Roster teamId={entity.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialog && (
        <Dialog open onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialog.mode === "create" ? `New ${title}` : `Edit ${title}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Slug (auto-derived if blank)"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!form.name}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
