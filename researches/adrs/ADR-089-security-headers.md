### ADR-089 — Security headers

> **Status:** Ratified

**Context**: Without security headers, the application is vulnerable to
MIME sniffing, clickjacking, downgrade attacks, and resource injection.

**Decision**: **`@fastify/helmet` (or equivalent) on all HTTP responses.**
Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Strict-Transport-Security: max-age=31536000` (production only, no
`includeSubDomains`), `Content-Security-Policy: default-src 'self';
script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
connect-src 'self'; frame-ancestors 'none'`, `Referrer-Policy: strict-
origin-when-cross-origin`, `Permissions-Policy: geolocation=(),
microphone=(), camera=()`. HSTS is production-only. CSP `style-src
'unsafe-inline'` is a documented tradeoff for Tailwind CSS + shadcn/ui.
Both `X-Frame-Options` and `frame-ancestors` are set (defense in depth).
Headers apply to all routes including `/metrics`.

**Rationale**: `includeSubDomains` dropped from HSTS (deployer safety —
avoids breaking non-HTTPS subdomains). Nonce-based CSP is a v1.1
enhancement (Tailwind's inline styles require `'unsafe-inline'` for now).
Both frame-ancestors and X-Frame-Options for legacy browser support.