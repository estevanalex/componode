### ADR-096 — Error responses must not leak internals

> **Status:** Ratified

**Context**: A raw error response (`500: TypeError at /app/packages/
backend/src/services/...:42`) leaks the tech stack, file structure, and
code flow to an attacker.

**Decision**: **Error responses use `{code, message, details?}` ([ADR-071](./ADR-071-api-error-response-format.md))
with controlled `code` enums.** `message`/`details` MUST NOT include stack
traces, file paths, SQL text, raw DB errors, env var names, or internal
service names. Stack traces logged server-side only ([ADR-090](./ADR-090-no-secrets-in-logs.md)). DB errors
translated: `23505` → `409 DUPLICATE_SLUG`/`DUPLICATE_KEY`, `23514` → `400
VALIDATION_FAILED`, `23503` → `409 REFERENTIAL_INTEGRITY`, `40P01` → `409
CONFLICT_RETRY`, cycle-detection exception → `409 CYCLE_DETECTED` (with
`details: {cycle: [productId, ...]}` — the cycle path is intentional, not
a leak). In dev, a `debug` field is gated by `DEBUG_ERROR_DETAILS=true` env
var (not `NODE_ENV`). The `debug` field is never populated for auth error
codes (`AUTH_INVALID_CREDENTIALS`, `AUTH_RATE_LIMITED`,
`AUTH_SESSION_EXPIRED`, `AUTH_FORBIDDEN`, `OIDC_CALLBACK_FAILED`).

**Rationale**: The SQLSTATE mapping makes DB error translation consistent
and enforceable. The `debug` field gated by explicit env var (not
`NODE_ENV`) avoids misconfiguration leaks. Auth codes never get `debug` to
prevent user enumeration or credential detail leakage. The cycle path in
`details` is intentional (the user needs it to fix the cycle).