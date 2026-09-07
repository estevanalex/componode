# Research: UX shell

**Date**: 2026-09-07 | **Feature**: `004-ux-shell`

All Technical Context items were resolved from repo facts and prior decisions
(ADR-103, `docs/ux.md`, Clarifications session 2026-09-07). No NEEDS
CLARIFICATION markers remained. This file records the design decisions and
alternatives considered.

## Decision 1: Theming implementation

- **Decision**: Use `next-themes` (already in `package.json`, v0.4.6) with
  `attribute="class"`, `defaultTheme="system"`. Extend `index.css` with a
  `dark` variant (`@custom-variant dark` per Tailwind v4) and a full dark
  token set plus one accent `--primary` hue. Add an inline boot script in
  `index.html` so the class is applied before first paint.
- **Rationale**: Zero new deps for the core mechanism; `next-themes` is the
  shadcn-documented approach; localStorage persistence matches the clarified
  requirement and avoids a server round-trip that would race first paint.
- **Alternatives considered**: (a) hand-rolled `prefers-color-scheme` +
  localStorage hook — reimplements a solved problem, more test surface;
  (b) server-side per-user setting — rejected in clarification Q2 (needs new
  endpoint + per-user settings concept; theme isn't app-level `app_settings`).

## Decision 2: Command palette

- **Decision**: Add `cmdk` dependency and build the palette with shadcn's
  `Command` primitives inside a `Dialog`. Global `keydown` listener for
  `Ctrl+K`/`Cmd+K` registered in the app shell. Debounced (~200ms)
  `useQuery` on `GET /api/v1/search?q=`.
- **Rationale**: `cmdk` is the de-facto standard paired with shadcn; a
  server-side search endpoint keeps authorization and ranking in one place
  rather than fetching per-entity lists client-side.
- **Alternatives considered**: (a) client-side search over cached lists —
  doesn't scale to 50k components and would leak entities across role
  boundaries; (b) `kbar`/`react-command-palette` — heavier, less aligned with
  shadcn.

## Decision 3: Dashboard data delivery

- **Decision**: One aggregate endpoint `GET /api/v1/dashboard/summary`
  returning `{ counts, attention, lastRuns, lastImportAt }` — computed in a
  `dashboard-service` with Kysely aggregate queries.
- **Rationale**: One round-trip for a page that is the landing view; the data
  is small (counts + ~10 rows); FR-012 requires read-only. `import_runs`
  already carries all needed counters — verified in migration 001, no
  migration needed.
- **Alternatives considered**: (a) reuse existing list endpoints and compute
  client-side — requires over-fetching pages of data just for counts and puts
  role-filtering logic in the UI; (b) separate endpoints per region — more
  waterfalls for no benefit at this size.

## Decision 4: State matrix mechanics

- **Decision**: Shared `components/states/` primitives
  (`Skeletons`, `EmptyState`, `ErrorState`, `Forbidden`, `StatusBadge`) mapped
  from TanStack Query states: `isPending` → skeleton; `isFetching` with data →
  subtle indicator, keep data; `error.status===403` → Forbidden; `404` →
  not-found; other `error` → ErrorState with `query.refetch` as retry; empty
  `data` → EmptyState. Retrofit all 14 pages (Clarifications Q1).
- **Rationale**: One mapping in one place; pages compose primitives rather
  than hand-rolling per page. `AuthGuard`'s full-screen "Loading..." becomes
  a shell skeleton.
- **Alternatives considered**: (a) per-page ad hoc states — status quo,
  rejected as the inconsistency being fixed; (b) Suspense + ErrorBoundary-only
  — can't express section-level errors or 403 distinction cleanly with current
  fetch wrapper.

## Decision 5: Shell & routing

- **Decision**: `AppShell` layout route wrapping authenticated routes via
  React Router `<Outlet/>`; `AuthGuard` moves inside the shell; auth pages
  stay outside. Sidebar sections per docs/ux.md §3 with admin gating on
  `user.role === "ADMIN"`; collapsed state persisted in `sessionStorage`.
  Breadcrumbs from a static segment→label map + route params (slug).
- **Rationale**: Layout routes are idiomatic React Router 7; sessionStorage
  matches the "per session" spec wording without inventing a settings API.
- **Alternatives considered**: (a) wrapping each page component individually —
  duplicates chrome and breaks the persistent-sidebar feel during navigation;
  (b) localStorage for collapse state — spec says "for that session", not
  permanent.

## Decision 6: Search endpoint shape

- **Decision**: `GET /api/v1/search?q=<term>&limit=` returning grouped
  results `{ components: [], products: [], groups: [], importers: [] }`, each
  item `{ id, slug?, name, kind }` with a resolved `href`. Case-insensitive
  `ILIKE` prefix match on `name`/`slug`, mirroring spec 003 search
  semantics. Viewer-role filtering matches each entity's read permission.
- **Rationale**: Grouped-by-kind response maps 1:1 to the palette's sectioned
  rendering; single endpoint keeps one authZ choke point.
- **Alternatives considered**: per-entity parallel queries from the client —
  N round-trips and N authZ surfaces; full-text search (pg_trgm/tsvector) —
  unnecessary at v1 scale, adds index complexity.

## Open risks

- **Density/token sweep**: retrofitting all pages may surface hardcoded
  colors/spacing; mitigated by lint-level review during tasks.
- **WCAG contrast for the accent hue**: must be verified 4.5:1 in both themes
  (SC-003) — pick the accent with contrast checked, not by eye.
