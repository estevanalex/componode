### ADR-095 — Input validation

**Context**: Without route-boundary validation, a malformed request
propagates into the service layer and the database, causing storage bloat,
CHECK constraint violations, or injection vectors.

**Decision**: **All API request inputs MUST be validated at the route
boundary using Zod schemas.** Failed validation → `400` with
`{code: "VALIDATION_FAILED", message, details: [{field, issue}]}` ([ADR-071](./ADR-071-api-error-response-format.md)).
Unknown fields rejected (Zod `.strict()`). Default max-lengths: 255 for
names/labels, 100 for slugs, 2000 for descriptions, 100 for `resourceType`
(specs may override with justification). Enum inputs validated against
`core` constants ([ADR-079](./ADR-079-enum-constant-structure.md)). Shared schemas in `packages/core`, backend-only
schemas in `packages/backend/src/routes/schemas/`. Fastify `bodyLimit: 1MB`
default (configurable via `MAX_REQUEST_BODY_SIZE`).

**Rationale**: Validating at the route boundary means the service layer
receives typed, validated data. Sharing schemas in `core` enables frontend
client-side validation (no drift). `.strict()` catches typos and prevents
silent data loss. The body size limit prevents DoS via large request bodies.