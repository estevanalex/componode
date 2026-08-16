### ADR-094 — GET routes must not have side effects

**Context**: Rule 4's CSRF protection covers POST/PUT/PATCH/DELETE but not
GET. A GET route with side effects is a CSRF vector (`<img src="...">`
triggers it with the user's cookies).

**Decision**: **GET/HEAD routes MUST be idempotent and side-effect-free
with respect to domain state.** They MUST NOT mutate domain entities,
trigger importer runs, modify sessions (other than `lastSeenAt` operational
bookkeeping per [ADR-043](./ADR-043-session-storage.md)), or perform any action that changes persistent
domain state. State-changing operations MUST use POST/PUT/PATCH/DELETE with
CSRF protection ([ADR-087](./ADR-087-csrf-protection.md)). Operational bookkeeping (`sessions.lastSeenAt`
write-throttled, `import_runs.lastPolledAt` if added) is permitted.
Read-access auditing is NOT performed on GET routes in v1 ([ADR-052](./ADR-052-audit-model-three-tier.md) logs
consequential state changes and human edits, not read access). If read-
access auditing is added in a future spec, it MUST be asynchronous and
decoupled from the GET route's response path.

**Rationale**: The prohibition is on domain state changes, not operational
bookkeeping (which is not CSRF-exploitable). Read-access auditing on GET
routes would be a side effect + a potential CSRF vector; deferred to a
future spec with proper design.