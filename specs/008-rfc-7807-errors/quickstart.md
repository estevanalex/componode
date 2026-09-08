# Quickstart: RFC 7807 Error Wrapping Validation

**Feature**: RFC 7807 Error Wrapping (`008`)

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose (for backend integration tests with testcontainers)
- The `008-rfc-7807-errors` branch checked out

## Scenario 1 — Verify an Error Response Returns `application/problem+json`

**Goal**: Confirm a protected endpoint returns a problem document when the client is unauthenticated.

**Steps**:

1. Start dependencies and the backend in test mode:

   ```powershell
   pnpm test
   ```

   or run the integration tests directly:

   ```powershell
   pnpm --filter @componode/backend test
   ```

2. Inspect a failing test or use an HTTP client to send an unauthenticated request:

   ```powershell
   Invoke-RestMethod -Uri http://localhost:3000/api/v1/settings -Method GET
   ```

**Expected outcome**: The response has `Content-Type: application/problem+json`, `status: 401`, and a body containing `type`, `title`, `status`, `code`, and `message`.

## Scenario 2 — Verify Validation Errors Use `invalid-params`

**Goal**: Confirm validation failures expose per-field errors in the `invalid-params` extension.

**Steps**:

1. Send a malformed request to an endpoint that requires validation, e.g.:

   ```powershell
   Invoke-RestMethod -Uri http://localhost:3000/api/v1/users -Method POST -Body '{"username":""}' -ContentType 'application/json'
   ```

2. Parse the response body.

**Expected outcome**: The response has `status: 400`, `code: "VALIDATION_FAILED"`, and an `invalid-params` array with `{ name, reason }` objects.

## Scenario 3 — Verify Backward Compatibility

**Goal**: Confirm the existing `code`, `message`, and `details` fields are still present.

**Steps**:

1. Run the existing backend integration tests:

   ```powershell
   pnpm --filter @componode/backend test
   ```

2. Observe that tests for `AUTH_FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, and `VALIDATION_FAILED` still pass and assert `code` and `message`.

**Expected outcome**: No existing tests fail; the same `code` and `message` values are present in the response.

## Scenario 4 — Verify OpenAPI Contract

**Goal**: Confirm the OpenAPI reference documents the new `Problem` schema.

**Steps**:

1. Build the docs site:

   ```powershell
   pnpm docs:build
   ```

2. Open `docs-site/.vitepress/dist/openapi-reference.html` or use the generated VitePress site.

**Expected outcome**: The API reference page shows a reusable `Problem` schema and every error response links to it.

## Scenario 5 — Verify No Stack-Trace Leakage

**Goal**: Confirm 500 errors do not include internal details in the problem document.

**Steps**:

1. Ensure `DEBUG_ERROR_DETAILS` is not set to `true`.
2. Trigger an internal error path (or run the integration tests).
3. Inspect the 500 response body.

**Expected outcome**: The response has `code: "INTERNAL_ERROR"` and `type: https://componode.io/problems/INTERNAL_ERROR`; no stack trace, SQL, or file path appears in `detail` or `details`.

## Validation Summary Table

| Scenario | Command | Expected Outcome |
|---|---|---|
| 1 — Error is `problem+json` | `Invoke-RestMethod http://localhost:3000/api/v1/settings` | `Content-Type: application/problem+json`; body has `type`, `title`, `status`, `code`, `message` |
| 2 — Validation `invalid-params` | `POST /api/v1/users` with invalid body | `invalid-params` array of `{ name, reason }` |
| 3 — Backward compatibility | `pnpm --filter @componode/backend test` | All existing error tests pass |
| 4 — OpenAPI contract | `pnpm docs:build` | `Problem` schema visible and linked |
| 5 — No stack-trace leakage | Trigger 500 or run tests | `INTERNAL_ERROR` problem with no internal details |
