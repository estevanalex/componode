import { useState } from "react";
import { Pencil, Trash2, Plus, Link2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import type { ComponentGroup } from "@/api/types";

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

  const { data, isLoading, error } = useComponentGroups();
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
  });

  const [assignForm, setAssignForm] = useState({
    componentId: "",
    groupId: "",
  });

  function openCreate() {
    setForm({ name: "", slug: "", description: "", lifecycle: "ACTIVE" });
    setDialog({ mode: "create" });
  }

  function openEdit(group: ComponentGroup) {
    setForm({
      name: group.name,
      slug: group.slug,
      description: group.description ?? "",
      lifecycle: group.lifecycle,
    });
    setDialog({ mode: "edit", group });
  }

  async function handleSubmit() {
    if (dialog?.mode === "create") {
      await create.mutateAsync({
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
      });
    } else if (dialog?.mode === "edit") {
      await update.mutateAsync({
        id: dialog.group.id,
        name: form.name || undefined,
        slug: form.slug || undefined,
        description: form.description || undefined,
        lifecycle: form.lifecycle || undefined,
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Component Groups</h1>
        {editor && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add group
          </Button>
        )}
      </div>

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
              disabled={!assignForm.componentId || assign.isPending}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Assign
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          )}
          {error && (
            <div className="p-12 text-center text-destructive">
              Failed to load component groups.
            </div>
          )}
          {groups.length === 0 && !isLoading && (
            <div className="p-12 text-center text-muted-foreground">
              No component groups yet.
            </div>
          )}
          {groups.length > 0 && (
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
                    <TableCell>{group.slug}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          group.lifecycle === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {group.lifecycle}
                      </Badge>
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
