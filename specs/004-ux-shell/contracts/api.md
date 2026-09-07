# API Contracts: UX shell

**Date**: 2026-09-07 | **Feature**: `004-ux-shell`

Two new read-only endpoints under `/api/v1/`. Both require an authenticated
session (ADR-054/097), are side-effect-free (ADR-094), validate inputs with
Zod rejecting unknown fields (ADR-095), and return errors as
`{code, message, details?}` (ADR-071/096). All queries are Kysely-parameterized
(ADR-084 — no `sql.raw()`).

---

## `GET /api/v1/dashboard/summary`

Aggregates for the health-and-attention dashboard.

**Request**: no parameters. Query string ignored/rejected per ADR-095.

**Response `200`**:

```json
{
  "counts": {
    "products":   { "total": 4, "byType": { "BUSINESS_CAPABILITY": 2, "PLATFORM": 1, "CUSTOMER_FACING": 1 } },
    "components": { "total": 1320, "byLifecycle": { "ACTIVE": 1318, "RETIRED": 2 } },
    "instances":  { "total": 2900, "byStatus": { "RUNNING": 2700, "STOPPED": 150, "ERROR": 40, "GONE": 10 } }
  },
  "lastImportAt": "2026-09-07T09:41:12Z",
  "attention": [
    { "kind": "FAILED_RUN",     "label": "github / org-scan", "href": "/importers/<configId>/runs/<runId>", "at": "2026-09-07T09:41:12Z" },
    { "kind": "INSTANCE_ERROR", "label": "payments-api",      "href": "/components/<id>",                    "at": "2026-09-06T22:10:00Z" }
  ],
  "lastRuns": [
    {
      "configId": "uuid",
      "importerName": "github",
      "configLabel": "org-scan",
      "runId": "uuid",
      "status": "FAILED",   // one of IMPORT_RUN_STATUS: PENDING|RUNNING|COMPLETED|FAILED|CANCELLED|INTERRUPTED
      "completedAt": "2026-09-07T09:41:12Z",
      "assetsProcessed": 512,
      "assetsCreated": 40,
      "assetsUpdated": 472
    }
  ]
}
```

**Field rules**:

- `attention` is ordered: `FAILED_RUN` items first (most recent first), then
  `INSTANCE_ERROR`, then `INSTANCE_GONE`. Capped at 20 items.
- `lastRuns` contains one entry per `importer_configs` row, latest run or
  `runId: null, status: null` when never run.
- `counts.*.total` excludes `RETIRED` components / `GONE` instances
  (constitution IV); the `byLifecycle`/`byStatus` breakdowns include them.
- Role filtering: viewers see the same aggregate shape; no admin-only data is
  present, so no role gating beyond authentication is required (SC/FR-012).

**Errors**: `401 AUTH_NO_SESSION` (unauthenticated); standard `500` envelope.

---

## `GET /api/v1/search?q=<term>[&limit=<n>]`

Global search backing the `Ctrl+K` palette.

**Request query params** (Zod-validated, unknown keys rejected):

| Param | Type | Default | Rules |
|---|---|---|---|
| `q` | string | — | **required**, trimmed, 1–100 chars |
| `limit` | integer | `8` | per-entity-group cap, 1–20 |

**Response `200`**:

```json
{
  "components": [{ "id": "uuid", "name": "payments-api", "slug": "payments-api", "kind": "component", "href": "/components/uuid" }],
  "products":   [],
  "groups":     [{ "id": "uuid", "name": "Payments", "slug": "payments", "kind": "group", "href": "/component-groups" }],
  "importers":  []
}
```

**Field rules**:

- Matching mirrors spec 003 semantics: case-insensitive prefix on `name` and
  `slug` (components/groups/products/importer configs).
- `RETIRED` entities are excluded from results (constitution IV default).
- Results are filtered to what the caller's role may read; viewers never see
  entities they cannot open.
- `href` values are built server-side from the route map — the frontend still
  passes them through `safeUrl()` before navigation (ADR-085).

**Errors**: `400 VALIDATION` (`q` missing/invalid); `401 AUTH_NO_SESSION`;
standard `500` envelope.

---

## Frontend contracts (internal, non-HTTP)

- `StatusBadge`: maps entity enums → the fixed color map (docs/ux.md §6).
- `EmptyState`: `{ icon, title, description, action?: { label, href/onClick } }`.
- `ErrorState`: `{ error, onRetry }` — renders `details.code` when present.
- Palette result item: mirrors `SearchHit`; keyboard: `↑/↓` navigate, `Enter`
  select, `Esc` close.
