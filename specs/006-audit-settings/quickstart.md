# Quickstart Validation: Audit & Settings (006)

End-to-end scenarios proving the feature. Run after `speckit-implement`
completes. Prerequisites: repo installed (`pnpm install`), Postgres up
(`docker compose up -d db`), migrations applied, backend + frontend running
(`pnpm dev`), and an admin account (bootstrap admin works).

## Scenario 1 — Activity feed (US1)

1. As Admin, make three known changes: rename a product, add a `COMPOSES`
   edge, edit a component's description.
2. Open **Activity** in the sidebar (admin section).
3. Expect: three entries, newest first, each showing actor name, action,
   linked entity, timestamp; edge entry shows edge type + endpoints.
4. Filter `entityType = digital_product` → only product entries remain.
5. Sign in as a Viewer → `/activity` is denied (403) and the nav item is
   hidden.

## Scenario 2 — Entity history + deleted actor (US2)

1. Open the renamed product's detail page → **History** tab shows its changes
   in order with field-level diffs.
2. Hard-delete a person who has audit entries → their entries still show the
   recorded name; no broken link.
3. An entity with no changes shows the empty state, not an error.

## Scenario 3 — Coverage sweep (US3)

Perform each and confirm an entry appears in Activity (or entity history):

- [ ] Component edit, component-group edit, importer-config save → entity
      entries with correct actor
- [ ] Settings change → entry with changed keys; OIDC client secret never
      appears
- [ ] Admin creates a user, changes a role, revokes a session → entries exist
- [ ] Login success, failed login, logout, password change → `auth` entries,
      no credentials recorded
- [ ] Trigger an importer run that discovers/transitions assets → entries
      show actor `importer:<name>` and appear under the run's changes
- [ ] Attempt UPDATE/DELETE on `entity_changes` directly in SQL → trigger
      raises "append-only" exception
- [ ] Admin records a correction on any entry → new `correction` entry
      references the original; original unchanged

## Scenario 4 — Settings enforcement (US4)

1. Settings → set session idle timeout to the minimum (1 min). Save.
2. Stay idle > 1 min → next request returns 401; re-login required.
3. Disable self-registration → `/register` refuses signups; re-enable →
   registration works and the new account gets the configured default role.
4. Change takes effect immediately — no restart.

## Regression gate

- `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build` green.
- `docs/openapi.yaml` lists all new endpoints; `docs/api.md` regenerated
  (`pnpm docs:api`); `api-docs-contract.test.ts` passes (ADR-104).
- No `sql.raw()`/`sql.fragment()` in new code; no `dangerouslySetInnerHTML`;
  no secrets in audit payloads or logs.
- WCAG sweep on new surfaces: feed table keyboard-navigable, filters
  labeled, focus-visible rings (SC-007).
