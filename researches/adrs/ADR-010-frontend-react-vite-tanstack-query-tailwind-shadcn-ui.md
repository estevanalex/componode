### ADR-010 — Frontend: React + Vite + TanStack Query + Tailwind (kept) + shadcn/ui

> **Status:** Ratified

**Context**: The prior frontend is React 18 + Vite + TanStack Query + React
Router + Tailwind. The pivot doesn't change the frontend's job (data-heavy
internal-tool UI).

**Decision**: **Keep the current stack.** Add **shadcn/ui** (Radix primitives +
Tailwind) for the forms/tables/dialogs the importer config UI will need.

**Rationale**: The existing stack is exactly what an internal data tool wants.
The gap is just "we need decent forms/tables/dialogs" — shadcn/ui solves that
without adopting a heavy component framework. Next.js's SSR story is wasted on
an authed internal tool.