# Implementation Plan: UX shell — navigation, theming, states, dashboard, global search

**Branch**: `004-ux-shell` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-ux-shell/spec.md`

## Summary

Implement the UX foundation ratified by ADR-103 and defined in `docs/ux.md`:
replace the flat top-nav with a grouped, collapsible **sidebar shell** +
breadcrumb top bar; retrofit **every existing page** to the state matrix
(skeletons, empty states, inline errors with retry, distinct 403/404); ship
**dark mode + accent theme + compact density** via `next-themes` (already a
dependency) and Tailwind v4 tokens; replace the link-grid dashboard with a
**health-and-attention dashboard** backed by new read-only aggregate
endpoints; and add a **`Ctrl+K` command palette** (`cmdk`) backed by a
server-side search endpoint.

Scope cut (per spec): the products tree/detail UI waits for the
product-hierarchy feature; `/products` keeps its stub inside the new shell.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js backend, React 18 frontend

**Primary Dependencies**: Fastify + Kysely (backend); React 18, Vite,
TanStack Query 5, React Router 7, Tailwind CSS 4, shadcn/ui (Radix),
`next-themes` 0.4 (installed), `lucide-react`, `sonner` (installed).
New dependency: `cmdk` for the command palette.

**Storage**: PostgreSQL — read-only queries over existing tables
(`digital_products`, `components`, `component_instances`, `component_groups`,
`importer_configs`, `import_runs`). **No schema migration required**:
`import_runs` already persists `status`, `startedAt`/`completedAt`,
`assetsProcessed`, `assetsCreated`, `assetsUpdated`, `instancesOrphaned`,
`componentsRetired` (verified in `001_initial_schema.ts`).

**Testing**: Vitest + Testing Library + jsdom (frontend); Vitest +
testcontainers Postgres (backend integration). Test-first per constitution VI.

**Target Platform**: Docker Compose single container; backend serves frontend
static build. Desktop-first UI (≥1280px optimized, usable ≥768px).

**Project Type**: Web application (frontend + backend in pnpm monorepo).

**Performance Goals**: Palette open <200ms; search results <1s at 1k
components (SC-005); dashboard answers "is everything okay" <10s (SC-004);
theme applies before first paint (no flash).

**Constraints**: All new routes under `/api/v1/`, authenticated (ADR-054/097),
Zod-validated rejecting unknown fields (ADR-095), `{code, message, details?}`
errors (ADR-071/096), `GET` side-effect-free (ADR-094), no `sql.raw()`
(ADR-084), WCAG 2.1 AA (spec 001 FR-026), no `dangerouslySetInnerHTML` /
`safeUrl()` on hrefs (ADR-085), no secrets in logs (ADR-090).

**Scale/Scope**: ~14 existing pages to retrofit; 2 new backend endpoints; 1
new dependency; no DB changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict | Notes |
|---|---|---|
| I. Single-organization | ✅ Pass | No tenant concepts; dashboard aggregates are org-global |
| II. Importer-first | ✅ Pass | No importer changes; reads `import_runs` only |
| III. Two-level taxonomy | ✅ Pass | Read-only over existing taxonomy |
| IV. Environment-as-instance | ✅ Pass | Attention section surfaces `ERROR`/`GONE` *instances*, never lifecycle |
| V. Factual vs meaning layer | ✅ Pass | No product-edge authoring; product counts are read-only |
| VI. Test-first | ✅ Pass | tasks.md will order failing tests before implementation; component tests for shell/states/palette, integration tests for new endpoints |
| VII. Observability | ✅ Pass | New GET routes go through existing request logging/metrics/tracing; no new runtime paths without instrumentation |

**Gate result: PASS — no violations, no complexity justification needed.**

## Project Structure

### Documentation (this feature)

```text
specs/004-ux-shell/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (read-only projections; no new tables)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output: dashboard + search endpoint contracts
│   └── api.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/frontend/src/
├── app.tsx                       # ThemeProvider wrap; global QueryClient onError (ADR-072)
├── index.css                     # Tailwind v4 tokens: light + dark + accent + density
├── routes.tsx                    # Shell-wrapped route tree; auth pages outside shell
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx         # NEW: sidebar + top bar + <Outlet/>
│   │   ├── sidebar.tsx           # NEW: grouped nav, collapse, role gating
│   │   ├── top-bar.tsx           # NEW: breadcrumbs, user menu, theme toggle, sign-out
│   │   ├── breadcrumbs.tsx       # NEW
│   │   ├── auth-guard.tsx        # MODIFIED: skeleton instead of "Loading..."
│   │   └── nav.tsx               # REMOVED (replaced by sidebar/top-bar)
│   ├── command-palette.tsx       # NEW: cmdk palette, Ctrl+K binding
│   ├── theme-provider.tsx        # NEW: next-themes wrapper + toggle
│   ├── states/                   # NEW: shared state components
│   │   ├── skeletons.tsx         # page/table/card skeletons
│   │   ├── empty-state.tsx       # icon + message + primary action
│   │   ├── error-state.tsx       # inline error + retry
│   │   ├── forbidden.tsx         # distinct 403
│   │   └── status-badge.tsx      # enum→badge color map
│   ├── ui/                       # existing shadcn primitives (+ skeleton, command)
│   └── …                         # existing domain components
├── api/
│   ├── client.ts                 # existing fetch wrapper
│   └── hooks/
│       ├── dashboard.ts          # NEW: useDashboardSummary / useAttention
│       └── search.ts             # NEW: useGlobalSearch (debounced)
├── lib/
│   ├── format.ts                 # NEW: relative-time, enum badge map helpers
│   └── utils.ts                  # existing cn()
└── pages/
    ├── dashboard.tsx             # REWRITTEN: attention → stats → importer status
    └── … (all pages retrofitted to state matrix + shell)

