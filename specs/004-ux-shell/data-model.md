# Data Model: UX shell

**Date**: 2026-09-07 | **Feature**: `004-ux-shell`

This feature introduces **no new tables and no migrations**. All data is
read-only projection over the existing schema (verified in
`packages/backend/src/db/migrations/001_initial_schema.ts`).

## Read models (API projections, not persisted)

### `DashboardSummary` — `GET /api/v1/dashboard/summary`

```ts
{
  counts: {
    products:   { total: number; byType: Record<string, number> };
    components: { total: number; byLifecycle: { ACTIVE: number; RETIRED: number } };
    instances:  { total: number; byStatus: { RUNNING: number; STOPPED: number; ERROR: number; GONE: number } };
  };
  lastImportAt: string | null;          // ISO timestamp of latest completed run
  attention: AttentionItem[];           // ordered: failed runs first, then ERROR/GONE instances
  lastRuns: ImporterRunStatus[];        // one per importer_config, latest run
}
```

### `AttentionItem`

```ts
{
  kind: "FAILED_RUN" | "INSTANCE_ERROR" | "INSTANCE_GONE";
  label: string;                        // importer name or component name
  href: string;                         // deep link to run/instance detail
  at: string;                           // ISO timestamp
}
```

### `ImporterRunStatus`

```ts
{
  configId: string;
  importerName: string;                 // e.g. "github"
  configLabel: string;
  runId: string | null;                 // null when never run
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "INTERRUPTED" | null;
  completedAt: string | null;
  assetsProcessed: number;
  assetsCreated: number;
  assetsUpdated: number;
}
```

### `SearchResults` — `GET /api/v1/search`

```ts
{
  components: SearchHit[];
  products:   SearchHit[];
  groups:     SearchHit[];
  importers:  SearchHit[];
}
interface SearchHit {
  id: string;
  name: string;
  slug: string | null;
  kind: "component" | "product" | "group" | "importer";
  href: string;                          // e.g. /components/<id>
}
```

## Source tables (read-only)

| Table | Used for |
|---|---|
| `digital_products` | product counts by `type` |
| `components` | counts by `lifecycle`; search; attention (via instances) |
| `component_instances` | counts/attention by `status` (`ERROR`, `GONE`) |
| `component_groups` | search |
| `importer_configs` | per-importer last-run list; search |
| `import_runs` | `lastImportAt`, failed runs, `assetsProcessed/Created/Updated` — already persisted |

## Client-persisted state (not in DB)

| Key | Where | Values |
|---|---|---|
| Theme preference | `localStorage` (via `next-themes`) | `light` \| `dark` \| `system` |
| Sidebar collapsed | `sessionStorage` | `true` \| `false` |

## Rules carried from spec

- Counts respect the constitution IV default: `RETIRED` components and `GONE`
  instances are excluded from headline totals but appear in `byLifecycle`/
  `byStatus` breakdowns and in `attention`.
- Search matching mirrors spec 003: case-insensitive prefix on `name`/`slug`;
  results filtered to entities the caller's role may read.
- No `sql.raw()`; Kysely parameterized aggregates only (ADR-084).
