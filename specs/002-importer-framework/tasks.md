# Tasks: 002-importer-framework

**Input**: Design documents from `/specs/002-importer-framework/`

**Prerequisites**: `plan.md`, `spec.md`

**Tests**: TDD/test-first is required by the project constitution. Write failing tests before implementation, then make them pass.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Register new dependencies, create the GitHub importer package skeleton, and prepare the workspace.

- [ ] T001 [P] Add backend runtime dependencies `node-cron` and `p-queue` to `packages/backend/package.json`.
- [ ] T002 [P] Create `packages/importer-github/package.json` with `name: @componode/importer-github`, `type: module`, and workspace deps on `@componode/core` and `octokit`.
- [ ] T003 [P] Create `packages/importer-github/tsconfig.json` extending `../../tsconfig.base.json` and output `dist/`.
- [ ] T004 Add `@componode/importer-github` as a `workspace:*` dependency in `packages/backend/package.json`.
- [ ] T005 Run `pnpm install` and `pnpm -r build` to validate the new package workspace wiring.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core contracts, schema, validation, and shared utilities that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Core contracts & schema

- [ ] T006 [P] Update `packages/core/src/contracts/importer.ts` to the ADR-056 signature: `ImporterContext { runId, logger, signal, reportPhase, tracer? }`, `Importer.run(config, secrets, context): AsyncGenerator<DiscoveredAsset>`, and keep `SecretResolver` type for backend use only.
- [ ] T007 [P] Update `packages/core/src/contracts/discovered-asset.ts` to ADR-057: add `slug?: string`, add `deployedAt?: string` to instance, remove any `relationships` references, and rename `DiscoveredAssetEnvironment` → `DiscoveredAssetInstance`.
- [ ] T008 Update `packages/core/src/contracts/import-run.ts` to add `currentPhase?: string | null` and `cancelRequestedAt?: string | null`.
- [ ] T009 Update `packages/core/src/contracts/component-instance.ts` to add `slug`, `lastSeenAt`, and `lastSeenInRunId`.
- [ ] T010 Update `packages/core/src/contracts/component.ts` to add `lastSeenAt` and `lastSeenInRunId`.
- [ ] T011 Update `packages/core/src/constants/component-categories.ts` with the 24 ADR-013 values (including `REPOSITORY`) and update `COMPONENT_CATEGORY_META` with labels/descriptions.
- [ ] T012 Update `packages/core/src/validation/discovered-asset.ts` to match the new category enum, add `slug` validation, and add `deployedAt` to the instance schema.
- [ ] T013 Update `packages/core/src/index.ts` to re-export new/renamed types.

### Database migration & types

- [ ] T014 Create `packages/backend/src/db/migrations/004_importer_tracking.ts` to add:
  - `import_runs.currentPhase` (text, nullable)
  - `import_runs.cancelRequestedAt` (timestamptz, nullable)
  - `component_instances.lastSeenAt` (timestamptz, nullable)
  - `component_instances.lastSeenInRunId` (uuid, nullable, FK → import_runs.id ON DELETE SET NULL)
  - `component_instances.slug` (text, not null, unique)
  - `components.lastSeenAt` (timestamptz, nullable)
  - `components.lastSeenInRunId` (uuid, nullable, FK → import_runs.id ON DELETE SET NULL)
  - replace `components_category_check` with the ADR-013 category set.
- [ ] T015 Update `packages/backend/src/db/types.ts` (`ImportRunRow`, `ComponentInstanceRow`, `ComponentRow`) to reflect the new columns.

### Shared backend utilities

- [ ] T016 [P] Implement `packages/backend/src/utils/slug.ts` with `slugify`, `generateUniqueSlug`, `generateComponentSlug`, and `generateInstanceSlug` helpers.
- [ ] T017 [P] Update `packages/backend/src/utils/secret-resolver.ts` to export `resolveSecrets(secretRefs)` that supports `env:VAR_NAME` refs and redacts values in logs.
- [ ] T018 [P] Create `packages/backend/src/services/importer-registry.ts` to:
  - import manifests from `@componode/importer-github/manifest` (and future packages),
  - expose `getManifests()`, `getImporter(name)` (lazy), `getConfigSchema(name)`,
  - throw `NOT_FOUND` for unknown names.

