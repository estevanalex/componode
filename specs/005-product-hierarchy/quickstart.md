# Quickstart: Product hierarchy validation

Prereqs: backend + frontend running, logged-in ADMIN session, at least the
demo data from specs/003 quickstart (a few components + one instance).

## Scenario 1 — Tree (US1)

1. Seed: create "Payments" (BUSINESS_CAPABILITY) → "Shared Platform"
   (PLATFORM) via product CRUD; compose platform under capability.
2. Open `/products` → tree shows "Payments" root collapsed; expand →
   "Shared Platform" nested with type + lifecycle badges.
3. Create "Billing" (PLATFORM) with no parent → renders as a root
   (positional root rule).
4. Type "plat" in the filter → tree flattens to a list of matches.
5. Retire "Billing" → disappears; toggle "show retired" → reappears muted.

**Expected**: roots = parentless products of any type; search flattens;
retired excluded by default.

## Scenario 2 — Detail tabs (US2)

1. Give "Shared Platform" a DEPENDS_ON_COMPONENT edge to a component.
2. Open `/products/payments` → Composition tab: Composed by=∅, Composes=
   Shared Platform, Consumes from=∅ (separate labeled sections).
3. Components tab: **Declared** empty; **Inherited** lists the component
   with `via Shared Platform`.
4. Instances tab: same split, grouped by environment with status badges.
5. Overview: counts match (1 composes, 1 inherited component, …).

**Expected**: declared vs inherited provenance is always visible.

## Scenario 3 — Edge rules (US3)

1. As EDITOR: try `COMPOSES` with a PLATFORM parent → `422
   INVALID_EDGE_TYPE`.
2. Compose Payments → Shared Platform → back to Payments → `409 CYCLE`
   with a clear "would create a cycle" message.
3. `CONSUMES_FROM` targeting a non-PLATFORM → `422`.
4. Change a wired-in product's type to PLATFORM → `409
   TYPE_CHANGE_BLOCKED` naming the offending edges.
5. As VIEWER: all mutation buttons absent; API calls → `403`.

**Expected**: every invalid write rejected with the documented code.

## Scenario 4 — Delete guards (US3/US4)

1. `DELETE` a wired-in product → `409 REFERENCED` with edge counts; retire
   it instead → hidden by default; un-retire → restored with edges intact.
2. `DELETE` an edge-free product → `204`, gone everywhere.
3. `DELETE` a Team that owns a product or has members → `409 REFERENCED`
   listing references; reassign, then delete → `204`.

## Scenario 5 — Org entities + search (US4 + FR-011/012)

1. Sidebar shows "Organization" (Lines of Business, Teams) under Catalog.
2. Create LOB "Revenue" + Team "Payments Eng"; team detail shows roster.
3. Assign both as owners of "Payments" → Overview + tree row show them;
   unassigned product shows "Unassigned".
4. `Ctrl+K` → type "reve" → "Revenue" appears under a Lines of Business
   group and navigates to `/lobs`.

## Regression gate

- `pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm -r build` green.
- Keyboard: tree expand/collapse, picker dialogs, and delete confirms are
  keyboard-reachable with visible focus.
- Security spot-check: no `sql.raw`, no `dangerouslySetInnerHTML`, strict
  schemas on every new route, GETs side-effect-free, mutations audited.
