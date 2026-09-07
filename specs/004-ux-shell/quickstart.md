# Quickstart: UX shell validation

**Feature**: `004-ux-shell` | **Date**: 2026-09-07

Runnable validation scenarios proving each user story end-to-end. Requires the
stack running (`docker compose up` or `pnpm dev` for backend + frontend) and a
seeded catalog (at least one importer run).

## Prerequisites

```powershell
pnpm install          # picks up new cmdk dependency
pnpm -r build
pnpm -r test          # all suites must pass (constitution VI)
pnpm -r typecheck
pnpm --filter @componode/frontend dev   # or the compose stack
```

## Scenario 1 — Sidebar shell (US1)

1. Log in → every authenticated page shows the grouped sidebar
   (Catalog / Sources; Administration only for ADMIN).
2. Open a component detail → breadcrumbs read `Components / <slug>`; the
   `Components` crumb links back to `/components`.
3. Collapse the sidebar → icons only; reload → still collapsed.
4. Log in as a non-admin → no Administration section.
5. Verify the old top-nav and dashboard link-grid are gone.

**Expected**: FR-001–FR-004 acceptance scenarios all pass.

## Scenario 2 — State matrix (US2)

1. Throttle network (DevTools → Slow 3G) → each page shows skeletons shaped
   like content, no full-page spinner; refetches keep data visible.
2. Filter the catalog to zero results → empty-state block with icon,
   explanation, and one primary action — not a blank table.
3. Stop the backend → reload a page → inline error panel with working retry.
4. As a viewer, open `/users` → distinct "You don't have permission" state,
   no retry. Open a bad URL → not-found page with a link to the section root.
5. Check statuses: `ERROR`/`GONE` badges are red, `RETIRED` muted, everywhere
   identical; timestamps show "3m ago" with absolute on hover.

**Expected**: FR-005/FR-006 state matrix holds on every page (all 14
retrofitted per clarification Q1).

## Scenario 3 — Theming (US3)

1. Fresh browser profile → app follows OS light/dark.
2. Toggle theme in the user menu → instant switch, no reload; reload →
   choice persists; new tab → same theme.
3. Reload while dark → no flash of light theme before paint.
4. Run a contrast spot-check (DevTools or axe) on both themes → 4.5:1 on
   normal text; tables render compact (`text-sm`, tight rows).

**Expected**: FR-007, SC-003 pass in both themes.

## Scenario 4 — Dashboard (US4)

1. With a failed importer run and an `ERROR` instance present → "Attention
   needed" appears first, items deep-link to the run/component.
2. Stat cards show product/component/instance counts + last import time.
3. Importer status list shows each configured importer's last run with
   found/created/updated counts.
4. Fresh empty install → getting-started strip replaces all sections.
5. Viewer login → same page, no admin data.

**Expected**: `GET /api/v1/dashboard/summary` response matches
`contracts/api.md`; FR-008–FR-012 pass.

## Scenario 5 — Command palette (US5)

1. Press `Ctrl+K` (Windows) / `Cmd+K` (macOS) on any page → palette opens
   focused, under 200ms.
2. Type a component-name fragment → results grouped by kind (Components,
   Products, Groups, Importers) plus nav actions; under 1s on a 1k-component
   catalog.
3. `↑/↓` + `Enter` → navigates to the entity's detail page. `Esc` closes.
4. No-match query → empty-state message.
5. Viewer login → results contain nothing the role cannot read.

**Expected**: `GET /api/v1/search` response matches `contracts/api.md`;
FR-013, SC-005 pass.

## Regression gate

- `pnpm -r test` green, including new component tests (shell, states, palette)
  and backend integration tests for the two new endpoints.
- Keyboard-only walkthrough of login → dashboard → catalog → detail → palette
  completes without a pointer (WCAG 2.1 AA / SC-006).