### Unit tests (Foundational)

- [ ] T019 [P] Update `packages/core/test/validation/discovered-asset.test.ts` to cover new `slug`, `deployedAt`, and ADR-013 categories.
- [ ] T020 [P] Add `packages/backend/test/unit/slug.test.ts` for `slugify` and collision helpers.
- [ ] T021 [P] Add `packages/backend/test/unit/secret-resolver.test.ts` for env refs and missing variable errors.
- [ ] T022 [P] Add `packages/backend/test/unit/importer-registry.test.ts` for manifest loading, lazy implementation, and unknown importer handling.

**Checkpoint**: Foundation ready — core types, validation, DB types, migration, and shared utilities are in place and unit-tested.

---

## Phase 3: User Story 1 - Configure a GitHub importer (Priority: P1) 🎯 MVP

**Goal**: Admins can create, edit, delete, and list GitHub importer configurations; the registry is exposed for the UI.

**Independent Test**: After this phase, `GET /api/v1/importers` and full `importer_configs` CRUD work without needing a run.

### Tests for User Story 1

- [ ] T023 [P] [US1] Add integration test `packages/backend/test/integration/importer-configs.test.ts` covering CRUD, validation, RBAC, and schedule validation.

### Implementation for User Story 1

- [ ] T024 [P] [US1] Add `importer` schemas to `packages/core/src/schemas/importer-config.ts` (`createImporterConfigSchema`, `updateImporterConfigSchema`) with `importerName`, `label`, `scope`, `secretRefs`, `schedule`, and `enabled`.
- [ ] T025 [US1] Export new schema types from `packages/core/src/index.ts`.
- [ ] T026 [US1] Implement `packages/backend/src/services/importer-config-service.ts` with `listImporterConfigs`, `getImporterConfig`, `createImporterConfig`, `updateImporterConfig`, and `deleteImporterConfig`.
- [ ] T027 [US1] Implement `packages/backend/src/routes/importers.ts` endpoints:
  - `GET /importers` (registry)
  - `GET /importer-configs`
  - `GET /importer-configs/:id`
  - `POST /importer-configs`
  - `PATCH /importer-configs/:id`
  - `DELETE /importer-configs/:id`
- [ ] T028 [US1] Add RBAC actions to `packages/backend/src/plugins/rbac.ts`:
  - `importer:config:create` → ADMIN
  - `importer:config:update` → ADMIN
  - `importer:config:delete` → ADMIN
  - `importer:run:trigger` → EDITOR
  - `importer:run:cancel` → EDITOR
- [ ] T029 [US1] Register `importerRoutes` in `packages/backend/src/app.ts` at prefix `/api/v1`.

**Checkpoint**: User Story 1 is independently functional — registry and config CRUD are testable through the API.

---

## Phase 4: User Story 2 - Trigger and watch an import run (Priority: P2)

**Goal**: Editors/admins can trigger a GitHub import, the run executes asynchronously, yields repositories, and upserts `Component`/`ComponentInstance` records while the UI polls status.

**Independent Test**: After this phase, a triggered run moves `PENDING → RUNNING → COMPLETED`, repos appear in `components`/`component_instances`, and polling returns live counts/phase.

### Tests for User Story 2

- [ ] T030 [P] [US2] Add integration test `packages/backend/test/integration/import-runs.test.ts` covering trigger (202), state machine, concurrency guard, cancellation, and recovery.
- [ ] T031 [P] [US2] Add integration test `packages/backend/test/integration/importer-github.test.ts` using `nock` to mock GitHub API and verify end-to-end upsert through `ImportRunService`.
- [ ] T032 [P] [US2] Add integration test `packages/backend/test/integration/import-reconciliation.test.ts` with a mock importer to verify phase-1 orphaning and phase-2 retirement.

### Implementation for User Story 2

