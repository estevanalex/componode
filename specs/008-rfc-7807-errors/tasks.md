# Tasks: RFC 7807 Error Wrapping

**Input**: Design documents from `specs/008-rfc-7807-errors/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`

**Tests**: Included. Test-first is required by the project constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Configuration)

**Purpose**: Prepare the project for the RFC 7807 migration.

- [ ] T001 [P] Document `PROBLEM_TYPE_BASE` environment variable in `.env.example` and `docs/deployment.md`.
- [ ] T002 [P] Create `packages/core/src/errors/` directory for the new Problem builder module.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared Problem envelope and ErrorType mapping that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational

- [ ] T003 [P] Create `packages/core/test/errors/problem.test.ts` with failing tests for Problem construction, `type` URI generation, and `invalid-params` shape.
- [ ] T004 [P] Create `packages/core/test/errors/error-types.test.ts` with failing tests for the `ERROR_CODES` to `type`/`title`/`status` mapping.

### Implementation for Foundational

- [ ] T005 [P] Create `packages/core/src/constants/error-types.ts` with the controlled `ErrorType` mapping for all `ERROR_CODES`.
- [ ] T006 Implement `packages/core/src/errors/problem.ts` Problem builder and type-URI helper that uses `PROBLEM_TYPE_BASE` or defaults to the canonical domain `https://componode.io` (depends on T005).
- [ ] T007 Export `Problem` builder and `ErrorType` mapping from `packages/core/src/index.ts` (depends on T006).
- [ ] T008 Run `pnpm --filter @componode/core test` and ensure foundational tests pass (depends on T003, T004, T007).

**Checkpoint**: The core Problem envelope is ready; backend and docs work can now begin.

---

## Phase 3: User Story 1 - Standard, Machine-Readable API Errors (Priority: P1) 🎯 MVP

**Goal**: Every API error response is returned as an RFC 7807 `application/problem+json` document.

**Independent Test**: Send an unauthenticated request to a protected endpoint and receive a problem document with `type`, `title`, `status`, `code`, and `message`.

### Tests for User Story 1

- [ ] T009 [US1] Create `packages/backend/test/integration/problem-errors.test.ts` with failing tests for 401, 403, 404, 409, 422, 429, and 500 problem responses.
- [ ] T010 [US1] Create `packages/backend/test/unit/not-found-handler.test.ts` with failing tests that unknown routes return a 404 problem document.

### Implementation for User Story 1

- [ ] T011 [US1] Update `packages/backend/src/plugins/error-handler.ts` to construct and send RFC 7807 Problem documents for all handled error paths (depends on T006, T009).
- [ ] T012 [US1] Update the `setNotFoundHandler` in `packages/backend/src/plugins/error-handler.ts` to return a 404 Problem document (depends on T006, T010).
- [ ] T013 [US1] Ensure `packages/backend/test/integration/health.test.ts` and other error-path tests still pass with the new problem envelope (depends on T011).
- [ ] T014 [US1] Run `pnpm --filter @componode/backend test` and ensure all backend tests pass (depends on T009, T010, T013).

**Checkpoint**: At this point, every API error returns `application/problem+json` and US1 is independently testable.

---

## Phase 4: User Story 2 - Backward Compatibility for Existing Clients (Priority: P2)

**Goal**: The existing `code`, `message`, and `details` fields remain in the response body so the frontend and existing tests continue to work.

**Independent Test**: Existing backend and frontend tests that assert `code` and `message` continue to pass after the migration.

### Tests for User Story 2

- [ ] T015 [US2] Create `packages/backend/test/integration/compatibility-errors.test.ts` with failing tests asserting `code`, `message`, and `details` are present in every problem document.
- [ ] T016 [US2] Create `packages/frontend/src/test/unit/problem-error.test.tsx` with failing tests that the frontend can still read `code` and `message` from an RFC 7807 response.

### Implementation for User Story 2

