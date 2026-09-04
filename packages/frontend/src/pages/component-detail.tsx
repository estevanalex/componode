import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Box } from "lucide-react";
import { useComponentDetail } from "@/api/hooks/components";
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

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusBadge(status: string) {
  switch (status) {
    case "RUNNING":
      return <Badge className="bg-green-600 hover:bg-green-600">{status}</Badge>;
    case "STOPPED":
      return <Badge variant="secondary">{status}</Badge>;
    case "ERROR":
      return <Badge variant="destructive">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ComponentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useComponentDetail(id ?? null);
  const component = data?.component;

  if (isLoading) {
    return <div className="min-h-screen bg-background p-6">Loading...</div>;
  }
  if (error || !component) {
    return (
      <div className="min-h-screen bg-background p-6">
        <p className="text-destructive">Component not found or failed to load.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/components" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>
      </Button>

      <div className="flex items-start gap-4 mb-6">
        <Box className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">{component.name}</h1>
          <p className="text-sm text-muted-foreground">{component.slug}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="outline">{component.category}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <Badge variant="secondary">{component.provider}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resource type</span>
              <span>{component.resourceType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lifecycle</span>
              <span>{component.lifecycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Group</span>
              <span>{component.componentGroupName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last seen</span>
              <span>{formatDate(component.lastSeenAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(component.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {component.details && Object.keys(component.details).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                {JSON.stringify(component.details, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {component.instances.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No active instances found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {component.instances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell>{instance.environment}</TableCell>
                    <TableCell>{statusBadge(instance.status)}</TableCell>
                    <TableCell>{instance.version ?? "—"}</TableCell>
                    <TableCell>{instance.region ?? "—"}</TableCell>
                    <TableCell>
                      {instance.url ? (
                        <a
                          href={instance.url}
                          target="_blank"
                          rel="noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                          {instance.url}
                        </a>
                      ) : (
                        "—"
                      )}
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