- [ ] T033 [US2] Implement `packages/backend/src/services/import-run-service.ts`:
  - `startRun(configId, triggeredBy?)` → 202 + runId
  - `cancelRun(runId)` → durable cancellation
  - worker that instantiates importer, resolves secrets, iterates generator, validates, upserts per asset, updates counts/phase, and transitions state.
- [ ] T034 [US2] Implement upsert helpers inside `import-run-service.ts` (or `packages/backend/src/services/component-upsert-service.ts`) for `Component` by `(category, provider, externalId)` and `ComponentInstance` by `(componentId, externalId)`, including slug generation and `lastSeenAt`/`lastSeenInRunId` updates.
- [ ] T035 [US2] Implement phase-1 reconciliation (per-component instance orphaning to `GONE`) during the run.
- [ ] T036 [US2] Implement phase-2 reconciliation (component `lifecycle = RETIRED`) on `COMPLETED` for components with `lastSeenInRunId` not equal to the current run.
- [ ] T037 [US2] Implement `packages/backend/src/services/scheduler-service.ts` to load enabled configs, schedule cron jobs with `node-cron`, and reschedule on config changes.
- [ ] T038 [US2] Implement `packages/backend/src/services/recovery-service.ts` to mark stale `RUNNING`/`PENDING` rows as `INTERRUPTED`/`CANCELLED` on server startup.
- [ ] T039 [US2] Add run endpoints to `packages/backend/src/routes/importers.ts`:
  - `POST /importer-configs/:id/trigger`
  - `GET /importer-configs/:id/runs`
  - `GET /importer-configs/:id/runs/:runId`
  - `GET /importer-configs/:id/runs/:runId/errors`
  - `POST /importer-configs/:id/runs/:runId/cancel`
- [ ] T040 [US2] Implement `packages/importer-github/src/config.ts` with a Zod schema for `org`, optional `repos`, `includeForks`, `includeArchived`.
- [ ] T041 [US2] Implement `packages/importer-github/src/manifest.ts` exporting `{ name, label, description, version, implPath, configSchema }`.
- [ ] T042 [US2] Implement `packages/importer-github/src/importer.ts` — `GithubImporter` class implementing `Importer`, using `Octokit` with `auth: secrets.token`, paginating repos, filtering by config, yielding `DiscoveredAsset` records with `category = REPOSITORY`, `provider = GITHUB`, `resourceType = github:repository`, and respecting `AbortSignal`.
- [ ] T043 [US2] Add `packages/importer-github/package.json` exports for `./manifest` and `./importer`.
- [ ] T044 [US2] Add `packages/importer-github/test/importer.test.ts` with mocked Octokit to test yields and `AbortSignal` handling.
- [ ] T045 [US2] Add importer-run metrics to `packages/backend/src/plugins/metrics.ts`:
  - `import_runs_total` (labels: importer, status)
  - `import_run_duration_seconds` (labels: importer)
  - `import_run_assets_yielded_total` (labels: importer)
  - `import_run_errors_total` (labels: importer, errorType)
- [ ] T046 [US2] Wire recovery and scheduler initialization in `packages/backend/src/server.ts` (after migrations, before `app.listen`).

**Checkpoint**: User Story 2 is independently functional — triggering and polling a GitHub import run works end-to-end.

---

## Phase 5: User Story 3 - Cancel, recover, and reconcile imports (Priority: P3)

**Goal**: The framework is resilient: cancellation, restart recovery, and two-phase reconciliation keep the catalog accurate.

**Independent Test**: After this phase, cancelling a run, restarting the backend mid-run, and re-running with missing assets all produce correct `GONE`/`RETIRED` states.

### Tests for User Story 3

- [ ] T047 [P] [US3] Expand `packages/backend/test/integration/import-runs.test.ts` with cancellation and recovery scenarios.
- [ ] T048 [P] [US3] Expand `packages/backend/test/integration/import-reconciliation.test.ts` with phase-2 retirement and re-appearance flips.

### Implementation for User Story 3

