### ADR-105 — SPA fallback for direct navigation

> **Status:** Ratified

**Context**: [ADR-065](./ADR-065-package-dependency-graph.md) decided that the backend serves the
frontend's built static assets via `@fastify/static` in production. The
frontend is a React Router SPA using `BrowserRouter`. When a user opens
`/login` directly, refreshes a page, or follows a deep link, the browser sends a
`GET` request for a path that exists only in the client-side router. Without a
fallback, the backend returns a 404, breaking bookmarks, refresh, and direct
navigation.

**Decision**: **The backend MUST fall back to serving `index.html` for
browser-style `GET`/`HEAD` requests that do not match an API route, `/metrics`,
or a static asset.** The not-found handler distinguishes HTML clients
(`Accept: text/html`, `*/*`, or no `Accept` header) from API clients and serves
`index.html` via `reply.sendFile` when the static plugin is active. API and
metrics 404s continue to return RFC 7807 `application/problem+json` responses
([ADR-071](./ADR-071-api-error-response-format.md)).

**Rationale**: A single-page application (SPA) owns client-side routing after
`index.html` is loaded. Returning `index.html` for unknown non-API paths lets the
SPA render the correct route, while preserving machine-readable 404s for API
consumers. This keeps the one-container deployment model ([ADR-028](./ADR-028-deployment-docker-compose-only-for-v1.md))
without adding a separate reverse proxy or rewrite layer.
