import { Search } from "lucide-react";

interface ComponentSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ComponentSearch({ value, onChange }: ComponentSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search by name, slug or externalId"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
