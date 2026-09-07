# Tasks: Product hierarchy — products, edges, ownership, tree UI

**Input**: Design documents from `/specs/005-product-hierarchy/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓,
contracts/api.md ✓, quickstart.md ✓

**Tests**: INCLUDED — constitution VI makes test-first non-negotiable. Test
tasks are written first, confirmed failing, then implemented.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US1]** etc.: story labels for traceability
- Exact file paths in all descriptions

## Path Conventions

- Backend: `packages/backend/src/` (services, routes); integration tests in
  `packages/backend/test/integration/`
- Frontend: `packages/frontend/src/`; unit tests in
  `packages/frontend/src/test/unit/`
- Shared Zod schemas: `packages/core/src/schemas/`

---

## Phase 1: Setup

**Purpose**: shared contracts everything else builds on

- [X] T001 [P] Create product Zod schemas in `packages/core/src/schemas/product.ts` — `createProductSchema` (name, optional slug auto-derivable, `type` enum, description?, lobOwnerId?, teamOwnerId?), `updateProductSchema` (partial, strict), `listProductsQuerySchema` (`q?`, `type?`, `lifecycle?`, `includeRetired?` coerced boolean), edge bodies (`addEdgeSchema` with `childId`/`platformId`/`componentId` uuid) — all `.strict()` per ADR-095 — and register the new error codes `CYCLE_DETECTED`, `INVALID_EDGE_TYPE`, `REFERENCED`, `TYPE_CHANGE_BLOCKED`, `SLUG_TAKEN` in the controlled error-code enum in `packages/core` (ADR-071)
- [X] T002 [P] Create org Zod schemas in `packages/core/src/schemas/org.ts` — `createOrgEntitySchema`/`updateOrgEntitySchema` (name, slug?, description?) strict
- [X] T003 Export the new schemas from `packages/core/src/index.ts`
- [X] T004 Add permission keys to `PERMISSIONS` in `packages/backend/src/plugins/rbac.ts` — `product:create|update|delete`, `product:edge:add|remove`, `lob:create|update|delete`, `team:create|update|delete` all mapped to `EDITOR`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: services and plumbing every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `audit-service.ts` in `packages/backend/src/services/` — `writeEntityChange(entityType, entityId, action, changes, actor)` and `writeEdgeChange(edgeType, from, to, action, actor)` inserting into `entity_changes`/`edge_changes` inside the caller's transaction
- [X] T006 Create `product-service.ts` skeleton in `packages/backend/src/services/` — `getProductBySlugOrId`, `listProducts` (joins `lobs`/`teams` for owner names, excludes RETIRED by default), shared row→DTO mapping
- [X] T007 Create `org-service.ts` skeleton in `packages/backend/src/services/` — `listLobs`/`listTeams` (name asc), `getTeamMembers(teamId)` via `persons.teamId`
- [X] T008 Create `packages/frontend/src/api/hooks/products.ts` — `useProducts(query)`, `useProduct(slug)`, mutation hooks stubbed (`useCreateProduct` etc. filled in US3)
- [X] T009 Create `packages/frontend/src/api/hooks/org.ts` — `useLobs`, `useTeams`, `useTeamMembers(id)`

**Checkpoint**: Foundation ready — services + hooks exist; stories can start

---

## Phase 3: User Story 1 — Browse the product tree (Priority: P1) 🎯 MVP

**Goal**: `/products` renders the expandable COMPOSES tree — positional roots,
shared-node indicator, search/filter flattening, retired toggle.

**Independent Test**: Seed a BC composing two platforms; verify tree expand/
collapse, filter flattening, and the retired toggle — no editing needed.

### Tests for User Story 1 ⚠️ (write first, confirm FAIL)

- [X] T010 [P] [US1] Integration test: `GET /api/v1/products` returns products + `edges`, excludes RETIRED by default, honors `includeRetired`/`q`/`type` filters, 401 unauthenticated, strict schema rejects unknown params in `packages/backend/test/integration/products.test.ts`
- [X] T011 [P] [US1] Component test: tree renders roots/children, expand/collapse, "shared" marker on multi-parent nodes, flatten-on-filter, retired toggle, and a RETIRED parent hides its subtree (children visible only via another parent) in `packages/frontend/src/test/unit/product-tree.test.tsx`
- [X] T011b [P] [US1] Perf test: tree renders + expands a 1,000-product graph in <2s / <300ms expand (SC-001) in `packages/frontend/src/test/perf/product-tree.perf.test.tsx`
- [X] T012 [P] [US1] Component test: products page state matrix (skeleton → tree → empty "Create your first product" → error+retry) in `packages/frontend/src/test/unit/products-page.test.tsx`

### Implementation for User Story 1

- [X] T013 [US1] Implement `GET /api/v1/products` in `packages/backend/src/routes/products.ts` + `listProducts`/`listComposesEdges` in `product-service.ts` — flat payload `{ products, edges }` per contracts/api.md (depends on T005–T006)
- [X] T014 [P] [US1] Create `packages/frontend/src/components/products/product-tree.tsx` — indented expandable rows (children sorted by name ascending), type + lifecycle `StatusBadge`s, shared-node indicator, expand-all/collapse-all, in-memory expansion state
- [X] T015 [US1] Rewrite `packages/frontend/src/pages/products.tsx` — tree-first layout, URL-persisted `q`/`type`/`includeRetired` filter state (`useSearchParams`), state-matrix wiring, empty state with "Create your first product" (editor only)
- [X] T016 [US1] Update `packages/frontend/src/routes.tsx` — `/products` renders the rewritten page (keep `/products` stub removal); sidebar unchanged

**Checkpoint**: US1 independently testable — tree browses the whole DAG

---

## Phase 4: User Story 2 — Product detail page (Priority: P2)

**Goal**: `/products/:slug` detail with header + Overview / Composition /
Components / Instances tabs; Declared vs Inherited dependency sections.

**Independent Test**: Open a product with parents, children, a CONSUMES_FROM
edge, and a component dependency — every tab renders the contract shape.

### Tests for User Story 2 ⚠️ (write first, confirm FAIL)

- [X] T017 [P] [US2] Integration test: `GET /api/v1/products/:slug` returns composition + declared/inherited components and instances with `via` provenance, 404 unknown slug, viewer-readable in `packages/backend/test/integration/products.test.ts`
- [X] T018 [P] [US2] Component test: detail page renders header + 4 tabs, Composition's three labeled sections, Declared/Inherited split on Components and Instances in `packages/frontend/src/test/unit/product-detail.test.tsx`

### Implementation for User Story 2

- [X] T019 [US2] Implement `GET /api/v1/products/:slug` — detail service in `product-service.ts`: composition edges (composedBy/composes/consumesFrom/consumedBy), `withRecursive` CTE over `product_composes` for Inherited components + instances (with `via` product), counts (depends on T006)
- [X] T020 [P] [US2] Create `packages/frontend/src/pages/product-detail.tsx` — standard detail anatomy (name, type badge, slug `font-mono`, lifecycle, owners, actions slot), 4 tabs per docs/ux.md §4–5, `useSetCrumbLabel(product.slug)` for breadcrumbs, full state matrix
- [X] T021 [US2] Add `/products/:slug` route in `routes.tsx`; tree rows + search `href`s navigate there (verify `search-service` product hrefs point at `/products/:slug`)

**Checkpoint**: US2 independently testable — detail answers "what is this product made of"

---

## Phase 5: User Story 3 — Create and edit products and edges (Priority: P2)

**Goal**: editor-facing CRUD + edge management with type-rule, cycle, and
delete guards; append-only audit on every write.

**Independent Test**: create a product, wire a COMPOSES edge, attempt a cycle
(409), attempt an illegal parent type (422), retire + un-retire, delete an
edge-free product.

### Tests for User Story 3 ⚠️ (write first, confirm FAIL)

- [X] T022 [P] [US3] Integration test: product POST/PATCH/DELETE — 403 viewer, `SLUG_TAKEN` conflict, delete `409 REFERENCED` while edged / `204` edge-free, type change `409 TYPE_CHANGE_BLOCKED`, audit rows written in `packages/backend/test/integration/products.test.ts`
- [X] T023 [P] [US3] Integration test: edge endpoints — COMPOSES cycle → `409 CYCLE_DETECTED`, PLATFORM parent → `422 INVALID_EDGE_TYPE`, non-PLATFORM `CONSUMES_FROM` target → `422`, DEPENDS_ON_COMPONENT add/remove, `edge_changes` rows written in `packages/backend/test/integration/products.test.ts`
- [X] T024 [P] [US3] Component test: create/edit dialog validation, edge-picker type filtering, 409 cycle error surfaces in dialog, destructive confirm on delete in `packages/frontend/src/test/unit/product-forms.test.tsx`

### Implementation for User Story 3

- [X] T025 [US3] Implement `product-edge-service.ts` — `validateEdge` (ADR-018 type rules → `422 INVALID_EDGE_TYPE`), write-time reachability DFS for cycle detection (→ `409 CYCLE_DETECTED` with `details.path`), add/remove for all three edge tables, `edge_changes` audit in-transaction (uses T005)
- [X] T026 [US3] Implement product mutations in `product-service.ts` + routes — `POST /products` (slug auto-derive, `409 SLUG_TAKEN`), `PATCH /products/:id` (type-change guard via existing-edge validation), `DELETE /products/:id` (edge-free check → `409 REFERENCED` with `details.counts`), retire/un-retire via `lifecycle` PATCH, `entity_changes` audit (uses T005)
- [X] T027 [P] [US3] Create `packages/frontend/src/components/products/edge-picker.tsx` — dialog picker filtered to legal types (COMPOSES parent→BC/CF sources, CONSUMES_FROM→PLATFORM targets, DEPENDS_ON→components list), surfaces `409`/`422` messages inline
- [X] T028 [P] [US3] Create `packages/frontend/src/components/products/owner-picker.tsx` — shared LOB/team select used by product create/edit (and reused by group/component forms per clarify Q2)
- [X] T029 [US3] Wire mutations into UI — create/edit dialog + retire + delete (confirm dialog, blocked message with reference counts) on `products.tsx`/`product-detail.tsx`; add/remove affordances on Composition + Components tabs; optional tree context-menu "Compose into…" entry point
- [X] T030 [US3] Wire the team-owner picker into existing component and component-group edit forms in `packages/frontend/src/pages/components.tsx` / `component-groups.tsx` (uses T028)

**Checkpoint**: US3 independently testable — full curation loop with guards

---

## Phase 6: User Story 4 — Organization entities and ownership (Priority: P3)

**Goal**: LOB/Team CRUD under a new Catalog → "Organization" sidebar group;
team roster; delete-blocked-while-referenced; owner pickers fed by real data;
search indexes lobs/teams.

**Independent Test**: create a LOB + team, assign both as product owners,
attempt deleting the referenced team (409), search "revenue" in the palette.

### Tests for User Story 4 ⚠️ (write first, confirm FAIL)

- [X] T031 [P] [US4] Integration test: `/lobs` + `/teams` CRUD — editor+ only (403 viewer), `409 REFERENCED` on delete while owning/membered with `details.counts`, `GET /teams/:id/members` roster in `packages/backend/test/integration/org.test.ts`
- [X] T032 [P] [US4] Extend search integration test — `q=` matches lobs/teams names+slugs, `href` `/lobs`/`/teams`, persons NOT returned in `packages/backend/test/integration/search.test.ts`
- [X] T033 [P] [US4] Component test: lobs/teams pages CRUD + state matrix, team roster renders, delete-confirm shows reference counts, sidebar shows Organization group in `packages/frontend/src/test/unit/org-pages.test.tsx`

### Implementation for User Story 4

- [X] T034 [US4] Implement `org-service.ts` + `packages/backend/src/routes/org.ts` — `GET/POST /lobs`, `PATCH/DELETE /lobs/:id`, same for `/teams`, `GET /teams/:id/members`; delete guards count owner references across `digital_products`/`component_groups`/`components` + `persons.teamId` members (uses T005, T007)
- [X] T035 [P] [US4] Create `packages/frontend/src/pages/lobs.tsx` — list + create/edit dialog + delete with reference-count message, state matrix
- [X] T036 [P] [US4] Create `packages/frontend/src/pages/teams.tsx` — same CRUD plus expandable/read-only member roster
- [X] T037 [US4] Update `sidebar.tsx` ("Organization" group under Catalog: Lines of Business, Teams — editor-visible create affordances) and `routes.tsx` (`/lobs`, `/teams`)
- [X] T038 [US4] Extend `search-service.ts` — index `line_of_businesses` + `teams` (name/slug prefix, per-group limit); extend `contracts`-shaped response + palette groups in `command-palette.tsx`

**Checkpoint**: US4 independently testable — ownership is real end to end

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: whole-feature validation

- [X] T039 [P] Update `docs/ux.md` §3 route map — `/products/:slug`, `/lobs`, `/teams` under the Organization group; §5 product detail tabs confirmed Declared/Inherited
- [X] T040 Register all new routes in `packages/backend/src/app.ts`; confirm 401 unauthenticated on every new route
- [ ] T041 Run full `quickstart.md` validation — all 5 scenarios + regression gate (lint/typecheck/test/build green, keyboard walkthrough of tree + pickers)
- [ ] T042 WCAG 2.1 AA sweep on new surfaces: tree keyboard expand/collapse, dialog focus management, focus-visible rings, `aria-expanded`/`aria-current`, screen-reader pass (SC-005)
- [X] T043 `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build` all green
- [X] T044 Confirm no `sql.raw()`/`sql.fragment()`, no `dangerouslySetInnerHTML`, `safeUrl()` on all new hrefs, no secrets in logs (ADR-084/085/090)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no deps — start immediately
- **Foundational (Phase 2)**: depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: depends on Phase 2 — tree needs list+edges endpoint
- **US2 (Phase 4)**: depends on Phase 2; independent of US1 (detail endpoint separate) but shares `product-service.ts` — coordinate file access
- **US3 (Phase 5)**: depends on Phase 2; touches `products.tsx`/`product-detail.tsx` → run after US1/US2 file owners or sequence carefully
- **US4 (Phase 6)**: depends on Phase 2 only — fully parallelizable with US1–US3 except `sidebar.tsx`/`routes.tsx` (shared with US1/US2)
- **Polish (Phase 7)**: after all stories

### Parallel Opportunities

- T001/T002, T005–T009, all test tasks within a story
- US4 is the most parallelizable story (distinct files)

## Implementation Strategy

### MVP First (US1 only)

Phase 1 → Phase 2 → Phase 3 → validate tree independently → commit.

### Incremental Delivery

US1 (tree) → US2 (detail) → US3 (curation) → US4 (org) → polish.

---

## Notes

- Tests first per constitution VI — confirm each test task FAILS before implementing
- All junction tables + audit tables exist — **no DB migration anywhere in this feature**
- Depends on the 004 shell being merged (sidebar, palette, state matrix, crumb context)
- New error codes `CYCLE_DETECTED`, `INVALID_EDGE_TYPE`, `REFERENCED`, `TYPE_CHANGE_BLOCKED`, `SLUG_TAKEN` must be added to the controlled error-code enum in `packages/core` (ADR-071)
- Commit after each task or logical group

## Phase 8: Convergence

- [X] T045 [US2] Group the Instances tab rows by `environment` (environment subheadings + status badges) per US2/AC4 � currently a flat table in `packages/frontend/src/pages/product-detail.tsx` (partial)
- [X] T046 [US3] Add a confirmation step before product delete in `packages/frontend/src/pages/product-detail.tsx` per the destructive-action pattern in docs/ux.md �8 (partial)
- [ ] T047 Execute `specs/005-product-hierarchy/quickstart.md` end-to-end against a running `docker compose` stack � all 5 scenarios per T041 (missing)
- [ ] T048 Perform the WCAG 2.1 AA sweep on new surfaces � tree keyboard expand/collapse, dialog focus management, focus-visible rings, `aria-expanded`, screen-reader pass per T042 / SC-005 (missing)
