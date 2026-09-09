# Tasks: SPA Direct Navigation & Initial CSRF Cookie

**Input**: Design documents from `specs/009-bugfix-spa-csrf/`

**Prerequisites**: `spec.md` (required), `plan.md` (required)

**Tests**: Included. Test-first is required by the project constitution.

---

## Phase 1: Regression Tests

**Purpose**: Reproduce the two bugs with failing tests before applying the fixes.

- [x] T001 [P] Update `packages/backend/test/unit/not-found-handler.test.ts` with failing tests for:
  - `GET /login` with `Accept: text/html` should return `200` `text/html`.
  - `GET /api/v1/unknown` with `Accept: text/html` should still return `404` `application/problem+json`.
- [x] T002 [P] Update `packages/backend/test/integration/csrf.test.ts` with a failing test for:
  - A safe `GET /api/v1/health` without a `componode_csrf` cookie must set one, and a subsequent matching `POST /api/v1/auth/login` must succeed.

---

## Phase 2: Implementation

**Purpose**: Apply the minimal fixes to the backend plugins.

- [x] T003 Update `packages/backend/src/plugins/error-handler.ts` `setNotFoundHandler` to:
  - Detect browser-style `GET`/`HEAD` requests (text/html, `*/*`, or no `Accept`).
  - Return `index.html` when `reply.sendFile` is available and the URL is not `/api/...` or `/metrics`.
  - Keep the existing RFC 7807 `application/problem+json` 404 for API/metrics routes and non-HTML clients.
- [x] T004 Update `packages/backend/src/plugins/csrf.ts` to add an `onSend` hook that:
  - Issues a `componode_csrf` cookie on `GET`/`HEAD` responses when the request does not already have one.
  - Returns the payload unchanged.
  - Does not change the preHandler verification for state-changing methods.

---

## Phase 3: Documentation & Decisions

**Purpose**: Record the bug and the fix in the project spec/ADR/AGENTS records.

- [x] T005 [P] Create `specs/009-bugfix-spa-csrf/{spec.md,plan.md,tasks.md}`.
- [x] T006 [P] Add an **Amendment** to `researches/adrs/ADR-087-csrf-protection.md` documenting that the cookie is issued on the first safe `GET`/`HEAD` response.
- [x] T007 [P] Create `researches/adrs/ADR-105-spa-fallback-for-direct-navigation.md` and update `researches/architecture-decisions.md` index.
- [x] T008 [P] Add a "Bugfix spec workflow" section to `AGENTS.md` so future agents follow the same process.

---

## Phase 4: Validation

**Purpose**: Ensure the fix works and does not break existing behavior.

- [x] T009 Run `pnpm --filter @componode/backend lint` and fix any issues.
- [x] T010 Run `pnpm --filter @componode/backend test:unit` and verify the not-found regression tests pass.
- [ ] T011 Run `pnpm --filter @componode/backend test:integration` and verify the CSRF regression test passes.
- [x] T012 Run `pnpm build` and verify the backend and frontend compile.

---

## Phase 5: Branch & Merge Prep

**Purpose**: Prepare the fix for review.

- [ ] T013 Commit the changes to branch `bugfix/009-spa-csrf`.
- [ ] T014 Push `bugfix/009-spa-csrf` to `origin`.
- [ ] T015 (Optional) Open a PR; the old `fix/spa-csrf-initial-load` branch can be deleted.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** → **Phase 2** → **Phase 3** → **Phase 4** → **Phase 5**.
- Phase 2 cannot start until Phase 1 tests fail and reproduce the bug.
- Phase 3 documentation can proceed in parallel with Phase 4 validation once Phase 2 is complete.

### Notes

- [P] tasks = different files, no dependencies.
- Commit after each phase or logical group.
- `T011` requires a Docker environment where testcontainers can start a Postgres container. It cannot run inside the production `app` container but is validated in CI.
