---

description: "Task list for 004-ux-shell"
---

# Tasks: UX shell — navigation, theming, states, dashboard, global search

**Input**: Design documents from `/specs/004-ux-shell/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — constitution VI makes test-first non-negotiable. Test
tasks are written first, confirmed failing, then implemented.

**Organization**: Tasks are grouped by user story (US1 shell, US2 state
matrix, US3 theming, US4 dashboard, US5 palette) so each is independently
testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to spec.md user story (US1–US5)
- Paths are relative to repo root `D:\Repositories\componode`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and primitives everything else builds on

- [X] T001 Add `cmdk` dependency to `packages/frontend/package.json` and run `pnpm install`
- [X] T002 [P] Add shadcn `Skeleton` primitive in `packages/frontend/src/components/ui/skeleton.tsx`
- [X] T003 [P] Add shadcn `Command` primitives (cmdk wrapper) in `packages/frontend/src/components/ui/command.tsx` (depends on T001)
- [X] T004 [P] Add shadcn `DropdownMenu` primitive for the user menu in `packages/frontend/src/components/ui/dropdown-menu.tsx`
- [X] T005 [P] Add shadcn `Breadcrumb` primitives in `packages/frontend/src/components/ui/breadcrumb.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme tokens, theme plumbing, and shared state primitives that
every user-story page consumes

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Extend `packages/frontend/src/index.css` with the full design-token set: accent `--primary` hue, `@custom-variant dark`, and complete dark-mode token block (contrast-verified 4.5:1 per SC-003) per `docs/ux.md` §8
- [X] T007 Create `packages/frontend/src/components/theme-provider.tsx` wrapping `next-themes` (`attribute="class"`, `defaultTheme="system"`, localStorage persistence) and add the no-flash inline boot script to `packages/frontend/index.html`
- [X] T008 [P] Create shared state primitives in `packages/frontend/src/components/states/`: `skeletons.tsx` (page/table/card skeletons), `empty-state.tsx` (icon + message + primary action), `error-state.tsx` (inline error + retry), `forbidden.tsx` (distinct 403)
- [X] T009 [P] Create `packages/frontend/src/components/states/status-badge.tsx` implementing the fixed enum→badge color map from `docs/ux.md` §6
- [X] T010 [P] Create `packages/frontend/src/lib/format.ts` with relative-time formatting (absolute on hover) and slug `font-mono` helper
- [X] T011 Wire the global TanStack Query `onError` defaults (401→login redirect, 403→toast, 429→retry toast, 500→generic toast) in `packages/frontend/src/app.tsx` per ADR-072

**Checkpoint**: Foundation ready — tokens, theming, and state primitives exist; user stories can start

---

## Phase 3: User Story 1 — Sidebar shell (Priority: P1) 🎯 MVP

**Goal**: Replace the flat top-nav with a persistent grouped sidebar +
breadcrumb top bar on all authenticated pages

**Independent Test**: Log in → grouped sidebar visible (Administration hidden
for non-admins) → open a detail page → slug breadcrumbs link back → collapse
persists across reload

### Tests for User Story 1 ⚠️ (write first, confirm FAIL)

- [X] T012 [P] [US1] Component test: sidebar renders grouped sections and hides Administration for non-admin in `packages/frontend/src/test/unit/sidebar.test.tsx`
- [X] T013 [P] [US1] Component test: breadcrumbs render `Section / <slug>` and link to section root in `packages/frontend/src/test/unit/breadcrumbs.test.tsx`
- [X] T014 [P] [US1] Component test: sidebar collapse toggle persists state in sessionStorage in `packages/frontend/src/test/unit/sidebar.test.tsx`

### Implementation for User Story 1

