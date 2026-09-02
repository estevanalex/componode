### ADR-088 — CORS configuration

> **Status:** Ratified

**Context**: In production, the frontend is same-origin (backend serves
static via `fastify-static`), so CORS is not needed. In dev, the Vite dev
server runs on a different port. A misconfigured `Access-Control-Allow-
Origin: *` with `Allow-Credentials: true` is a security hole.

**Decision**: **CORS is opt-in (default empty = disabled).** Explicit
allow-list of exact origins (`CORS_ALLOWED_ORIGINS` env var, comma-
separated, no wildcards, no patterns). In dev, the Vite proxy
(`server.proxy['/api'] = 'http://localhost:3000'`) is the primary mechanism
— CORS is not needed. When `CORS_ALLOWED_ORIGINS` is non-empty:
`Access-Control-Allow-Credentials: true` for allow-listed origins,
`Access-Control-Max-Age: 3600`, allowed methods are the route's actual
methods (not `*`). When empty: the CORS preHandler is a no-op.

**Rationale**: Opt-in minimizes the CORS attack surface to "only what the
deployer explicitly configures." The Vite proxy eliminates the dev CORS
need. Exact origins only (no patterns) prevents subdomain-takeover
exploitation.