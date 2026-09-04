# Tasks: 003-component-catalog

**Input**: Design documents from `/specs/003-component-catalog/`

**Prerequisites**: `plan.md`, `spec.md`

**Tests**: TDD/test-first is required by the project constitution. Write failing tests before implementation, then make them pass.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Register the six new importer package skeletons and prepare workspace wiring.

- [x] T001 [P] Create `packages/importer-aws/package.json` and `packages/importer-aws/tsconfig.json` extending `../../tsconfig.base.json`.
- [x] T002 [P] Create `packages/importer-azure/package.json` and `packages/importer-azure/tsconfig.json`.
- [x] T003 [P] Create `packages/importer-kubernetes/package.json` and `packages/importer-kubernetes/tsconfig.json`.
- [x] T004 [P] Create `packages/importer-web-url/package.json` and `packages/importer-web-url/tsconfig.json`.
- [x] T005 [P] Create `packages/importer-api-url/package.json` and `packages/importer-api-url/tsconfig.json`.
- [x] T006 [P] Create `packages/importer-mcp-server/package.json` and `packages/importer-mcp-server/tsconfig.json`.
- [x] T007 [P] Add the six new `@componode/importer-*` packages as `workspace:*` dependencies in `packages/backend/package.json`.
- [x] T008 [P] Run `pnpm install` and `pnpm -r build` to validate new package workspace wiring.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core catalog contracts, DB schema, and shared services that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Core contracts & schema

- [x] T009 [P] Update `packages/core/src/contracts/component.ts` to add `componentGroupId?: string | null`.
- [x] T010 [P] Create `packages/core/src/contracts/component-group.ts` with the `ComponentGroup` contract.
- [x] T011 [P] Create `packages/core/src/schemas/components.ts` for list filters and `ComponentGroup` CRUD validation.
- [x] T012 [P] Update `packages/core/src/index.ts` to re-export new catalog contracts and schemas.

### Database migration & types

- [x] T013 [P] Create `packages/backend/src/db/migrations/005_component_catalog.ts` adding:
  - `component_groups` table.
  - `components.componentGroupId` (uuid, nullable, FK → `component_groups.id` ON DELETE SET NULL).
  - B-tree indexes on `components.name`, `components.slug`, `components.externalId`, `components.componentGroupId`.
- [x] T014 [P] Update `packages/backend/src/db/types.ts` to reflect the `component_groups` table and new `ComponentRow`/`ComponentGroupRow` columns.

### Shared backend utilities

- [x] T015 Add `component:read`, `component:update`, `componentGroup:create`, `componentGroup:update`, `componentGroup:delete` RBAC actions to `packages/backend/src/plugins/rbac.ts`.
- [x] T016 Add `components_total` and `component_groups_total` Prometheus metrics to `packages/backend/src/plugins/metrics.ts`.

**Checkpoint**: Foundation ready — catalog types, schema, migrations, and RBAC are in place.

---

## Phase 3: User Story 1 - Browse and search the component catalog (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can list, filter, search, and paginate components in the catalog.

**Independent Test**: After this phase, `GET /api/v1/components` returns paginated components with filters and search, and the `/components` frontend page renders them.

### Tests for User Story 1

- [x] T017 [P] [US1] Add integration test `packages/backend/test/integration/components.test.ts` covering list, pagination, filters, search, and default exclusion of `RETIRED`/`GONE`.

### Implementation for User Story 1

- [x] T018 [US1] Implement `packages/backend/src/services/component-catalog-service.ts` with `listComponents({ page, pageSize, filters, search, sort })`.
- [x] T019 [US1] Implement `GET /api/v1/components` in `packages/backend/src/routes/components.ts`.
- [x] T020 [P] [US1] Add `packages/frontend/src/api/hooks/components.ts` for catalog list and filters.
- [x] T021 [P] [US1] Implement `packages/frontend/src/components/component-filters.tsx` for category, provider, lifecycle, status, and group filters.
- [x] T022 [P] [US1] Implement `packages/frontend/src/components/component-search.tsx` for name/slug/externalId search.
- [x] T023 [US1] Implement `packages/frontend/src/pages/components.tsx` catalog list page with table, filters, search, and 50-item pagination.
- [x] T024 [US1] Add `/components` route in `packages/frontend/src/routes.tsx`.

**Checkpoint**: User Story 1 is independently functional — the catalog list can be browsed and searched.

---

## Phase 4: User Story 2 - View component detail (Priority: P2)

**Goal**: Authenticated users can view a component's metadata and its instances.

**Independent Test**: After this phase, `GET /api/v1/components/:id` returns component detail with instances and group, and the frontend detail page renders it.

### Tests for User Story 2

- [x] T025 [P] [US2] Add integration test `packages/backend/test/integration/component-detail.test.ts` for `GET /api/v1/components/:id`.

### Implementation for User Story 2

