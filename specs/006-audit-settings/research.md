# Research: Audit & Settings (006)

All open questions resolved — the codebase already contains most of the
infrastructure; the decisions below cover the gaps.

## R1 — How to attribute importer-driven changes to a run

**Decision**: Add a nullable `importRunId` column to `entity_changes`
(FK → `import_runs.id`, `ON DELETE SET NULL` — audit entries must survive run
record retention), plus an index. Importer-driven entries get
`createdBy = null` and `createdByName = 'importer:<name>'` (e.g.
`importer:github`); the run linkage carries "run 42" granularity. Actor filter
on the feed matches `createdByName` prefix `importer:` for non-human actors.

**Rationale**: `entityId`/`createdAt` window-matching can't reliably attribute
changes to a run; an explicit FK is unambiguous and cheap. The clarified spec
(FR-005b) requires importer+run identity as the actor.

**Alternatives considered**: (a) join via `createdAt` between run start/finish —
rejected, breaks under concurrent runs (ADR-061 allows several); (b) a separate
`importer_actor` column — rejected, `createdByName` already exists for display
and the FK is the only machine-readable part needed.

## R2 — Where to record auth/security events

**Decision**: Reuse `entity_changes` with `entityType = 'auth'`,
`entityId = NULL` (migration relaxes the `NOT NULL`), `action` in
`login`/`login_failed`/`logout`/`password_change`, `changes` JSONB carrying
incidental context (e.g. `{method: 'local'|'oidc'}`). Failed logins record the
attempted username in `createdByName` with `createdBy = NULL`. No passwords,
tokens, or secrets in `changes` — enforced by never passing them to the writer.

**Rationale**: One append-only table, one feed, existing triggers apply. A
separate `security_events` table would need its own triggers, feed union, and
history handling for zero semantic gain.

**Alternatives considered**: dedicated `auth_events` table — rejected (more
surface, same shape); logging auth events only to Pino — rejected, spec's
clarification requires them in the audit trail proper.

## R3 — Correction entry representation

**Decision**: `action = 'correction'` on `entity_changes` (or `edge_changes`),
`changes = { "corrects": "<original entry id>", "note": "<admin note>" }`,
`entityType`/`entityId` copied from the corrected entry. A `POST
/audit/corrections` endpoint (Admin) validates `entryKind` (`entity` or
`edge`) and `note` length; it does **not** validate that the referenced entry
exists, per the spec edge case allowing corrections to non-existent or
already-corrected records.

**Rationale**: Follows ADR-100 exactly (corrections are new entries referencing
the original ID). Storing the reference inside `changes` avoids a schema
change; the FK can't be a real constraint anyway because the target may live in
either table.

**Alternatives considered**: nullable `correctsEntryId` column on both tables —
rejected, two columns for a rare action vs. zero columns using existing JSONB.

## R4 — Settings enforcement at runtime (FR-011/FR-012)

**Decision**: `SettingsService` gains a `getSetting(key)` reader backed by a
short-lived in-process cache invalidated synchronously by `updateSettings`
(same process — single-container deployment, ADR deployment model). The session
plugin reads `sessionIdleTimeoutMs` via `getSetting` per `verifySession` call;
`createSession` reads `sessionAbsoluteTimeoutMs` to compute `expiresAt`. Env
vars `SESSION_IDLE_TIMEOUT_MS`/`SESSION_ABSOLUTE_TIMEOUT_MS` remain
highest-precedence overrides (env > DB > typed default, per ADR-076).

**Rationale**: "Takes effect within one request cycle" (SC-004) rules out a
TTL-only cache; explicit invalidation on write is exact. A per-request DB read
would add a query to every authenticated request; a process-local cache with
write-through invalidation is correct and cheap.

**Alternatives considered**: fixed-TTL cache — rejected, violates SC-004;
direct per-request query — rejected, wasteful.

## R5 — Unified feed query shape

**Decision**: `GET /api/v1/audit/activity` returns a merged,
reverse-chronological feed over `entity_changes` ∪ `edge_changes` via a Kysely
`unionAll` of two projections with a `kind` discriminator
(`'entity' | 'edge'`), `LIMIT/OFFSET` pagination, and filters `entityType`,
`action`, `actor` (name or person id), `from`, `to`. Indexes:
`entity_changes(createdAt DESC)`, `edge_changes(createdAt DESC)`,
`entity_changes(entityType, entityId)`, `entity_changes(importRunId)`.

**Rationale**: A single endpoint keeps the frontend trivial (one TanStack
query, one table). Per-entity history is the same endpoint filtered
(`entityType` + `entityId`), so `GET /audit/entities/:type/:id` is sugar that
keeps route semantics obvious — implemented as a thin wrapper.

**Alternatives considered**: separate entity/edge feed endpoints merged in the
frontend — rejected, pagination across two sources is broken client-side;
keyset pagination — rejected as premature at 100k rows (offset is fine with the
indexes; ADR-081 range-filter work may revisit).

## R6 — Permissions

**Decision**: New permission keys in `rbac.ts` — `audit:feed` (ADMIN) gates the
global feed, run-changes view, and corrections (`audit:correct` = ADMIN);
per-entity history endpoints require only `verifySession` (all authenticated
roles, per clarification Q1).

**Rationale**: matches the clarified tiering and ADR-054's layered default-deny.

## R7 — Frontend placement

**Decision**: New `/activity` route guarded `ADMIN`, sidebar entry under the
admin group (alongside Users/Settings). A reusable `EntityHistoryPanel`
component (TanStack query + state-matrix handling per `docs/ux.md`) is embedded
on product, component, component-group, person/user, team, and LoB detail
views. The importer-run page gains a "Changes produced by this run" section
alongside the existing errors section.

## R8 — ADR-104 doc sync

**Decision**: All five new endpoints are added to `docs/openapi.yaml` in the
same change; `docs/api.md` is regenerated via `pnpm docs:api`; the existing
`api-docs-contract.test.ts` enforces `x-permission` ↔ `requireRole` and
`security: []` ↔ `verifySession` parity automatically.