- [X] T015 [P] [US1] Create `packages/frontend/src/components/layout/sidebar.tsx` — grouped nav per `docs/ux.md` §3 (sidebar label "Component Groups" for the `/component-groups` route), active-route highlight, collapsible-to-icons (sessionStorage), admin gating on `user.role === "ADMIN"`
- [X] T016 [P] [US1] Create `packages/frontend/src/components/layout/top-bar.tsx` — breadcrumbs slot, user identity, theme toggle placeholder, sign-out
- [X] T017 [P] [US1] Create `packages/frontend/src/components/layout/breadcrumbs.tsx` — static segment→label map + route params (slug) per route map in `docs/ux.md` §3
- [X] T018 [US1] Create `packages/frontend/src/components/layout/app-shell.tsx` — sidebar + top bar + `<Outlet/>` (depends on T015–T017)
- [X] T019 [US1] Restructure `packages/frontend/src/routes.tsx` — auth pages (`/login`, `/register`, `/auth/oidc/callback`) outside the shell; all authenticated routes inside an `AuthGuard`-wrapped `AppShell` layout route
- [X] T020 [US1] Update `packages/frontend/src/components/layout/auth-guard.tsx` — replace full-screen "Loading..." with a shell-shaped skeleton (uses T008); keep role gate and redirect behavior
- [X] T021 [US1] Remove `packages/frontend/src/components/layout/nav.tsx` and strip the duplicated header/sign-out markup from `packages/frontend/src/pages/dashboard.tsx` (dashboard content itself is rewritten in US4 — leave a placeholder section)

**Checkpoint**: US1 independently testable — shell wraps every authed page, breadcrumbs + collapse + admin gating verified

---

## Phase 4: User Story 2 — State matrix retrofit (Priority: P1)

**Goal**: Every existing page implements the `docs/ux.md` §6 state matrix and
formatting rules (per clarification: all pages, not just new ones)

**Independent Test**: Each page under slow-network / empty-data / failed-request
shows skeleton, empty-state block, or inline error+retry; 403/404 distinct

### Tests for User Story 2 ⚠️ (write first, confirm FAIL)

- [X] T022 [P] [US2] Component test: `EmptyState`, `ErrorState`, `Forbidden` render correct markup and retry fires in `packages/frontend/src/test/unit/states.test.tsx`
- [X] T023 [P] [US2] Component test: `StatusBadge` color map covers all enums in `packages/frontend/src/test/unit/status-badge.test.tsx`
- [X] T024 [P] [US2] Component test: catalog page renders skeleton→table→empty→error transitions in `packages/frontend/src/test/unit/components-page-states.test.tsx`

### Implementation for User Story 2

- [X] T025 [P] [US2] Retrofit list pages to the state matrix: `packages/frontend/src/pages/components.tsx`, `component-groups.tsx`, `importers.tsx`, `users.tsx`, `sessions.tsx` — skeletons, empty-state with primary action, error+retry, enum badges, relative timestamps
- [X] T026 [P] [US2] Retrofit detail pages: `packages/frontend/src/pages/component-detail.tsx`, `importer-run.tsx` — section-level error boundaries, skeletons, badges
- [X] T027 [P] [US2] Retrofit remaining pages: `packages/frontend/src/pages/settings.tsx`, `products.tsx`, `login.tsx`, `register.tsx` — loading/empty/error conventions per `docs/ux.md` §6
- [X] T028 [US2] Ensure 403 vs 404 distinction: `AuthGuard` role-denial renders `Forbidden`; unknown routes render `not-found.tsx` with link to section root
- [X] T029 [US2] Move list-page filter state to URL query params where missing (`useSearchParams`) per FR-015

**Checkpoint**: US2 independently testable — state matrix holds on every page

---

## Phase 5: User Story 3 — Theming (Priority: P2)

**Goal**: Dark mode with system default + persisted toggle, accent color,
compact density — verified in both themes

**Independent Test**: Toggle theme in user menu → instant switch, persists
across reload, no flash before paint; contrast passes in both themes

### Tests for User Story 3 ⚠️ (write first, confirm FAIL)

- [X] T030 [P] [US3] Component test: theme toggle switches `light`/`dark`/`system` and persists to localStorage in `packages/frontend/src/test/unit/theme-toggle.test.tsx`
- [X] T031 [P] [US3] Test: no-flash boot script applies stored/system class before paint in `packages/frontend/src/test/unit/theme-boot.test.tsx`

### Implementation for User Story 3