- [x] T026 [US2] Add `getComponentById(id)` to `packages/backend/src/services/component-catalog-service.ts`.
- [x] T027 [US2] Implement `GET /api/v1/components/:id` in `packages/backend/src/routes/components.ts`.
- [x] T028 [US2] Add component detail query hook to `packages/frontend/src/api/hooks/components.ts`.
- [x] T029 [US2] Implement `packages/frontend/src/pages/component-detail.tsx` showing metadata, instances, and group.
- [x] T030 [US2] Add `/components/:id` route in `packages/frontend/src/routes.tsx`.

**Checkpoint**: User Story 2 is independently functional — component detail is viewable.

---

## Phase 5: User Story 3 - Manage component groups (Priority: P2)

**Goal**: Editors and admins can create, update, delete, and assign `ComponentGroup` records.

**Independent Test**: After this phase, component group CRUD and component assignment work through the API and UI.

### Tests for User Story 3

- [x] T031 [P] [US3] Add integration test `packages/backend/test/integration/component-groups.test.ts` covering CRUD, slug uniqueness, RBAC, and assignment.

### Implementation for User Story 3

- [x] T032 [US3] Implement `packages/backend/src/services/component-group-service.ts` with CRUD and user-owned slug validation.
- [x] T033 [US3] Implement `packages/backend/src/routes/component-groups.ts` for `GET`/`POST`/`PATCH`/`DELETE`.
- [x] T034 [US3] Implement `PATCH /api/v1/components/:id` to set/unset `componentGroupId` in `packages/backend/src/routes/components.ts`.
- [x] T035 [P] [US3] Add `packages/frontend/src/api/hooks/component-groups.ts`.
- [x] T036 [US3] Implement `packages/frontend/src/pages/component-groups.tsx` for group CRUD and component assignment.
- [x] T037 [US3] Add `/component-groups` route in `packages/frontend/src/routes.tsx`.

**Checkpoint**: User Story 3 is independently functional — groups can be managed and assigned.

---

## Phase 6: User Story 4 - Add the remaining v1 importers (Priority: P3)

**Goal**: The AWS, Azure, Kubernetes, Web URL, API URL, and MCP server importers are implemented and tested.

**Independent Test**: After this phase, each new importer yields `DiscoveredAsset` records and populates `Component`/`ComponentInstance` rows with the correct provider and category.

### Tests for User Story 4

- [x] T038 [P] [US4] Add unit test `packages/importer-aws/test/importer.test.ts` with mocked AWS SDK that asserts the importer yields valid `DiscoveredAsset` records, does not access `process.env`, and does not yield component-to-component edges.
- [x] T039 [P] [US4] Add unit test `packages/importer-azure/test/importer.test.ts` with mocked Azure SDK that asserts the importer yields valid `DiscoveredAsset` records, does not access `process.env`, and does not yield component-to-component edges.
- [x] T040 [P] [US4] Add unit test `packages/importer-kubernetes/test/importer.test.ts` with mocked Kubernetes client that asserts the importer yields valid `DiscoveredAsset` records, does not access `process.env`, and does not yield component-to-component edges.
- [x] T041 [P] [US4] Add unit test `packages/importer-web-url/test/importer.test.ts` with mocked `fetch` that asserts the importer yields valid `DiscoveredAsset` records, does not access `process.env`, and does not yield component-to-component edges.
- [x] T042 [P] [US4] Add unit test `packages/importer-api-url/test/importer.test.ts` with mocked `fetch` that asserts the importer yields valid `DiscoveredAsset` records, does not access `process.env`, and does not yield component-to-component edges.
- [x] T043 [P] [US4] Add unit test `packages/importer-mcp-server/test/importer.test.ts` with mocked MCP client that asserts the importer yields valid `DiscoveredAsset` records, does not access `process.env`, and does not yield component-to-component edges.

### Implementation for User Story 4

- [x] T044 [P] [US4] Implement `packages/importer-aws/src/manifest.ts`, `src/config.ts`, `src/importer.ts`.
- [x] T045 [P] [US4] Implement `packages/importer-azure/src/manifest.ts`, `src/config.ts`, `src/importer.ts`.
- [x] T046 [P] [US4] Implement `packages/importer-kubernetes/src/manifest.ts`, `src/config.ts`, `src/importer.ts`.
- [x] T047 [P] [US4] Implement `packages/importer-web-url/src/manifest.ts`, `src/config.ts`, `src/importer.ts`.
- [x] T048 [P] [US4] Implement `packages/importer-api-url/src/manifest.ts`, `src/config.ts`, `src/importer.ts`.
- [x] T049 [P] [US4] Implement `packages/importer-mcp-server/src/manifest.ts`, `src/config.ts`, `src/importer.ts`.
- [x] T050 [P] [US4] Add `packages/importer-aws/package.json` exports for `./manifest` and `./importer`.
- [x] T051 [P] [US4] Add `packages/importer-azure/package.json` exports for `./manifest` and `./importer`.
- [x] T052 [P] [US4] Add `packages/importer-kubernetes/package.json` exports for `./manifest` and `./importer`.
- [x] T053 [P] [US4] Add `packages/importer-web-url/package.json` exports for `./manifest` and `./importer`.
- [x] T054 [P] [US4] Add `packages/importer-api-url/package.json` exports for `./manifest` and `./importer`.
- [x] T055 [P] [US4] Add `packages/importer-mcp-server/package.json` exports for `./manifest` and `./importer`.
- [x] T056 [US4] Add the six new `@componode/importer-*` package names to `packages/backend/src/services/importer-registry.ts` `IMPORTER_PACKAGES`.
- [x] T057 [P] [US4] Add backend integration test `packages/backend/test/integration/importers-other.test.ts` covering all six importers with mocked SDKs/fetch.

