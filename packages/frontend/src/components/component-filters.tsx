import type { ComponentListFilters } from "@/api/hooks/components";

interface ComponentFiltersProps {
  filters: ComponentListFilters;
  onChange: (filters: ComponentListFilters) => void;
}

export function ComponentFilters({ filters, onChange }: ComponentFiltersProps) {
  function update(key: keyof ComponentListFilters, value: string) {
    onChange({ ...filters, [key]: value || undefined, page: 1 });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        placeholder="Category"
        value={filters.category ?? ""}
        onChange={(e) => update("category", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <input
        type="text"
        placeholder="Provider"
        value={filters.provider ?? ""}
        onChange={(e) => update("provider", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <input
        type="text"
        placeholder="Lifecycle"
        value={filters.lifecycle ?? ""}
        onChange={(e) => update("lifecycle", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <input
        type="text"
        placeholder="Status"
        value={filters.status ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <input
        type="text"
        placeholder="Group slug"
        value={filters.group ?? ""}
        onChange={(e) => update("group", e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