- [ ] T049 [US3] Verify cancellation in `import-run-service.ts`:
  - `cancelRun` sets `cancelRequestedAt` and calls `AbortController.abort()`.
  - Worker catches `AbortError` and transitions to `CANCELLED`.
- [ ] T050 [US3] Verify recovery in `recovery-service.ts`:
  - `RUNNING` + `cancelRequestedAt` → `CANCELLED`
  - `RUNNING` without `cancelRequestedAt` → `INTERRUPTED`
  - `PENDING` → `INTERRUPTED`
- [ ] T051 [US3] Verify phase-1 orphaning in `import-run-service.ts` updates `ComponentInstance.status` to `GONE` for missing instances.
- [ ] T052 [US3] Verify phase-2 retirement in `import-run-service.ts` updates `Component.lifecycle` to `RETIRED` only on `COMPLETED`.

**Checkpoint**: User Stories 1, 2, and 3 all work independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Frontend UI, final wiring, documentation, and full verification.

- [ ] T053 [P] Add frontend API types in `packages/frontend/src/api/types.ts` (`ImporterManifest`, `ImporterConfig`, `ImportRun`, `ImportRunStatus`).
- [ ] T054 [P] Add frontend API hooks in `packages/frontend/src/api/hooks/importers.ts` for registry, configs, trigger, cancel, runs, and polling.
- [ ] T055 [P] Implement `packages/frontend/src/components/importer-config-form.tsx` for GitHub config fields.
- [ ] T056 [US1] Implement `packages/frontend/src/pages/importers.tsx` listing configs, create/edit dialog, trigger button, and runs table.
- [ ] T057 [US2] Implement `packages/frontend/src/pages/importer-run.tsx` live run detail with polling, phase, counts, errors, and cancel.
- [ ] T058 Update `packages/frontend/src/routes.tsx` to add `/importers/:configId/runs/:runId`.
- [ ] T059 [P] Add `packages/frontend/test/unit/importer-config-form.test.tsx`.
- [ ] T060 Update `docs/importer-development.md` with the contributor contract and a short GitHub importer example.
- [ ] T061 Run `pnpm build` across all packages and fix any TypeScript errors.
- [ ] T062 Run `pnpm --filter @componode/core test:unit`, `pnpm --filter @componode/backend test:unit`, `pnpm --filter @componode/backend test:integration`, and `pnpm --filter @componode/frontend test`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs `importer_configs` CRUD to trigger a run).
- **User Story 3 (Phase 5)**: Depends on Phase 4 (needs running/cancelling runs to test recovery/reconciliation).
- **Polish (Phase 6)**: Depends on Phase 4/5 — frontend and final verification.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational. No dependencies.
- **User Story 2 (P2)**: Can start after User Story 1. Needs `importer_configs` rows and registry.
- **User Story 3 (P3)**: Can start after User Story 2. Needs active runs to cancel and reconcile.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation.
- Models/core contracts before services.
- Services before routes/endpoints.
- Backend before frontend for that story.
- Story complete before moving to next priority.

### Parallel Opportunities

- T001–T005 (Setup) can run in parallel.
- T006–T022 (Foundational) can run in parallel except where noted (e.g. T014 migration should precede T015).
- T023–T029 (US1) can run after foundational.
- T030–T046 (US2) can run after US1; model/service tests can run in parallel.
- T047–T052 (US3) can run after US2.
- T053–T062 (Polish) can run after US2/US3.

---

## Implementation Strategy

1. Complete Phase 1 and Phase 2 (foundation).
2. Complete Phase 3 (US1 — config CRUD) and validate with integration tests.
3. Complete Phase 4 (US2 — trigger/run/GitHub) and validate with integration tests.
4. Complete Phase 5 (US3 — cancel/recovery/reconciliation) and validate.
5. Complete Phase 6 (frontend + docs + full verification).

---

## Phase 7: Convergence

**Purpose**: Close remaining gaps identified after comparing the current implementation to `spec.md`, `plan.md`, and the constitution.

