### ADR-102 — Content injection in JSONB fields

**Context**: Importers yield arbitrary data in `Component.details` and
`ComponentInstance.rawConfig`. A malicious external source could yield
`details: {"xss": "<img src=x onerror=alert(1)>"}` or `rawConfig: {"url":
"javascript:alert(1)"}`.

**Decision**: **(1) Frontend rendering: JSONB fields MUST be rendered as
structured data (text in React components, or JSON tree rendering values as
text). MUST NOT pass through `dangerouslySetInnerHTML` ([ADR-085](./ADR-085-xss-prevention.md)), `eval()`,
or any HTML/string interpretation. (2) URLs in JSONB: sanitized via
`safeUrl()` ([ADR-085](./ADR-085-xss-prevention.md)) before rendering as `href`. JSON tree components MUST
NOT auto-link URLs (or MUST sanitize if they do). (3) Markdown/rich-text
rendering of JSONB is PROHIBITED in v1. If a future spec requires it, MUST
use `react-markdown` + `rehype-sanitize` with allow-listed tags, and the
raw markdown MUST be stored in a dedicated field (not free-form `details`).
(4) Backend error responses: JSONB values in `details` are safe (React
escapes), but MUST NOT be in error `message` strings. (5) Backend SQL:
JSONB fields queried via Kysely's JSONB operators, never string
interpolation ([ADR-084](./ADR-084-sql-injection-prevention.md)).**

**Rationale**: The `details`/`rawConfig` fields are the largest untrusted-
data surface in the frontend. Rendering as structured data (text) is safe
by default (React escapes). The markdown prohibition is explicit (a
contributor might reach for a markdown renderer to show "rich" config —
this rule blocks it in v1). The dedicated-field requirement for future
markdown clearly marks rich-text content as requiring sanitization.