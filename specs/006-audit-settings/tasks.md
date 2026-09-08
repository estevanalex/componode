# Tasks: Audit & Settings

**Input**: Design documents from `/specs/006-audit-settings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Note**: Tests are required per constitution VI (test-first). Write failing
tests, verify they fail, then implement.

---

## Phase 1: Setup (shared schema, core contracts, permissions)

- [x] T001 Create migration `packages/backend/src/db/migrations/007_audit_read_surface.ts`: add `importRunId` FK to `entity_changes`, make `entityId` nullable, add `entity_changes` and `edge_changes` indexes per data-model.md
- [x] T002 Update Kysely `DB` types in `packages/backend/src/db/types.ts` to match `entity_changes` row changes
- [x] T003 [P] Extend `packages/core/src/contracts/audit.ts` with `importRunId` and activity feed types; create `packages/core/src/schemas/audit.ts` for `ActivityFeedQuery`, `EntityHistoryQuery`, `CorrectionInput`; export in `packages/core/src/index.ts`
- [x] T004 [P] Tighten `packages/core/src/schemas/settings.ts`: add `sessionIdleTimeoutMs`/`sessionAbsoluteTimeoutMs` upper bounds and `idle < absolute` cross-field validation
- [x] T005 [P] Add RBAC permission keys `audit:feed` and `audit:correct` (ADMIN) in `packages/backend/src/plugins/rbac.ts`

---

## Phase 2: Foundational (settings cache + session enforcement)

- [x] T006 Write failing integration test `packages/backend/test/integration/settings-enforcement.test.ts` asserting session idle/absolute timeouts come from `app_settings`, settings change takes effect without restart, and env vars still override
- [x] T007 Implement `SettingsService.getSetting(key)` with in-process cache invalidated on write in `packages/backend/src/services/settings-service.ts`
- [x] T008 Update `packages/backend/src/plugins/session.ts` to read `sessionIdleTimeoutMs` via `SettingsService.getSetting` instead of the hardcoded `IDLE_TIMEOUT_MS`
- [x] T009 Update `packages/backend/src/services/session-service.ts` `createSession` to compute `expiresAt` using `sessionAbsoluteTimeoutMs` from settings
- [x] T010 Verify no new audit-specific error code is required; if `AUDIT_ENTRY_NOT_FOUND` was stubbed in `packages/core/src/constants/error-codes.ts`, remove it (corrections do not validate existence)

**Checkpoint**: T006 passes; settings values now drive session expiry.

---

## Phase 3: User Story 1 - Browse the activity trail (Priority: P1) 🎯 MVP

**Goal**: Admin-only unified Activity feed: query, filter, paginate entity and edge changes.

**Independent Test**: Open Activity as Admin after a few mutations; see merged
reverse-chronological entries with actor, action, entity, timestamp; filter by
entity type and action; Viewer/Editor is denied.

### Tests for User Story 1

- [x] T011 [P] [US1] Write failing integration tests for `GET /api/v1/audit/activity` in `packages/backend/test/integration/audit-feed.test.ts` covering pagination, filters (kind, entityType, action, actor, date range), permission denial for non-admins; move the 100k-row 2s performance assertion to `packages/backend/test/perf/audit-feed.perf.test.ts` gated by `PERF=1` (SC-003)
- [x] T012 [P] [US1] Extend `packages/backend/test/unit/api-docs-contract.test.ts` (or create `audit-contract.test.ts`) to assert new audit endpoints are declared in `docs/openapi.yaml` with correct `x-permission` and `security` settings

### Implementation for User Story 1

- [x] T013 [US1] Create `packages/backend/src/services/audit-query-service.ts` with `getActivityFeed`, `getEntityHistory`, and `getRunChanges` query builders
- [x] T014 [US1] Implement `packages/backend/src/routes/audit.ts` with `GET /audit/activity` (Admin, `audit:feed`); declare the route in `docs/openapi.yaml` with `x-permission: audit:feed` and `security: []` per ADR-104
- [x] T015 [US1] Register `auditRoutes` in `packages/backend/src/app.ts` under `/api/v1`
- [x] T016 [US1] Add TanStack Query hooks `useActivityFeed`, `useEntityHistory`, `useRunChanges` in `packages/frontend/src/api/hooks/audit.ts`
- [x] T017 [US1] Create `packages/frontend/src/pages/activity.tsx` Admin Activity feed page with filters, pagination, and state matrix per `docs/ux.md`
- [x] T018 [US1] Wire `/activity` route (ADMIN guard) and admin-section sidebar entry in `packages/frontend/src/routes.tsx` and `packages/frontend/src/components/layout/sidebar.tsx`

**Checkpoint**: T011 passes; Activity feed works end-to-end for admins and is hidden/denied for non-admins.

---

## Phase 4: User Story 2 - Per-entity and per-run history (Priority: P2)

**Goal**: Contextual history on entity detail views and a "Changes produced by
this run" section on the import-run detail page.

**Independent Test**: View a specific component/product history; see only that
entity's changes. View a run; see its attributed transitions and errors.

### Tests for User Story 2

- [x] T019 [P] [US2] Write failing integration tests in `packages/backend/test/integration/audit-history.test.ts` for per-entity history (no cross-entity leakage, survives deleted actor), `GET /importer-configs/:c/runs/:r/changes`, and empty-state behavior

### Implementation for User Story 2

- [x] T020 [US2] Extend `packages/backend/src/routes/audit.ts` with `GET /audit/entities/:entityType/:entityId` (any authenticated, no `audit:feed` guard) and a stub `POST /audit/corrections` (`audit:correct`); update `docs/openapi.yaml` for these endpoints
- [x] T021 [US2] Add `GET /api/v1/importer-configs/:configId/runs/:runId/changes` to `packages/backend/src/routes/importers.ts` using `audit-query-service.ts`
- [x] T022 [US2] Create reusable `packages/frontend/src/components/entity-history.tsx` panel with reverse-chronological list, actor rendering, and empty/loading/error states
- [x] T023 [P] [US2] Embed `EntityHistory` panel on `packages/frontend/src/pages/component-detail.tsx`, `packages/frontend/src/pages/product-detail.tsx`, and `packages/frontend/src/pages/component-groups.tsx`
- [x] T024 [US2] Add "Changes produced by this run" section to `packages/frontend/src/pages/importer-run.tsx`

**Checkpoint**: T019 passes; history panels and run-changes view render correctly.

---

## Phase 5: User Story 3 - Complete audit coverage and corrections (Priority: P2)

**Goal**: Every consequential mutation and auth event produces an audit record;
corrections are appended without touching originals.

**Independent Test**: Run a mutation matrix (component, group, importer config,
user, settings, session revoke, login/logout, password change) and verify each
has a record; attempt direct audit row UPDATE/DELETE and watch the trigger
raise; append a correction and verify original unchanged.

### Tests for User Story 3

- [x] T025 [P] [US3] Write failing integration test `packages/backend/test/integration/audit-coverage.test.ts` covering component/group/importer-config/user/settings/session/auth event audit records, importer-driven `importRunId` attribution, and correction append-only behavior (corrections to non-existent entries are accepted per A2)

### Implementation for User Story 3

- [x] T026 [US3] Extend `packages/backend/src/services/audit-service.ts` with `writeAuthEvent` and a generic `writeEntityChange` helper usable by all services; all helpers accept an optional `trx` parameter for atomic writes; add `writeCorrection` for entity/edge corrections
- [x] T027 [P] [US3] Add audit writes to `packages/backend/src/services/component-catalog-service.ts` and `packages/backend/src/services/component-group-service.ts` update paths, passing the same `trx` as the domain mutation (FR-010)
- [x] T028 [P] [US3] Add audit writes to `packages/backend/src/services/importer-config-service.ts` create/update/delete paths, passing the same `trx` as the domain mutation (FR-010)
- [x] T029 [P] [US3] Add audit writes to `packages/backend/src/services/user-service.ts` create/role-change/deactivate/password-reset paths, passing the same `trx` as the domain mutation (FR-010)
- [x] T030 [P] [US3] Add auth-event audit writes to `packages/backend/src/services/auth-service.ts` (or `packages/backend/src/routes/auth.ts` if no service abstraction) and `packages/backend/src/services/session-service.ts` revocation paths; keep audit emission separate from role/registration enforcement
- [x] T031 [P] [US3] Add audit writes to `packages/backend/src/services/settings-service.ts` `updateSettings` and `updateOidcConfig`, passing the same `trx` as the domain mutation and masking secrets in `changes` (FR-010)
- [x] T032 [P] [US3] Add audit writes to `packages/backend/src/services/import-run-service.ts` for consequential importer transitions (lifecycle/status flips, discoveries), setting `importRunId` and `createdByName = 'importer:<name>'` (FR-006)
- [x] T033 [P] [US3] Wire `POST /audit/corrections` to `audit-service.writeCorrection` in `packages/backend/src/routes/audit.ts`; do **not** validate `entryId` existence (per spec edge case and updated contract); only validate `entryKind` and `note` via Zod

**Checkpoint**: T025 passes; coverage matrix is fully audited.

---

## Phase 6: User Story 4 - Operational settings take effect (Priority: P3)

**Goal**: `app_settings` values for registration, idle/absolute timeouts, and default user role actually govern behavior.

**Independent Test**: Set 1-minute idle timeout, wait, and get 401; disable
self-registration and see `/register` closed; new registration gets configured
default role.

### Tests for User Story 4

- [x] T034 [P] [US4] Write failing integration tests in `packages/backend/test/integration/settings-enforcement.test.ts` (or extend T006 file) for `allowSelfRegistration`, `defaultUserRole`, and timeout enforcement

### Implementation for User Story 4

- [x] T035 [US4] Update `packages/backend/src/routes/auth.ts` registration flow to read and enforce `allowSelfRegistration` from settings
- [x] T036 [US4] Update `packages/backend/src/routes/auth.ts` registration and OIDC callback to assign `defaultUserRole` from settings; call the audit helper from T030, do not duplicate audit emission logic
- [x] T037 [P] [US4] Verify `packages/backend/src/services/session-service.ts` and `packages/backend/src/routes/auth.ts` correctly consume settings-backed timeout values from T008/T009; add integration coverage in the same test file as T034
- [x] T038 [P] [US4] Update `packages/frontend/src/pages/settings.tsx` to display and validate new timeout bounds, default role, and self-registration toggle consistently

**Checkpoint**: T034 passes; settings control runtime behavior without restart.

---

## Phase 7: Polish & cross-cutting concerns

- [x] T039 [P] Update `docs/openapi.yaml` with the four new audit endpoints and settings behavioral notes; ensure `x-permission` and `security` tags are correct
- [x] T040 [P] Regenerate `docs/api.md` via `pnpm docs:api` and verify `api-docs-contract.test.ts` still passes
- [x] T041 Run full quickstart validation: `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build` green; execute `quickstart.md` scenarios
- [x] T042 [P] WCAG 2.1 AA sweep on new surfaces: Activity feed table keyboard navigation, history panel focus management, focus-visible rings, `aria-expanded`/`aria-current`, screen-reader pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (setup): no dependencies; blocks Phase 2 and all story work
- **Phase 2** (foundational): depends on Phase 1; blocks all user stories
- **Phase 3** (US1): depends on Phase 2; can proceed in parallel with later stories once its own tests exist
- **Phase 4** (US2): depends on US1 route/service skeleton (T013–T015)
- **Phase 5** (US3): depends on US1 skeleton + T026 audit helpers; call-sites are parallel
- **Phase 6** (US4): depends on Phase 2 settings cache; parallel with US3 backend changes
- **Phase 7** (polish): depends on all user stories

### User Story Dependencies

- **US1** (P1) → no story dependencies (MVP)
- **US2** (P2) → needs US1 `auditRoutes` and `audit-query-service.ts`
- **US3** (P2) → needs US1 skeleton + audit helper from T026
- **US4** (P3) → needs Phase 2 settings cache, can run parallel with US1–US3

### Within Each Story

1. Tests first (failing)
2. Services / helpers
3. Routes / endpoints
4. Frontend hooks/components/pages
5. Integration

### Parallel Opportunities

- Phase 1: T003, T004, T005 can run in parallel once T001 is done; T002
  depends on T001.
- Phase 2: T007, T008, T009, T010 can run in parallel after T006 is written.
- US1: T011 and T012 parallel; T016 and T017 parallel after T015; T018 depends
  on T017.
- US2: T023 and T024 parallel after T022.
- US3: T027, T028, T029, T030, T031, T032, T033 are parallel after T025/T026;
  T033 also depends on the audit route existing from T014/T020.
- US4: T035, T036, T037, T038 parallel after T034.
- Phase 7: T039, T040, T042 parallel; T041 is the final gate.

---

## Parallel Example: User Story 1

```bash
# Launch tests together:
Task T011: Write failing integration tests for /audit/activity
Task T012: Extend API-docs contract tests

# Launch core backend implementation together after tests fail:
Task T013: audit-query-service.ts
Task T014: routes/audit.ts

# Launch frontend work together after backend route exists:
Task T016: hooks/audit.ts
Task T017: pages/activity.tsx
Task T018: routes.tsx + sidebar
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1 (setup schema/core/permissions).
2. Complete Phase 2 (settings cache + session timeout — required by US4 but
   also needed for correctness of US1 auth/session tests).
3. Complete US1 (Activity feed + endpoint + page).
4. Stop and validate: admin can browse filtered activity feed; Viewer is denied.

### Incremental Delivery

1. US1 delivers core audit read value independently.
2. US2 adds contextual history and run-level attribution.
3. US3 closes the coverage gap and corrections.
4. US4 makes settings values actually govern runtime behavior.
5. Phase 7 completes documentation, contract tests, accessibility, and the
   regression gate.

### Notes

- T014/T020/T033 share `routes/audit.ts` — sequence them to avoid file
  conflicts.
- T026 must precede T027–T032 to provide shared auth/correction helpers.
- `docs/openapi.yaml` and `docs/api.md` (T039/T040) are gating CI per ADR-104;
  do not treat as optional.
