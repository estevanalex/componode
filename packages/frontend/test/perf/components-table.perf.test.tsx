import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function makeRow(i: number) {
  return {
    id: `comp-${i}`,
    name: `Component ${i}`,
    category: "API",
    provider: "GITHUB",
    resourceType: "github:repository",
    lifecycle: "ACTIVE" as const,
    componentGroupName: null,
    instanceCount: 0,
  };
}

describe("Components table responsiveness", () => {
  it("renders 1,000 rows without hanging", () => {
    const components = Array.from({ length: 1000 }, (_, i) => makeRow(i));

    render(
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
              <TableCell>{component.name}</TableCell>
              <TableCell>{component.category}</TableCell>
              <TableCell>{component.provider}</TableCell>
              <TableCell>{component.resourceType}</TableCell>
              <TableCell>{component.lifecycle}</TableCell>
              <TableCell>{component.componentGroupName ?? "—"}</TableCell>
              <TableCell className="text-right">
                {component.instanceCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>,
    );

    const rows = screen.getAllByRole("row");
    // Header row + 1,000 data rows.
    expect(rows.length).toBeGreaterThanOrEqual(1001);
  });
});
