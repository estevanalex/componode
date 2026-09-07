import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Package, Group, Download, Settings } from "lucide-react";
import { useGlobalSearch } from "@/api/hooks/search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { SearchHit } from "@/api/types";

/** Internal navigation paths must be app-relative (ADR-085). */
function safeInternalPath(href: string): string {
  return href.startsWith("/") && !href.startsWith("//") ? href : "/";
}

const GROUP_ORDER: Array<{
  key: keyof typeof EMPTY;
  heading: string;
  icon: typeof Boxes;
}> = [
  { key: "components", heading: "Components", icon: Boxes },
  { key: "products", heading: "Products", icon: Package },
  { key: "groups", heading: "Component Groups", icon: Group },
  { key: "importers", heading: "Importers", icon: Download },
];

const EMPTY = {
  components: [] as SearchHit[],
  products: [] as SearchHit[],
  groups: [] as SearchHit[],
  importers: [] as SearchHit[],
};

const NAV_ACTIONS = [
  { label: "Go to Dashboard", to: "/" },
  { label: "Go to Settings", to: "/settings" },
  { label: "Go to Importers", to: "/importers" },
];

/**
 * Ctrl+K / Cmd+K global search palette (spec 004 US5). Mounted once inside
 * the app shell; not rendered on auth pages.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data } = useGlobalSearch(query);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("componode:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("componode:open-palette", onOpen);
    };
  }, []);

  const results = data ?? EMPTY;
  const hasResults = GROUP_ORDER.some((g) => results[g.key].length > 0);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    navigate(safeInternalPath(href));
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search components, products, groups, importers…"
        value={query}
        onValueChange={setQuery}
        aria-label="Global search"
      />
      <CommandList>
        {query.length > 0 && !hasResults && (
          <CommandEmpty>No results for &quot;{query}&quot;.</CommandEmpty>
        )}
        {GROUP_ORDER.map(({ key, heading, icon: Icon }) =>
          results[key].length === 0 ? null : (
            <CommandGroup key={key} heading={heading}>
              {results[key].map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={`${hit.name} ${hit.slug ?? ""}`}
                  onSelect={() => go(hit.href)}
                >
                  <Icon aria-hidden="true" />
                  <span className="truncate">{hit.name}</span>
                  {hit.slug && (
                    <span className="ml-auto font-mono text-xs text-muted-foreground truncate">
                      {hit.slug}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ),
        )}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {NAV_ACTIONS.map((a) => (
            <CommandItem key={a.to} value={a.label} onSelect={() => go(a.to)}>
              <Settings aria-hidden="true" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
