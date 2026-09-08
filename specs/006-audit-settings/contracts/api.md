# API Contracts: Audit & Settings (006)

Base prefix: `/api/v1`. All endpoints require an authenticated session unless
noted. Error responses follow `{code, message, details?}` (ADR-071). These
endpoints MUST be added to `docs/openapi.yaml` with `x-permission` entries and
`docs/api.md` regenerated (`pnpm docs:api`) per ADR-104; the backend contract
test enforces parity.

## New endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/audit/activity` | `audit:feed` (ADMIN) | Unified paginated feed of entity + edge changes |
| GET | `/audit/entities/:entityType/:entityId` | any authenticated | Per-entity change history (entity + edge changes touching it) |
| POST | `/audit/corrections` | `audit:correct` (ADMIN) | Append a correction entry referencing an audit record by id (target need not exist per spec edge case) |
| GET | `/importer-configs/:configId/runs/:runId/changes` | `audit:feed` (ADMIN) | Consequential changes + errors attributed to a run |
| (modified) GET/PATCH `/settings` | `settings:update` (ADMIN) | unchanged shape; settings now enforced at runtime and audited |

### GET /audit/activity

Query (Zod `ActivityFeedQuery`): `kind` (`entity`|`edge`), `entityType`,
`action`, `actor` (person id or name, incl. `importer:*`), `from`, `to`
(ISO-8601), `limit` (1–200, default 50), `offset` (≥0, default 0).

Response `200`: `{ items: ActivityFeedItem[], total: number, limit, offset }`
— reverse-chronological by `createdAt`.

### GET /audit/entities/:entityType/:entityId

Path params validated as `text`/`uuid`. Query: same filters minus
`entityType`/`entityId` (`kind`, `action`, `actor`, `from`, `to`, `limit`,
`offset`).

Response `200`: same envelope as `/audit/activity`. `404` is **not** raised
for unknown entities — the feed simply returns `items: []` (history must
survive entity deletion; spec edge case).

### POST /audit/corrections

Body (Zod `CorrectionInput`): `{ entryId: uuid, entryKind: 'entity'|'edge',
note: string 1..2000 }`.

Response `201`: `{ change: EntityChange | EdgeChange }` — the appended
correction entry (`action: 'correction'`, `changes.corrects = entryId`).
Per the spec edge case, the entry is accepted even if `entryId` does not exist
in the target table; no `404` is returned.

### GET /importer-configs/:configId/runs/:runId/changes

Response `200`: `{ changes: EntityChange[], errors: ImportRunError[] }` —
`entity_changes` rows where `importRunId = :runId` plus the run's existing
`import_run_errors`. `404` if the run doesn't exist or belongs to another
config.

## Modified behavior (no new routes)

- `PATCH /settings` — each accepted change writes an `entity_changes` row
  (`entityType='settings'`, `changes` = key → new value, secrets never
  written); new bounds validation on timeout keys.
- `POST /auth/login` (success + failure), `POST /auth/logout`,
  `POST /auth/password/change`, OIDC callback sign-in, session revocation
  routes, user-admin routes — now write audit entries per data-model.md.
- Session validation honors `sessionIdleTimeoutMs` / `sessionAbsoluteTimeoutMs`
  from settings (env var override > DB > default).

## New error codes (packages/core)

- None required for the audit surface. Corrections are validated only by the
  Zod `CorrectionInput` schema; existence of the referenced entry is not checked.
- Existing codes reused: `VALIDATION_FAILED`, `AUTH_NO_SESSION`,
  `AUTH_FORBIDDEN`, `NOT_FOUND`.