- [X] T032 [US3] Mount `ThemeProvider` in `packages/frontend/src/app.tsx` (or `main.tsx`) around the router
- [X] T033 [US3] Add the theme toggle (Sun/Moon/Monitor) to the user menu in `top-bar.tsx` (uses T004, T016)
- [X] T034 [P] [US3] Sweep all pages/components for hardcoded colors → replace with tokens; apply compact density (`text-sm` tables, reduced row padding) per `docs/ux.md` §8. Done-when: `rg "bg-white|text-black|hsl\\(" packages/frontend/src` returns zero matches outside `index.css`
- [X] T035 [US3] Verify WCAG 2.1 AA contrast (4.5:1 normal text) on both themes — adjust accent/destructive tokens until passing (SC-003)

**Checkpoint**: US3 independently testable — both themes pass, toggle persists

---

## Phase 6: User Story 4 — Health-and-attention dashboard (Priority: P2)

**Goal**: `/` shows attention-needed, stat cards, and per-importer last-run
status; empty install shows getting-started strip

**Independent Test**: With a failed run + `ERROR` instance present, dashboard
lists them first; verify `GET /api/v1/dashboard/summary` against `contracts/api.md`

### Tests for User Story 4 ⚠️ (write first, confirm FAIL)

- [X] T036 [P] [US4] Backend integration test: `GET /api/v1/dashboard/summary` returns counts/attention/lastRuns matching contract, excludes RETIRED/GONE from totals, 401 unauthenticated, and viewer role receives the same read-only shape with no admin-only data in `packages/backend/test/integration/dashboard.test.ts`
- [X] T037 [P] [US4] Component test: dashboard renders attention → stats → runs in order, hides attention when empty, getting-started on empty install in `packages/frontend/src/test/unit/dashboard.test.tsx`

### Implementation for User Story 4

- [X] T038 [US4] Implement `dashboard-service.ts` in `packages/backend/src/services/` — Kysely aggregate queries: product/component/instance counts (RETIRED/GONE excluded from totals per constitution IV), `lastImportAt`, failed runs, `ERROR`/`GONE` instances, latest run per config (uses existing `import_runs` counters — no migration)
- [X] T039 [US4] Implement `GET /api/v1/dashboard/summary` in `packages/backend/src/routes/dashboard.ts` — authenticated, side-effect-free GET, `{code,message,details?}` errors
- [X] T040 [P] [US4] Create `packages/frontend/src/api/hooks/dashboard.ts` — `useDashboardSummary` TanStack Query hook
- [X] T041 [US4] Rewrite `packages/frontend/src/pages/dashboard.tsx` — attention section (hidden when empty), stat cards, importer-status list, empty-install getting-started strip; wired through state primitives (T008)

**Checkpoint**: US4 independently testable — dashboard answers "is everything okay" in <10s

---

## Phase 7: User Story 5 — Command palette (Priority: P3)

**Goal**: `Ctrl+K`/`Cmd+K` palette jumps to any component/product/group/
importer by name or slug

**Independent Test**: `Ctrl+K` → type fragment → grouped results → `Enter`
navigates to detail; `Esc` closes; empty query shows empty state

### Tests for User Story 5 ⚠️ (write first, confirm FAIL)

- [X] T042 [P] [US5] Backend integration test: `GET /api/v1/search` groups results by kind, enforces `q` validation (400), excludes RETIRED, viewer role receives the same read-only shape, 401 unauthenticated in `packages/backend/test/integration/search.test.ts`
- [X] T043 [P] [US5] Component test: palette opens on `Ctrl+K`, renders grouped results, keyboard navigates + selects, `Esc` closes; assert palette open latency <200ms (SC-005 — server <1s result timing is verified manually via quickstart Scenario 5) in `packages/frontend/src/test/unit/command-palette.test.tsx`

### Implementation for User Story 5

