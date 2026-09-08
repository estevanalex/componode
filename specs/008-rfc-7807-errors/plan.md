# Implementation Plan: RFC 7807 Error Wrapping

**Branch**: `008-rfc-7807-errors` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-rfc-7807-errors/spec.md`

## Summary

This feature migrates the Componode API from a custom `{code, message, details?}` error envelope to the RFC 7807 `application/problem+json` standard while preserving the existing fields as extension members for backward compatibility. It updates the backend error handler, the OpenAPI reference, the generated docs, and the test suite to assert both the legacy fields and the new problem-document fields.

## Technical Context

**Language/Version**: Node.js 20+, TypeScript 5

**Primary Dependencies**: Fastify (existing), pnpm workspaces, Vitest, `@componode/core` (existing error codes)

**Storage**: N/A — no database schema changes. The error-code-to-type-URI mapping is a controlled in-code set.

**Testing**: Vitest unit and integration tests with testcontainers PostgreSQL; OpenAPI contract test; docs build verification.

**Target Platform**: Linux/AMD64 and Linux/ARM64 (where the backend runs); no platform-specific code.

**Project Type**: monorepo backend contract + generated documentation update.

**Performance Goals**:

- Error response serialization must not add more than 1 ms to request handling time.
- No regression in test suite duration (current baseline ~8 minutes).

**Constraints**:

- The existing `code`, `message`, and `details` fields MUST remain in the response body as RFC 7807 extensions.
- The `Content-Type` for all error responses MUST be `application/problem+json`.
- Stack traces, SQL, and internal file paths MUST NOT appear in error documents unless `DEBUG_ERROR_DETAILS=true`.
- The `type` URI base domain MUST be configurable but defaults to the project's canonical public domain.
- Single-organization, self-hosted (Constitution I); no tenant or multi-org changes.
- Test-first (Constitution VI): new tests for the problem envelope are written before implementation.

**Scale/Scope**:

- All existing and new API error paths in the v1 backend.
- OpenAPI reference and generated docs site.
- No new product functionality; only the error response format changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict | Notes |
|---|---|---|
| I. Single-organization, Self-Hosted | Pass | No tenant or organization-layer changes. |
| II. Importer-first | Pass | No importer changes. |
| III. Two-level taxonomy | Pass | No category or provider changes. |
| IV. Environment-as-instance | Pass | No data model changes. |
| V. Factual vs. meaning | Pass | No product hierarchy or importer-declared edges. |
| VI. Test-first | Pass | New contract and integration tests for the problem envelope are included in the quickstart. |
| VII. Observability from day one | Pass | Existing Pino error logging is preserved; the error handler continues to log the original error with stack trace server-side. |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-rfc-7807-errors/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
.
├── packages/
│   ├── core/
│   │   src/
│   │   │   constants/
│   │   │   │   error-codes.ts         # existing controlled error code set
│   │   │   errors/
│   │   │   │   problem.ts             # new: RFC 7807 Problem builder and ErrorType mapping
│   │   │   index.ts                   # re-export Problem utilities
│   │   test/
│   │   │   errors/
│   │   │   │   problem.test.ts        # new: unit tests for Problem construction
│   ├── backend/
│   │   src/
│   │   │   plugins/
│   │   │   │   error-handler.ts       # update: emit application/problem+json
│   │   │   routes/
│   │   │   │   health.ts              # unchanged (already public)
│   │   test/
│   │   │   integration/
│   │   │   │   problem-errors.test.ts # new: integration tests for problem envelope
│   │   │   │   auth.test.ts           # update: assertions may need to accept both shapes
│   ├── frontend/
│   │   src/
│   │   │   lib/
│   │   │   │   api.ts                 # may need Accept header update
│   │   test/
│   │   │   unit/
│   │   │   │   problem-error.test.tsx # new: frontend problem parsing
├── docs/
│   ├── openapi.yaml                   # update: Problem schema and error responses
│   └── api.md                         # update: error format description
└── docs-site/
    └── .vitepress/
        └── config.ts                  # unchanged; docs site will render updated pages
```

**Structure Decision**: Keep all changes inside the existing monorepo structure. Add a small `packages/core/src/errors/problem.ts` module for the problem envelope builder and type-URI mapping so both backend and frontend can import it. Update the backend error handler to use the builder. Update `docs/openapi.yaml` and `docs/api.md` to reflect the new contract.

## Complexity Tracking

No constitution violations — table omitted.
