### ADR-074 — OIDC claim-to-role mapping

**Context**: Real IdP claims are messy (nested, multi-value, array-of-objects).

**Decision**: **Dot-path `roleClaimPath` + optional `claimValueField` for
array-of-objects; first-match-wins in mapping-definition order; `default` for
no-match.** `roleClaimPath` is a dot-path (e.g.
`"resource_access.componode.roles"`). The mapping logic: (1) traverse the
claims by the dot-path, (2) if array, flatten; if string, treat as single-
element array, (3) if `claimValueField` is set and values are objects,
extract that field, (4) for each value, look up in `roleMapping` — first match
wins, in mapping-definition order, (5) if no match, use `default`.

**Rationale**: Handles 80% of IdPs (Okta `groups`, Keycloak `groups` via a
mapper, Google `groups`) with dot-path alone. The `claimValueField` handles
the remaining 20% (Entra ID app roles as `[{value: "..."}]`, some Keycloak
setups) without a full JSONPath DSL. First-match-wins-in-order handles "user
is in both `admins` and `editors`" (they get `ADMIN` if `admins` is listed
first).