packages/backend/src/
├── routes/
│   ├── dashboard.ts              # NEW: GET /api/v1/dashboard/summary
│   └── search.ts                 # NEW: GET /api/v1/search
└── services/
    ├── dashboard-service.ts      # NEW: aggregate queries (counts, last runs, attention)
    └── search-service.ts         # NEW: cross-entity name/slug search

packages/core/src/schemas/
└── search.ts                     # NEW: searchQuerySchema (Zod strict, ADR-095)
```

**Structure Decision**: Web-application layout — all frontend work in
`packages/frontend`, two thin read-only route+service pairs in
`packages/backend`. No new packages, no migrations, no importer changes.

## Phase 0 — Research summary (see research.md)

All decisions resolved without open unknowns:

- **Theming**: `next-themes` (already installed) + Tailwind v4
  `@custom-variant dark` + extended `@theme` token set; inline boot script for
  no-flash. localStorage persistence only (Clarifications 2026-09-07).
- **Command palette**: `cmdk` (new dep, shadcn `Command` recipe) + debounced
  `useQuery` against `GET /api/v1/search`.
- **Dashboard**: single `GET /api/v1/dashboard/summary` returning counts +
  attention items + last runs — one round-trip, all side-effect-free reads.
- **State matrix**: shared `states/` components + TanStack Query
  `isPending`/`isFetching`/`error` mapping; `AuthGuard` switches to shell
  skeleton.
- **Breadcrumbs**: derived from the route map (docs/ux.md §3) via a static
  segment→label map; slug from route params.

## Phase 1 — Design summary (see data-model.md, contracts/, quickstart.md)

- **data-model.md**: read-only projections only — `DashboardSummary`,
  `AttentionItem`, `SearchResult`. No tables, no migrations.
- **contracts/api.md**: `GET /api/v1/dashboard/summary` and
  `GET /api/v1/search?q=` request/response schemas, error codes.
- **quickstart.md**: runnable validation scenarios per user story.

## Constitution Check (post-design re-evaluation)

Re-evaluated after Phase 1: all seven principles still **PASS**. The new
endpoints are `GET`-only and side-effect-free (ADR-094); search returns only
entities readable by the caller's role; no new persistence, no importer
contracts touched, tests precede implementation.

## Complexity Tracking

No constitution violations — table intentionally empty.