**Checkpoint**: User Story 4 is independently functional — all new importers are wired and tested.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final typecheck, build, tests, and documentation validation.

- [x] T058 [P] Run `pnpm -r typecheck` and fix any TypeScript errors.
- [x] T059 [P] Run `pnpm -r build` and fix any build errors.
- [x] T060 [P] Run `pnpm -r test:unit` and fix any failures.
- [x] T061 Run `pnpm --filter @componode/backend test:integration` and fix any failures.
- [x] T062 Run the validation steps in `specs/003-component-catalog/quickstart.md` against a running stack.

---

## Phase 8: Performance & Observability Gaps

**Purpose**: Validate the catalog performance success criteria that currently lack explicit build tasks.

- [x] T063 [P] Add an integration or load test that verifies `GET /api/v1/components` completes within 1 second for 1,000 components.
- [x] T064 [P] Add a frontend responsiveness check (manual or Lighthouse) that verifies the `/components` default view with 1,000 components remains usable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2.
- **User Story 2 (Phase 4)**: Depends on Phase 2; uses the same catalog service and routes from US1.
- **User Story 3 (Phase 5)**: Depends on Phase 2; can proceed in parallel with US1/US2 once foundational is ready.
- **User Story 4 (Phase 6)**: Depends on Phase 2 and the importer framework from 002.
- **Polish (Phase 7)**: Depends on all user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational. No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational. Reuses catalog service from US1 but can be tested independently.
- **User Story 3 (P2)**: Can start after Foundational. Independent of US1/US2 except shared RBAC.
- **User Story 4 (P3)**: Can start after Foundational. Independent importer work; integration tests need `import-run-service` from 002.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation.
- Models/core contracts before services.
- Services before routes/endpoints.
- Backend before frontend for that story.
- Story complete before moving to next priority.

### Parallel Opportunities

- T001–T008 (Setup) can run in parallel.
- T009–T016 (Foundational) can run in parallel except where noted.
- T017–T024 (US1) can run after foundational.
- T025–T030 (US2), T031–T037 (US3), and T038–T057 (US4) can run in parallel after foundational.
- T058–T062 (Polish) run last.

---

## Implementation Strategy

1. Complete Phase 1 and Phase 2 (foundation).
2. Complete Phase 3 (US1 — catalog list) and validate with integration tests.
3. Complete Phase 4 (US2 — detail) and Phase 5 (US3 — groups) in parallel or sequence.
4. Complete Phase 6 (US4 — importers) in parallel where possible.
5. Complete Phase 7 (polish and full verification).

## Phase 9: Convergence

**Purpose**: Close spec/constitution gaps identified by `/speckit-converge`.

- [x] T065 [P] Implement `includeRetired` and `includeGone` boolean query parameters and default `RETIRED`/`GONE` exclusion in `packages/core/src/schemas/components.ts`, `packages/backend/src/services/component-catalog-service.ts`, and `packages/backend/src/routes/components.ts` per FR-004 (critical)
- [x] T066 [P] Update `GET /api/v1/components` response envelope to `{ data, pagination: { page, pageSize, total, pageCount, hasNext } }` per FR-001 (critical)
- [x] T067 [P] Update `packages/core/src/schemas/components.ts` and `packages/backend/src/services/component-catalog-service.ts` to accept repeated multi-value query parameters (e.g. `?category=A&category=B`) and OR within dimension / AND across dimensions per FR-002 (high)
- [x] T068 [P] Add unit-test assertions to each `packages/importer-*/test/importer.test.ts` and `src/importer.ts` that `validateDiscoveredAsset` from `@componode/core` is called on every yielded `DiscoveredAsset` per FR-008 / Constitution VI (high)
- [x] T069 [P] Add unit-test assertions to each `packages/importer-*/test/importer.test.ts` that no `process.env` or `SecretResolver` access occurs inside the importer `run` implementation per FR-009 (high)
- [x] T070 [P] Add unit-test assertions to each `packages/importer-*/test/importer.test.ts` that yielded `DiscoveredAsset` records do not include `DEPENDS_ON`, `SOURCES_FROM`, or `EXPOSES` relationships per FR-010 (high)
- [x] T071 [P] Run the quickstart steps in `specs/003-component-catalog/quickstart.md` against a live stack and record the outcome per T062 (medium)
