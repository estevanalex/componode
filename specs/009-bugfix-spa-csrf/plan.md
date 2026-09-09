# Implementation Plan: SPA Direct Navigation & Initial CSRF Cookie

**Branch**: `bugfix/009-spa-csrf` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

## Summary

This bugfix resolves two first-use deployment blockers discovered during smoke testing:

1. Direct navigation to a frontend route (e.g. `/login`) returned 404 because the backend's not-found handler always returned a JSON problem document.
2. The first login attempt failed with `CSRF_TOKEN_MISMATCH` because the `componode_csrf` cookie was only set after a successful login/register, not before it.

The fix keeps API 404 behavior intact while falling back to `index.html` for browser navigation, and it issues the CSRF cookie on the first safe `GET`/`HEAD` response when one is missing.

## Technical Context

**Language/Version**: Node.js 20+, TypeScript 5, Fastify 5, `@fastify/static` 8.x

**Primary Dependencies**: Fastify, `@fastify/static` (existing), `@fastify/cookie` (existing)

**Storage**: No schema changes. No migrations. The bootstrap admin password was reset in the local Postgres volume only; not part of the repository.

**Testing**: Vitest unit test for the not-found handler; Vitest integration test for the CSRF cookie flow.

**Target Platform**: Linux/AMD64 and Linux/ARM64 (Docker container); no platform-specific code.

**Project Type**: Monorepo backend bugfix.

**Constraints**:

- The existing `GET`/`HEAD` side-effect-free rule ([ADR-094](../researches/adrs/ADR-094-get-routes-must-not-have-side-effects.md)) must not be violated; issuing a cookie is a response-side action, not domain state change.
- RFC 7807 problem responses must remain for `/api/...` and `/metrics` ([ADR-071](../researches/adrs/ADR-071-api-error-response-format.md)).
- CSRF double-submit pattern remains universal ([ADR-087](../researches/adrs/ADR-087-csrf-protection.md)); this fix only changes *when* the cookie is first issued.
- Single-organization, self-hosted ([Constitution I](../.specify/memory/constitution.md)); no tenant or multi-org changes.
- Test-first ([Constitution VI](../.specify/memory/constitution.md)); regression tests must exist before the fix is considered complete.

## Constitution Check

| Principle | Verdict | Notes |
|---|---|---|
| I. Single-organization, Self-Hosted | Pass | No org/tenant-layer changes. |
| II. Importer-first | Pass | No importer changes. |
| III. Two-level taxonomy | Pass | No category/provider changes. |
| IV. Environment-as-instance | Pass | No data model changes. |
| V. Factual vs. meaning | Pass | No product hierarchy changes. |
| VI. Test-first | Pass | Regression tests added before final validation. |
| VII. Observability | Pass | No new runtime logging; existing Pino logging preserved. |

No violations.

## Project Structure

### Documentation (this bugfix)

```text
specs/009-bugfix-spa-csrf/
├── spec.md       # This bugfix's requirements and scenarios
├── plan.md       # This file
└── tasks.md      # Executable tasks
```

### Source Code (repository root)

```text
packages/backend/src/plugins/error-handler.ts   # update: serve index.html for HTML 404s
packages/backend/src/plugins/csrf.ts            # update: issue CSRF cookie on safe GET/HEAD
packages/backend/test/unit/not-found-handler.test.ts  # update: add SPA fallback regression tests
packages/backend/test/integration/csrf.test.ts        # update: add initial-cookie regression test
researches/adrs/ADR-087-csrf-protection.md     # amendment: when the cookie is first issued
researches/adrs/ADR-105-spa-fallback-for-direct-navigation.md  # new: fallback decision
researches/architecture-decisions.md           # update: add ADR-105 to index
AGENTS.md                                       # update: document bugfix spec workflow
```

## Complexity Tracking

No constitution violations — table omitted.