| ID | Gap Type | Severity | Source | Evidence | Remaining Work |
|----|----------|----------|--------|----------|----------------|
| F1 | completed | HIGH | FR-004 | `p-queue` is already wired in `import-run-service.ts` with `IMPORTER_MAX_CONCURRENCY` default 3. | Wire `p-queue` with `IMPORTER_MAX_CONCURRENCY` (default 3) and reject/queue additional runs. |
| F2 | missing | HIGH | FR-013, US2/AC4 | `packages/frontend/src/pages/importer-run.tsx` missing, route not in `routes.tsx` | Build live run detail page with polling, phase, counts, errors, and cancel. |
| F3 | missing | HIGH | US2/AC1, FR-003 | Dedicated `import-runs.test.ts` integration does not exist | Add `packages/backend/test/integration/import-runs.test.ts` covering 202, state machine, cancel, recovery, concurrency guard. |
| F4 | missing | MEDIUM | T031 | `packages/backend/test/integration/importer-github.test.ts` not created | Add nock-based GitHub API end-to-end upsert test through `ImportRunService`. |
| F5 | missing | MEDIUM | T032 | `packages/backend/test/integration/import-reconciliation.test.ts` not created | Add mock-importer integration test verifying phase-1 orphaning and phase-2 retirement. |
| F6 | missing | MEDIUM | T055 | `packages/frontend/src/components/importer-config-form.tsx` not extracted | Extract schema-driven GitHub config form from `pages/importers.tsx`. |
| F7 | missing | MEDIUM | US3/AC1 | `import-run-service.ts` cancel endpoint exists but lacks explicit `AbortError` → `CANCELLED` test path | Add/verify integration test for cancel → `CANCELLED` transition and `currentPhase`. |
| F8 | missing | LOW | T060 | `docs/importer-development.md` not updated | Document the importer contributor contract and GitHub example. |
| F9 | completed | LOW | Plan/Phase E, FR-010 | `signal` is already passed to `octokit.rest.repos.get` and `octokit.paginate.iterator` in `packages/importer-github/src/importer.ts`. | Pass `AbortSignal` to Octokit requests for true cancellation. |
| F10 | unrequested | LOW | plan:metrics | `traceDbQuery` is mentioned in plan but not implemented; metrics exist without tracing spans | Review whether `traceDbQuery` is needed for `002` or defer to observability milestone. |

### Remaining Tasks

- [x] T063 [P] Wire `p-queue` into `packages/backend/src/services/import-run-service.ts` with `IMPORTER_MAX_CONCURRENCY` default 3 per FR-004.
- [x] T064 [P] Add `packages/backend/test/integration/import-runs.test.ts` covering state machine, concurrency guard, cancellation, and recovery per F3.
- [x] T065 [P] Add `packages/backend/test/integration/importer-github.test.ts` (mocked `globalThis.fetch`) end-to-end upsert per F4.
- [x] T066 [P] Add `packages/backend/test/integration/import-reconciliation.test.ts` with a mock importer per F5.
- [x] T067 [US2] Implement `packages/frontend/src/pages/importer-run.tsx` live run detail with polling and cancel per F2.
- [x] T068 [US2] Update `packages/frontend/src/routes.tsx` to add `/importers/:configId/runs/:runId` per F2.
- [x] T069 [US1] Extract `packages/frontend/src/components/importer-config-form.tsx` schema-driven form per F6.
- [x] T070 [US2] Pass `context.signal` into Octokit paginate calls in `packages/importer-github/src/importer.ts` per F9.
- [x] T071 [P] Update `docs/importer-development.md` with contributor contract and GitHub example per F8.

---

## Phase 8: Convergence

**Purpose**: Close remaining gaps identified after the latest run.

- [x] T072 [P] Wire `traceDbQuery` around the `processAsset` transactions in `packages/backend/src/services/import-run-service.ts` per plan:metrics (missing).
- [x] T073 [SC-004] Resolve the remaining `packages/backend` `test:integration` failures (`oidc.test.ts`, `rate-limit.test.ts`, `settings.test.ts`) so the full suite passes per SC-004 (partial).
