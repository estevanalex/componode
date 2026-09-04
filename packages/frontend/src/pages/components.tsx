import { useState } from "react";
import { Link } from "react-router-dom";
import { useComponents, type ComponentListFilters } from "@/api/hooks/components";
import { ComponentFilters } from "@/components/component-filters";
import { ComponentSearch } from "@/components/component-search";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ComponentsPage() {
  const [filters, setFilters] = useState<ComponentListFilters>({
    page: 1,
    pageSize: 50,
    sort: "name",
    order: "asc",
  });

  const { data, isLoading, error } = useComponents(filters);
  const components = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 50, total: 0, pageCount: 0, hasNext: false };
  const total = pagination.total;
  const page = pagination.page;
  const totalPages = Math.max(1, pagination.pageCount);

  function setSearch(search: string) {
    setFilters((f) => ({ ...f, search: search || undefined, page: 1 }));
  }

  function setPage(next: number) {
    setFilters((f) => ({ ...f, page: next }));
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold mb-4">Components</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Catalog filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <ComponentSearch value={filters.search ?? ""} onChange={setSearch} />
            <ComponentFilters filters={filters} onChange={setFilters} />
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
              Failed to load components.
            </div>
          )}
          {!isLoading && components.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                No components found. Run an importer to populate the catalog.
              </p>
            </div>
          )}
          {!isLoading && components.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Resource type</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Instances</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>
                      <Link
                        to={`/components/${component.id}`}
                        className="font-medium hover:underline"
                      >
                        {component.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{component.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{component.provider}</Badge>
                    </TableCell>
                    <TableCell>{component.resourceType}</TableCell>
                    <TableCell>{component.lifecycle}</TableCell>
                    <TableCell>
                      {component.componentGroupName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {component.instanceCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              {total} component{total === 1 ? "" : "s"} · Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
