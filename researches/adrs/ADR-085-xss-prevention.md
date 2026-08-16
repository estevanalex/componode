### ADR-085 — XSS prevention

**Context**: React escapes by default, but `dangerouslySetInnerHTML`,
`href="javascript:..."`, and `target="_blank"` without `rel="noopener
noreferrer"` are XSS/tabnabbing vectors.

**Decision**: **The frontend MUST NOT use `dangerouslySetInnerHTML` in v1.**
All user-controlled content is rendered through React's default escaping. If
rich-text rendering is required in a future spec, it MUST use a sanitizing
library (e.g. `dompurify`) with an allow-listed tag/attribute set. URL
fields MUST be validated against an allow-list of protocols (`http`,
`https`, `mailto`) before rendering as `href` — a shared `safeUrl(url):
string | null` utility in `packages/frontend` centralizes this. All
`target="_blank"` links MUST include `rel="noopener noreferrer"` — a shared
`<ExternalLink>` component enforces this.

**Rationale**: No v1 feature needs HTML rendering (all content is structured
data). The three XSS vectors that exist even without `dangerouslySetInnerHTML`
(HTML injection, protocol injection, reverse tabnabbing) are each covered by
a concrete, enforceable artifact (`safeUrl`, `<ExternalLink>`).