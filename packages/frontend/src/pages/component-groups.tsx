import { useState } from "react";
import { OwnerPickers } from "@/components/products/owner-picker";
import { Pencil, Trash2, Plus, Link2, Group } from "lucide-react";
import { useSession } from "@/api/hooks/auth";
import {
  useComponentGroups,
  useCreateComponentGroup,
  useUpdateComponentGroup,
  useDeleteComponentGroup,
  useAssignComponentGroup,
} from "@/api/hooks/component-groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/states/status-badge";
import { MONO_CLASS } from "@/lib/format";
import { EntityHistory } from "@/components/entity-history";
import type { ComponentGroup } from "@/api/types";
import type { ApiError } from "@/api/client";

const ROLE_LEVEL: Record<string, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

function canEdit(role: string | undefined) {
  return (ROLE_LEVEL[role ?? "VIEWER"] ?? 0) >= 1;
}

export function ComponentGroupsPage() {
  const { data: user } = useSession();
  const editor = canEdit(user?.role);

  const { data, isPending, error, refetch } = useComponentGroups();
  const groups = data?.groups ?? [];

  const create = useCreateComponentGroup();
  const update = useUpdateComponentGroup();
  const del = useDeleteComponentGroup();
  const assign = useAssignComponentGroup();

  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; group: ComponentGroup } | null
  >(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    lifecycle: "ACTIVE",
    teamOwnerId: "",
  });

  const [assignForm, setAssignForm] = useState({
    componentId: "",
    groupId: "",
  });

  function openCreate() {
    setForm({ name: "", slug: "", description: "", lifecycle: "ACTIVE", teamOwnerId: "" });
    setDialog({ mode: "create" });
  }

  function openEdit(group: ComponentGroup) {
    setForm({
      name: group.name,
      slug: group.slug,
      description: group.description ?? "",
      lifecycle: group.lifecycle,
      teamOwnerId: group.teamOwnerId ?? "",
    });
    setDialog({ mode: "edit", group });
  }

  async function handleSubmit() {
    if (dialog?.mode === "create") {
      await create.mutateAsync({
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        teamOwnerId: form.teamOwnerId || undefined,
      });
    } else if (dialog?.mode === "edit") {
      await update.mutateAsync({
        id: dialog.group.id,
        name: form.name || undefined,
        slug: form.slug || undefined,
        description: form.description || undefined,
        lifecycle: form.lifecycle || undefined,
        teamOwnerId: form.teamOwnerId || undefined,
      });
    }
    setDialog(null);
  }

  async function handleAssign() {
    if (!assignForm.componentId) return;
    await assign.mutateAsync({
      componentId: assignForm.componentId,
      componentGroupId: assignForm.groupId || null,
    });
    setAssignForm({ componentId: "", groupId: "" });
  }

  const isForbidden = error ? ((error as unknown) as ApiError).code === "FORBIDDEN" : false;

  return (
    <div className="bg-background p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Component Groups</h1>
        {editor && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add group
          </Button>
        )}
      </div>

      {editor && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Assign component</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                placeholder="Component ID"
                value={assignForm.componentId}
                onChange={(e) =>
                  setAssignForm((f) => ({ ...f, componentId: e.target.value }))
                }
                className="w-72"
              />
              <select
                value={assignForm.groupId}
                onChange={(e) =>
                  setAssignForm((f) => ({ ...f, groupId: e.target.value }))
                }
                className="h-10 w-48 rounded-md border border-input bg-background px-3 text-sm"
                disabled={isPending}
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleAssign}
                disabled={!assignForm.componentId || assign.isPending || isPending}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isPending && groups.length === 0 && <TableSkeleton />}

          {!isPending && isForbidden && <Forbidden />}

          {!isPending && !isForbidden && error && (
            <ErrorState error={error} onRetry={() => refetch()} />
          )}

          {!isPending && !error && groups.length === 0 && (
            <EmptyState
              icon={Group}
              title="No component groups yet"
              description="Create a group to organize components."
              action={editor ? { label: "Add group", onClick: openCreate } : undefined}
            />
          )}

          {!isPending && !error && groups.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      <span className={MONO_CLASS}>{group.slug}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={group.lifecycle} />
                    </TableCell>
                    <TableCell className="flex gap-2">
                      {editor && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => del.mutate(group.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
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
                {dialog.mode === "create" ? "Create group" : "Edit group"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Slug"
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
              <select
                value={form.lifecycle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lifecycle: e.target.value }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="RETIRED">RETIRED</option>
              </select>
              <OwnerPickers
                showLob={false}
                teamOwnerId={form.teamOwnerId}
                onTeamChange={(v) => setForm((f) => ({ ...f, teamOwnerId: v }))}
              />
              {dialog.mode === "edit" && (
                <EntityHistory entityType="component_group" entityId={dialog.group.id} />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