- [ ] T017 [US2] Verify `packages/frontend/src/api/client.ts` accepts `Content-Type: application/problem+json` responses and continues to expose `code`, `message`, and `details` as `ApiError` (depends on T011, T016).
- [ ] T018 [US2] Run `pnpm --filter @componode/backend test` and `pnpm --filter @componode/frontend test` and verify no regressions (depends on T014, T015, T017).

**Checkpoint**: User Story 1 and User Story 2 both work; the frontend and existing tests are unbroken.

---

## Phase 5: User Story 3 - Accurate API Documentation (Priority: P3)

**Goal**: The OpenAPI reference and docs site describe the new Problem response format.

**Independent Test**: The generated docs site shows a reusable `Problem` schema and every error response references it.

### Tests for User Story 3

- [ ] T019 [US3] Create `packages/backend/test/contract/openapi-errors.test.ts` with failing tests that every error response in `docs/openapi.yaml` references the `Problem` schema.
- [ ] T020 [US3] Create `packages/backend/test/contract/openapi-problem-schema.test.ts` with failing tests that the `Problem` schema includes `type`, `title`, `status`, `code`, `message`, `details`, and `invalid-params`.

### Implementation for User Story 3

- [ ] T021 [US3] Update `docs/openapi.yaml` `Error` schema to RFC 7807 `Problem` schema with Componode extensions (depends on T005).
- [ ] T022 [US3] Update `docs/openapi.yaml` response `description` and `content` blocks to reference the `Problem` schema for all error responses (depends on T021).
- [ ] T023 [US3] Update `docs/api.md` error section to describe `application/problem+json`, the `Problem` fields, and the `type` URI convention (depends on T021).
- [ ] T024 [US3] Run `pnpm docs:build` and `scripts/test-docs-site.sh` and verify the Problem schema renders (depends on T020, T023).

**Checkpoint**: All user stories are independently functional and documented.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, consistency, and repository hygiene.

- [ ] T025 [P] Run `pnpm lint` and fix any issues.
- [ ] T026 [P] Run `pnpm typecheck` and fix any issues.
- [ ] T027 [P] Run `pnpm build` and fix any issues.
- [ ] T028 [P] Run `pnpm test` and fix any regressions.
- [ ] T029 Run the quickstart validation scenarios in `specs/008-rfc-7807-errors/quickstart.md`.
- [ ] T030 Run `speckit-analyze` across `specs/008-rfc-7807-errors/spec.md`, `plan.md`, and `tasks.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion.
  - User stories can proceed in parallel (if staffed).
  - Or sequentially in priority order (P1 → P2 → P3).
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) and after US1 implementation begins (depends on T011 for the envelope shape), but is independently testable.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - depends on the `Problem` schema shape and OpenAPI contract.

### Within Each User Story

- Tests MUST be written and FAIL before implementation.
- Core builder before backend handler.
- Backend handler before frontend/docs consumers.
- Story complete before moving to next priority.

### Parallel Opportunities

- T001 and T002 are parallel.
- T003, T004, and T005 are parallel.
- T009 and T010 can be written in parallel once T006/T007 are ready.
- T015, T016, T17, and T19/T20 are parallel after T011.
- T025, T026, T027, and T028 are parallel in the Polish phase.

---

## Parallel Example: User Story 1

```powershell
# Launch all US1 tests together:
Task T009: "packages/backend/test/integration/problem-errors.test.ts"
Task T010: "packages/backend/test/unit/not-found-handler.test.ts"

# Launch US1 implementation once tests fail:
Task T011: "packages/backend/src/plugins/error-handler.ts"
Task T012: "packages/backend/src/app.ts not-found handler"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Test User Story 1 independently.
5. Continue to US2 and US3 only after US1 passes.

### Incremental Delivery

1. Setup + Foundational → Core builder ready.
2. User Story 1 → All errors are `problem+json`.
3. User Story 2 → Backward compatibility verified.
4. User Story 3 → OpenAPI/docs updated.
5. Polish → Full validation and analysis.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps a task to a specific user story for traceability.
- Each user story should be independently completable and testable.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Avoid vague tasks, same file conflicts, and cross-story dependencies that break independence.
