### ADR-076 — App settings storage

> **Status:** Ratified

**Context**: [ADR-075](./ADR-075-self-registration.md) introduced `allowSelfRegistration`. Other app-wide
settings are coming (session timeouts, etc.).

**Decision**: **Env vars for infra/secret-adjacent settings + DB `app_settings`
(key-value, JSONB values) for operational/UI-toggled settings.**
`SettingsService.get(key)` unifies both (checks env var first, falls back to
DB, with typed defaults). Env vars: `IMPORTER_MAX_CONCURRENCY` ([ADR-061](./ADR-061-importer-queue-concurrency.md)),
`OIDC_ISSUER`/`OIDC_CLIENT_ID` ([ADR-073](./ADR-073-oidc-configuration.md)), `BOOTSTRAP_ADMIN_*` ([ADR-066](./ADR-066-bootstrap-admin.md)). DB
`app_settings`: `allow_self_registration` ([ADR-075](./ADR-075-self-registration.md)),
`session_idle_timeout`/`session_absolute_timeout`, `default_user_role`. The
`oidc_config` table ([ADR-073](./ADR-073-oidc-configuration.md)) stays separate (structured config, not key-
value).

**Rationale**: Infra settings (restart-required anyway) are env vars;
operational settings (changeable at runtime by an Admin) are DB + UI. The
split is principled by category. Key-value DB table avoids the migration-per-
setting tax. `SettingsService` abstracts both sources into a unified API.