# Implementation Plan: Audit & Settings

**Branch**: `006-audit-settings` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-audit-settings/spec.md`

## Summary

Ship the audit **read surface** and close coverage/enforcement gaps on top of
what already exists: append-only `entity_changes`/`edge_changes`/
`import_run_errors` tables with triggers, `writeEntityChange`/`writeEdgeChange`
writers (products/org/edges only), `app_settings` storage + settings UI, and
user/session admin. This feature adds: (1) an Admin-only unified Activity feed
API + page merging entity and edge changes with filters and pagination;
(2) per-entity history readable by all authenticated roles, plus per-run change
attribution on the import-run detail view; (3) extended audit coverage —
component/group edits, importer configs, user admin, settings changes, session
revocation, and security auth events — including importer/run actor identity and
correction entries; (4) runtime enforcement of session idle/absolute timeouts
from `app_settings`. One schema migration adds `importRunId` to
`entity_changes` and makes `entityId` nullable (for entity-less auth events).
All new endpoints are added to `docs/openapi.yaml` and `docs/api.md` is
regenerated per ADR-104.

## Technical Context

**Language/Version**: TypeScript 5 (strict)

**Primary Dependencies**: Fastify, Kysely, Zod (backend); React 18, TanStack
Query, React Router, Tailwind/shadcn (frontend); `uuidv7` for IDs

**Storage**: PostgreSQL via Kysely migrations; existing tables
`entity_changes`, `edge_changes`, `import_run_errors`, `import_runs`,
`app_settings`, `sessions`, `oidc_config`

**Testing**: Vitest — unit tests (services, hooks), integration tests
(testcontainers Postgres) for audit write paths and query surface, contract
test for OpenAPI/route drift (existing `api-docs-contract.test.ts`)

**Target Platform**: Node.js backend serving bundled frontend; Docker Compose
single container

**Project Type**: pnpm monorepo web application (`packages/core`,
`packages/backend`, `packages/frontend`)

**Performance Goals**: Activity feed filtered queries < 2s at 100k audit rows
(SC-003) — requires indexes on `entity_changes(createdAt)`,
`entity_changes(entityType, entityId)`, `entity_changes(importRunId)`,
`edge_changes(createdAt)`

**Constraints**: Append-only integrity enforced by existing triggers
(ADR-100); no `sql.raw()`/`sql.fragment()` (ADR-084) — the feed UNION query
must use `unionAll` expression builders or `sql` template with parameterized
values only; Zod validation at route boundary (ADR-095); error shape
`{code,message,details?}` (ADR-071); GET routes side-effect-free (ADR-094);
all routes authenticated except public auth + `/metrics` (ADR-097)

**Scale/Scope**: 5 new API endpoints, 1 migration, ~10 service touch-points
for audit coverage, 1 new page + history panels on existing detail views

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict | Notes |
|---|---|---|
| I. Single-org | Pass | No tenant concepts |
| II. Importer-first | Pass | Importers unchanged; core records transitions |
| III. Two-level taxonomy | Pass | Not touched |
| IV. Environment-as-instance | Pass | Audit observes lifecycle/status, doesn't redefine |
| V. Factual vs. meaning | Pass | No importer-declared product edges |
| VI. Test-first | Pass | Failing tests before implementation, per task plan |
| VII. Observability | Pass | New routes get request logging/metrics automatically; audit query count metric optional |

No violations. **Post-Phase-1 re-check: still clean** — the design adds one
nullable column, one FK column, indexes, and additive routes; nothing
contradicts the seven principles.

## Project Structure

### Documentation (this feature)

```text
specs/006-audit-settings/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output — new endpoint contracts
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/core/src/
├── contracts/
│   ├── audit.ts               # extend: filters, feed item union, correction input
│   └── app-settings.ts        # unchanged shape; bounds validation added
└── constants/                 # audit action + entity-type constants, error codes

packages/backend/src/
├── db/migrations/007_audit_read_surface.ts   # importRunId, nullable entityId, indexes
├── db/types.ts                               # row types updated
├── plugins/
│   ├── rbac.ts                # + audit:feed, audit:correct permissions
│   └── session.ts             # idle timeout from SettingsService
├── routes/audit.ts            # NEW: activity feed, entity history, corrections
├── routes/importers.ts        # + GET /importer-configs/:cid/runs/:rid/changes
├── services/
│   ├── audit-service.ts       # + query fns, auth-event writer, correction writer
│   ├── audit-query-service.ts # NEW: feed/history queries (kept separate from writers)
│   ├── settings-service.ts    # + cached getSetting(key), audit write on change
│   ├── session-service.ts     # absolute timeout from settings; audit on revoke
│   ├── auth-service.ts        # audit login/logout/failed-login/password-change
│   ├── import-run-service.ts  # write transition entity_changes w/ importRunId
│   ├── component-catalog-service.ts, component-group-service.ts,
│   ├── importer-config-service.ts, user-service.ts, product-edge-service.ts,
│   └── org-service.ts         # audit coverage (missing ones get writers)
└── test/
    ├── unit/                  # audit-query, settings-cache, session-timeout tests
    └── integration/           # audit write-path + append-only trigger tests

packages/frontend/src/
├── pages/activity.tsx         # NEW: Admin-only global feed
├── components/entity-history.tsx  # NEW: reusable history panel
├── api/hooks/audit.ts         # NEW: useActivityFeed, useEntityHistory, useRunChanges
├── pages/importer-run.tsx     # + "Changes produced by this run" section
├── pages/{component-detail,product-detail,component-groups,...}.tsx  # + history
├── routes.tsx                 # + /activity (ADMIN guard)
└── components/layout/         # sidebar: Activity entry under admin area
```

**Structure Decision**: Standard repo layout — new audit query route + service
in `packages/backend`, shared types in `packages/core`, one new page plus a
reusable history component in `packages/frontend`. Writers stay in
`audit-service.ts`; read paths get `audit-query-service.ts` so append-only
writers and query logic don't entangle.

## Complexity Tracking

No constitution violations — table omitted.
