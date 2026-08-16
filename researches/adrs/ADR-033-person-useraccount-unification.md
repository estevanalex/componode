### ADR-033 — Person/UserAccount unification

**Context**: [ADR-020](./ADR-020-ownership-lineofbusiness-team-person.md) defines `Person BELONGS_TO Team` (ownership graph);
[ADR-027](./ADR-027-authentication-built-in-local-optional-oidc.md) defines `UserAccount` (auth principal). Two names for what may be one
concept.

**Decision**: **Unified — `Person` IS `UserAccount`.** One entity with nullable
auth columns (`passwordHash` for local-auth users, `oidcSubject` for OIDC
users). A person may own things without ever logging in (nullable auth); a
person who logs in has auth columns set. The Backstage `User` model.

**Rationale**: Single-org removes multi-tenant pressure forcing separation.
Ownership and login are two roles of one human. Nullable auth handles "owns
something but doesn't log in." A separate `UserAccount` adds a join to every
ownership query for no benefit.