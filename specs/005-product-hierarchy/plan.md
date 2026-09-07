# Implementation Plan: Product hierarchy — products, edges, ownership, tree UI

**Branch**: `005-product-hierarchy` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-product-hierarchy/spec.md`

## Summary

Implement the Composable Product Model on top of the spec-004 shell: product
CRUD + the three typed edge sets (COMPOSES DAG, CONSUMES_FROM→PLATFORM,
DEPENDS_ON_COMPONENT) with write-time cycle and type-rule enforcement;
the tree-first `/products` page and tabbed product detail (slug-routed) with
Declared/Inherited dependency sections; and minimal LOB/Team management under
a new "Organization" sidebar group so owner pickers have real data. All
mutations append `entity_changes`/`edge_changes` audit records.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js backend, React 18 frontend

**Primary Dependencies**: Fastify + Kysely (backend); React 18, TanStack Query 5,
React Router 7, Tailwind 4, shadcn/Radix (frontend); `lucide-react`, `sonner`.
**No new dependencies.**

**Storage**: PostgreSQL — **no migrations**. All tables exist:
`digital_products`, `product_composes`, `product_consumes_from`,
`product_depends_on_component`, `line_of_businesses`, `teams`, `persons`,
`entity_changes`, `edge_changes`.

**Testing**: Vitest + Testing Library + jsdom (frontend); Vitest +
testcontainers Postgres (backend integration). Test-first per constitution VI.

**Target Platform**: Docker Compose single container. Desktop-first (≥1280px).

**Project Type**: Web application (pnpm monorepo: core / backend / frontend).

**Performance Goals**: Tree renders + expands a 1k-product graph in <2s;
expand <300ms (SC-001); search stays <1s with the two new indexed tables.

**Constraints**: `/api/v1/` prefix, `verifySession` + `requireRole` RBAC
(ADR-054/097), strict Zod at route boundaries rejecting unknown fields
(ADR-095), `{code, message, details?}` errors (ADR-071/096), side-effect-free
GETs (ADR-094), no `sql.raw()` (ADR-084), `safeUrl()` on hrefs (ADR-085),
409 `CYCLE` on COMPOSES cycles (ADR-049/050), type rules per ADR-018,
typed junctions only (ADR-048), products never importer-written
(constitution V), audit append-only (ADR-048/audit tables).

**Scale/Scope**: ~10 new backend endpoints, 4 new/rewritten frontend pages,
~6 new components, 2 schema files in `packages/core`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict | Notes |
|---|---|---|
| I. Single-organization | ✅ Pass | Org entities are org-global, no tenancy |
| II. Importer-first | ✅ Pass | No importer contract changes |
| III. Two-level taxonomy | ✅ Pass | Products compose products; components untouched |
| IV. Environment-as-instance | ✅ Pass | Instances tab reads existing `component_instances` |
| V. Factual vs meaning layer | ✅ Pass | Products/edges are editor-curated only; importers never write them |
| VI. Test-first | ✅ Pass | Failing tests precede implementation in tasks.md |
| VII. Observability | ✅ Pass | New routes go through existing logging/metrics/tracing |

**Gate result: PASS — no violations, no complexity justification needed.**

## Project Structure

### Documentation (this feature)

```text
specs/005-product-hierarchy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output: endpoint contracts
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/core/src/schemas/
├── product.ts            # NEW: product + edge Zod schemas (strict)
└── org.ts                # NEW: LOB/Team Zod schemas (strict)

packages/backend/src/
├── plugins/rbac.ts       # MODIFIED: product/org permission keys (EDITOR)
├── services/
│   ├── product-service.ts        # NEW: CRUD, retire, tree query, detail
│   ├── product-edge-service.ts   # NEW: edge add/remove, cycle + type checks, audit
│   ├── org-service.ts            # NEW: LOB/Team CRUD, roster, delete-guard
│   ├── audit-service.ts          # NEW: entity_changes/edge_changes writers
│   └── search-service.ts         # MODIFIED: index lobs + teams
├── routes/
│   ├── products.ts               # NEW: /api/v1/products + edge routes
│   └── org.ts                    # NEW: /api/v1/lobs, /api/v1/teams
└── app.ts                        # MODIFIED: register new routes

packages/frontend/src/
├── api/hooks/
│   ├── products.ts               # NEW: list/tree/detail/edge mutations
│   └── org.ts                    # NEW: lobs/teams hooks
├── components/
│   ├── products/
│   │   ├── product-tree.tsx      # NEW: expandable indented DAG tree
│   │   ├── edge-picker.tsx       # NEW: product/component picker dialog
│   │   └── owner-picker.tsx      # NEW: shared LOB/team select
│   └── layout/sidebar.tsx        # MODIFIED: "Organization" group
├── pages/
│   ├── products.tsx              # REWRITTEN: tree-first catalog
│   ├── product-detail.tsx        # NEW: header + 4 tabs
│   ├── lobs.tsx                  # NEW: LOB CRUD list
│   └── teams.tsx                 # NEW: Team CRUD list + roster
└── routes.tsx                    # MODIFIED: /products/:slug, org routes
```

**Structure Decision**: Web-application layout; thin route+service pairs per
ADR-048's typed-junction model; org pages reuse the spec-004 state matrix and
list-page conventions verbatim.

## Phase 0 — Research summary (see research.md)

All decisions resolved without open unknowns:

- **Tree data**: one flat query (products + COMPOSES edges); tree built
  client-side — bounded by SC-001's 1k budget, and expansion state is
  in-memory so no lazy fetch needed.
- **Cycle detection**: service-layer DFS over `product_composes` before
  insert per ADR-050 → `409 CYCLE` (`CYCLE_DETECTED` code).
- **Type-rule enforcement**: pre-insert edge validation → `422
  INVALID_EDGE_TYPE` naming the rule; same check guards product `type`
  updates → `409 TYPE_CHANGE_BLOCKED` listing offending edges.
- **Delete guards**: edge-free check for products; referenced-check for
  LOB/Team (ownership + membership) → `409 REFERENCED` with counts.
- **Inherited dependencies**: bounded recursive read (Kysely
  `withRecursive` CTE over `product_composes`) for the Inherited sections —
  mirrors ADR-051's merged-CTE direction.
- **Audit**: `entity_changes`/`edge_changes` rows written in the same
  transaction as each mutation.

## Phase 1 — Design summary (see data-model.md, contracts/, quickstart.md)

- **data-model.md**: entities, edge tables, validation rules, audit writes.
- **contracts/api.md**: `products` CRUD + edge endpoints, `lobs`/`teams`
  endpoints, error codes (`CYCLE_DETECTED`, `INVALID_EDGE_TYPE`,
  `REFERENCED`, `TYPE_CHANGE_BLOCKED`).
- **quickstart.md**: runnable scenarios per user story.

## Constitution Check (post-design re-evaluation)

Re-evaluated after Phase 1: all seven principles still **PASS**. GETs are
side-effect-free; mutations are role-gated, Zod-validated, and audited;
no schema changes; no importer contracts touched; tests precede code.

## Complexity Tracking

No constitution violations — table intentionally empty.
