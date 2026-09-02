### ADR-072 — Frontend error handling

> **Status:** Ratified

**Context**: [ADR-071](./ADR-071-api-error-response-format.md) defined the error format. How does the frontend consume
it?

**Decision**: **Global TanStack Query `QueryClient` `onError` for default
error UX (toast/redirect/retry) + per-mutation `onError` override for form
inline field errors.** The global handler distinguishes error types (401 →
redirect to login, 403 → "insufficient role" toast, 429 → "rate limited" toast
with retry, 422 → let the mutation's local handler do inline field errors, 500
→ generic "something went wrong" toast). A shared `parseFieldErrors(error):
Record<string, string>` utility handles the `details` → field-error mapping
for forms.

**Rationale**: The TanStack Query idiomatic pattern. The global handler is the
single place for default error UX; the `useMutation` calls that need inline
field errors (forms) override `onError`. No full TanStack Query wrapper
(over-engineering for v1). The `parseFieldErrors` utility avoids duplicating
field-error logic across form components. Integrates with shadcn's `Form` via
`react-hook-form`'s `setError`.