### ADR-023 — Importer credentials: external secret stores

> **Status:** Ratified

**Context**: Importers need credentials to access GitHub/AWS/etc. The app
should not be a secret store.

**Decision**: **Credentials resolved from external secret stores via a
`SecretResolver` interface.** v1 ships `env` (read from process env) and
`file` (read from a mounted file) resolvers. Vault/AWS Secrets Manager
resolvers are easy adds later. No secrets at rest in the app DB.

**Rationale**: The app is already a secret store for importer credentials —
adding a parallel user-credential store and session lifecycle doubles the
security surface. Pushing the burden to the deployer's existing secret infra
keeps the OSS artifact out of the business of being a KMS. Consistent with the
"deployer brings infra" posture.