- [X] T044 [US5] Implement `search-service.ts` in `packages/backend/src/services/` — case-insensitive `ILIKE` prefix on `name`/`slug` across `components`, `digital_products`, `component_groups`, `importer_configs`; per-group `limit` (default 8, max 20); RETIRED excluded; server-built `href`s
- [X] T045 [US5] Implement `GET /api/v1/search` in `packages/backend/src/routes/search.ts` with Zod schema in `packages/core/src/schemas/search.ts` — authenticated, rejects unknown params per ADR-095
- [X] T046 [P] [US5] Create `packages/frontend/src/api/hooks/search.ts` — debounced `useQuery` hook for global search
- [X] T047 [US5] Create `packages/frontend/src/components/command-palette.tsx` — cmdk `Command` in a `Dialog`, grouped results + nav actions, `Ctrl+K`/`Cmd+K` listener in `app-shell.tsx`, `safeUrl()` on navigation (ADR-085)
- [X] T048 [US5] Register the palette trigger in `top-bar.tsx` (search input affordance showing `Ctrl+K` hint)

**Checkpoint**: US5 independently testable — palette opens <200ms, results <1s

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature validation

- [X] T049 [P] Update `docs/ux.md` if any implemented detail diverged (route names, token names) — doc stays normative per ADR-103
- [X] T050 Run full `quickstart.md` validation — all 5 scenarios + regression gate (all test suites green, keyboard-only walkthrough)
- [X] T051 WCAG 2.1 AA sweep: keyboard reachability, focus-visible rings, aria-current on active nav, screen-reader pass on shell/palette/dashboard (SC-006)
- [X] T052 `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build` all green
- [X] T053 Confirm no `sql.raw()`/`sql.fragment()` in new backend code, no `dangerouslySetInnerHTML`, no secrets in logs (ADR-084/085/090)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (T003 needs T001) — **BLOCKS all user stories**
- **US1 Shell (Phase 3)**: Needs Foundational (skeletons for AuthGuard)
- **US2 States (Phase 4)**: Needs Foundational + US1 (pages render inside shell)
- **US3 Theming (Phase 5)**: Needs Foundational (tokens/provider) + US1 (toggle lives in top bar)
- **US4 Dashboard (Phase 6)**: Needs Foundational + US1 (page inside shell) + US2 primitives
- **US5 Palette (Phase 7)**: Needs US1 (shell hosts the listener) — otherwise independent
- **Polish (Phase 8)**: After all desired stories

### Parallel Opportunities

- T002–T005 (primitives), T008–T010 (states/format/badge), T036+T037, T042+T043, T012–T014, T022–T024, T030+T031 are all `[P]`
- US4 backend (T038–T039) ∥ US4 frontend (T040–T041); US5 backend (T044–T045) ∥ US5 frontend (T046–T047)
- US3 and US4 can run in parallel after US1; US5 any time after US1

---

## Parallel Example

```bash
# Foundational primitives together:
T008 states/, T009 status-badge, T010 format.ts

# US4 backend and frontend in parallel:
T038 dashboard-service + T039 route   ‖   T040 hook + T041 page
```

---

## Implementation Strategy

### MVP First (US1 + US2 — the P1 stories)

1. Phase 1 + Phase 2 → foundation ready
2. Phase 3 (US1 shell) → validate independently → demo-able
3. Phase 4 (US2 states) → the two P1 stories are the core UX contract

### Incremental Delivery

US1 → US2 → US3 → US4 → US5, each independently testable; deployable after any story.

---

## Notes

- [P] = different files, no dependencies
- Tests first per constitution VI — confirm each test task FAILS before implementing
- `import_runs` counters verified present — **no DB migration anywhere in this feature**
- Commit after each task or logical group

---

## Phase 9: Convergence

Appended by `/speckit-converge` — gaps found between artifacts and current code.

- [X] T054 Render the entity slug (or name) instead of the raw UUID as the final breadcrumb on detail pages per US1/AC2, FR-003 (partial)
- [X] T055 Point the not-found page at the originating section root where derivable and remove `min-h-screen` inside the shell per US2/AC5 (partial)
- [X] T056 Verify `GET /api/v1/search` returns grouped results in <1s on a ~1,000-component catalog (seeded test or executed quickstart Scenario 5) per SC-005 (partial)
- [ ] T057 Execute the full `quickstart.md` scenarios and WCAG 2.1 AA keyboard/screen-reader pass on shell, palette, and dashboard (or reopen T050/T051) per SC-002/SC-006 (partial)
