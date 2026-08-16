# Data Model: Foundation

**Feature**: 001-foundation
**Date**: 2026-08-16
**Source ADRs**: ADR-077 (consolidated schema), ADR-033 (Person/UserAccount),
ADR-043 (sessions), ADR-073 (OIDC config), ADR-076 (app settings),
ADR-099 (session ID crypto-random, password reset tokens),
ADR-100 (audit append-only, denormalized names, ON DELETE SET NULL),
ADR-078 (CHECK constraints from core constants),
ADR-079 (enum constant structure)

This document defines the 28-table v1 schema. Tables are grouped by
domain. All primary keys are UUID v7 (native Postgres `uuid`) unless
noted otherwise. All enums are CHECK constraints generated from
`packages/core` constants (not native Postgres ENUMs).

---

## Auth & User Management

### `persons`

Unified Person/UserAccount entity (ADR-033). A person may own things
without ever logging in (nullable auth columns).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `username` | `text` | UNIQUE, NOT NULL | Lowercase, 3-50 chars |
| `passwordHash` | `text` | nullable | Argon2id PHC string (local auth) |
| `oidcSubject` | `text` | nullable, UNIQUE | OIDC `sub` claim (OIDC auth) |
| `role` | `text` | NOT NULL, CHECK in (`ADMIN`, `EDITOR`, `VIEWER`) | Default `VIEWER` |
| `displayName` | `text` | nullable | Human-readable name |
| `email` | `text` | nullable | Not required for local auth |
| `teamId` | `uuid` | nullable, FK → `teams.id` ON DELETE SET NULL | Team membership |
| `slug` | `text` | UNIQUE, NOT NULL | URL-safe identifier |
| `isActive` | `boolean` | NOT NULL, default `true` | Soft-disable (not delete) |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes**: `idx_persons_username` (unique), `idx_persons_oidc_subject`
(unique), `idx_persons_team_id`, `idx_persons_slug` (unique)

---

### `sessions`

Server-side session storage (ADR-043). Session ID is a 32-byte
cryptographically random token (ADR-099 exception to UUID v7).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `text` | PK | 32-byte base64url crypto-random token |
| `userId` | `uuid` | NOT NULL, FK → `persons.id` ON DELETE CASCADE | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `lastSeenAt` | `timestamptz` | NOT NULL, default `now()` | Write-throttled (60s) |
| `expiresAt` | `timestamptz` | NOT NULL | `createdAt + 12h` absolute timeout |
| `revokedAt` | `timestamptz` | nullable | Set on logout/revoke |

**Indexes**: `idx_sessions_user_id`, `idx_sessions_expires_at`

**Validation**: Session is valid if `revokedAt IS NULL AND now() <
expiresAt`. Idle timeout (4h) checked via `lastSeenAt` at the
application layer.

---

### `password_reset_tokens`

Password reset tokens (ADR-099). Token is stored as SHA-256 hash, not
plaintext.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `userId` | `uuid` | NOT NULL, FK → `persons.id` ON DELETE CASCADE | |
| `tokenHash` | `text` | NOT NULL | SHA-256 of 32-byte base64url token |
| `expiresAt` | `timestamptz` | NOT NULL | `createdAt + 15min` |
| `usedAt` | `timestamptz` | nullable | Set when token is consumed |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes**: `idx_password_reset_tokens_token_hash` (unique),
`idx_password_reset_tokens_user_id`

---

### `oidc_config`

OIDC provider configuration (ADR-073). Single-row table (enforced by
a CHECK constraint limiting `id` to 1).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `int` | PK, CHECK = 1 | Single-row enforcement |
| `enabled` | `boolean` | NOT NULL, default `false` | OIDC on/off |
| `issuer` | `text` | nullable | IdP discovery URL |
| `clientId` | `text` | nullable | OIDC client ID |
| `clientSecretRef` | `text` | nullable | SecretResolver reference |
| `roleClaimPath` | `text` | nullable | JSONPath to role claim in ID token |
| `claimValueField` | `text` | nullable | Field name for claim value |
| `roleMapping` | `jsonb` | nullable | `{"admin-group": "ADMIN", "default": "VIEWER"}` |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `app_settings`

Key-value application settings (ADR-076). JSONB values for flexibility.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `key` | `text` | PK | Setting key (e.g. `allow_self_registration`) |
| `value` | `jsonb` | NOT NULL | Typed value (boolean, number, string) |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

**Known keys (v1)**:
- `allow_self_registration` (boolean, default `false`)
- `session_idle_timeout` (number, default `1440000` = 4h in ms)
- `session_absolute_timeout` (number, default `43200000` = 12h in ms)
- `default_user_role` (string, default `VIEWER`)

---

## Domain Entities (schema only, populated by 003/004)

### `digital_products`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `name` | `text` | NOT NULL | Max 255 chars |
| `slug` | `text` | UNIQUE, NOT NULL | Max 100 chars |
| `description` | `text` | nullable | Max 2000 chars |
| `type` | `text` | NOT NULL, CHECK in (`BUSINESS_CAPABILITY`, `PLATFORM`, `CUSTOMER_FACING`) | |
| `lifecycle` | `text` | NOT NULL, default `ACTIVE`, CHECK in (`ACTIVE`, `RETIRED`) | |
| `lobOwnerId` | `uuid` | nullable, FK → `line_of_businesses.id` ON DELETE SET NULL | |
| `teamOwnerId` | `uuid` | nullable, FK → `teams.id` ON DELETE SET NULL | |
| `createdBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `updatedBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes**: `idx_digital_products_slug` (unique),
`idx_digital_products_lob_owner_id`, `idx_digital_products_team_owner_id`

---

### `components`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `name` | `text` | NOT NULL | Max 255 chars |
| `slug` | `text` | UNIQUE, NOT NULL | Max 100 chars |
| `category` | `text` | NOT NULL, CHECK from `COMPONENT_CATEGORIES` | 24 values |
| `provider` | `text` | NOT NULL, CHECK from `COMPONENT_PROVIDERS` | With `OTHER` escape hatch |
| `resourceType` | `text` | NOT NULL | Free-form, max 100 chars |
| `lifecycle` | `text` | NOT NULL, default `ACTIVE`, CHECK in (`ACTIVE`, `RETIRED`) | |
| `teamOwnerId` | `uuid` | nullable, FK → `teams.id` ON DELETE SET NULL | |
| `componentGroupId` | `uuid` | nullable, FK → `component_groups.id` ON DELETE SET NULL | |
| `externalId` | `text` | nullable | Source-system ID |
| `details` | `jsonb` | nullable | Arbitrary importer data (untrusted) |
| `createdBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `updatedBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes**: `idx_components_slug` (unique),
`idx_components_category`, `idx_components_provider`,
`idx_components_team_owner_id`, `idx_components_component_group_id`,
`idx_components_external_id`

---

### `component_instances`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `componentId` | `uuid` | NOT NULL, FK → `components.id` ON DELETE CASCADE | |
| `environment` | `text` | NOT NULL, CHECK from `ENVIRONMENTS` | `DEV`/`TEST`/`STAGING`/`DEMO`/`PRODUCTION`/`OTHER` |
| `url` | `text` | nullable | |
| `region` | `text` | nullable | |
| `status` | `text` | NOT NULL, default `RUNNING`, CHECK from `INSTANCE_STATUS` | `RUNNING`/`STOPPED`/`ERROR`/`GONE` |
| `version` | `text` | nullable | |
| `deployedAt` | `timestamptz` | nullable | |
| `rawConfig` | `jsonb` | nullable | Arbitrary importer data (untrusted) |
| `externalId` | `text` | nullable | Source-system instance ID |
| `createdBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `updatedBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

**Indexes**: `idx_component_instances_component_id`,
`idx_component_instances_environment`,
`idx_component_instances_external_id`

**Unique constraint**: `(componentId, environment, externalId)` — the
upsert key (ADR-034)

---

### `component_groups`

Human-declared equivalence across distinct source assets (ADR-082).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `name` | `text` | NOT NULL | Max 255 chars |
| `slug` | `text` | UNIQUE, NOT NULL | Max 100 chars |
| `description` | `text` | nullable | Max 2000 chars |
| `teamOwnerId` | `uuid` | nullable, FK → `teams.id` ON DELETE SET NULL | |
| `createdBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `updatedBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `line_of_businesses`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `name` | `text` | NOT NULL | Max 255 chars |
| `slug` | `text` | UNIQUE, NOT NULL | Max 100 chars |
| `description` | `text` | nullable | Max 2000 chars |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `teams`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `name` | `text` | NOT NULL | Max 255 chars |
| `slug` | `text` | UNIQUE, NOT NULL | Max 100 chars |
| `description` | `text` | nullable | Max 2000 chars |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

---

## Junction Tables (graph edges, ADR-048)

### `product_composes`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `parentId` | `uuid` | PK, FK → `digital_products.id` ON DELETE CASCADE | |
| `childId` | `uuid` | PK, FK → `digital_products.id` ON DELETE CASCADE | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

**Cycle detection**: `BEFORE INSERT` trigger (ADR-050) raises exception
if the edge creates a cycle.

---

### `product_consumes_from`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `consumerId` | `uuid` | PK, FK → `digital_products.id` ON DELETE CASCADE | |
| `platformId` | `uuid` | PK, FK → `digital_products.id` ON DELETE CASCADE | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `product_depends_on_component`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `productId` | `uuid` | PK, FK → `digital_products.id` ON DELETE CASCADE | |
| `componentId` | `uuid` | PK, FK → `components.id` ON DELETE CASCADE | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `component_depends_on_component`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `parentId` | `uuid` | PK, FK → `components.id` ON DELETE CASCADE | |
| `childId` | `uuid` | PK, FK → `components.id` ON DELETE CASCADE | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `component_sources_from`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `serviceId` | `uuid` | PK, FK → `components.id` ON DELETE CASCADE | |
| `repositoryId` | `uuid` | PK, FK → `components.id` ON DELETE CASCADE | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `component_exposes`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `serviceId` | `uuid` | PK, FK → `components.id` ON DELETE CASCADE | |
| `apiId` | `uuid` | PK, FK → `components.id` ON DELETE CASCADE | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

---

## Importer Framework (schema only, populated by 002/003)

### `importer_configs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `importerName` | `text` | NOT NULL | e.g. `importer-github` |
| `label` | `text` | NOT NULL | User-friendly config label |
| `config` | `jsonb` | NOT NULL | Importer-specific config |
| `secretRefs` | `jsonb` | nullable | `{"token": "env:GITHUB_TOKEN"}` |
| `scope` | `jsonb` | nullable | Importer-specific scope |
| `schedule` | `text` | nullable | Cron expression |
| `enabled` | `boolean` | NOT NULL, default `true` | |
| `createdBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `updatedBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `import_runs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `configId` | `uuid` | NOT NULL, FK → `importer_configs.id` ON DELETE CASCADE | |
| `status` | `text` | NOT NULL, default `PENDING`, CHECK from `IMPORT_RUN_STATUS` | `PENDING`/`RUNNING`/`COMPLETED`/`FAILED`/`CANCELLED`/`INTERRUPTED` |
| `triggeredBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | Null for scheduled runs |
| `startedAt` | `timestamptz` | nullable | |
| `completedAt` | `timestamptz` | nullable | |
| `assetsProcessed` | `integer` | NOT NULL, default `0` | |
| `assetsCreated` | `integer` | NOT NULL, default `0` | |
| `assetsUpdated` | `integer` | NOT NULL, default `0` | |
| `instancesOrphaned` | `integer` | NOT NULL, default `0` | |
| `componentsRetired` | `integer` | NOT NULL, default `0` | |
| `errorMessage` | `text` | nullable | |
| `errorStack` | `text` | nullable | |
| `errorType` | `text` | nullable | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

**Trigger**: `BEFORE UPDATE` raises if `OLD.status` is terminal
(`COMPLETED`/`FAILED`/`CANCELLED`/`INTERRUPTED`) — ADR-100.

---

### `import_run_errors`

Append-only (ADR-100). `BEFORE UPDATE OR DELETE` trigger raises
unconditionally.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `runId` | `uuid` | NOT NULL, FK → `import_runs.id` ON DELETE CASCADE | |
| `assetExternalId` | `text` | nullable | The asset that errored |
| `errorType` | `text` | NOT NULL | |
| `errorMessage` | `text` | NOT NULL | |
| `errorStack` | `text` | nullable | |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

---

## Audit (ADR-052, ADR-100)

### `entity_changes`

Append-only. `BEFORE UPDATE OR DELETE` trigger raises unconditionally.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `entityType` | `text` | NOT NULL | `COMPONENT`/`DIGITAL_PRODUCT`/etc. |
| `entityId` | `uuid` | NOT NULL | |
| `action` | `text` | NOT NULL | `CREATED`/`UPDATED`/`RETIRED`/`DELETED`/`CORRECTION` |
| `changes` | `jsonb` | nullable | Diff of changed fields |
| `createdBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | Null for importer-driven |
| `createdByName` | `text` | nullable | Denormalized snapshot (ADR-100) |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

---

### `edge_changes`

Append-only. `BEFORE UPDATE OR DELETE` trigger raises unconditionally.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | UUID v7 |
| `edgeType` | `text` | NOT NULL | `COMPOSES`/`CONSUMES_FROM`/etc. |
| `fromEntityType` | `text` | NOT NULL | |
| `fromEntityId` | `uuid` | NOT NULL | |
| `toEntityType` | `text` | NOT NULL | |
| `toEntityId` | `uuid` | NOT NULL | |
| `action` | `text` | NOT NULL | `ADDED`/`REMOVED` |
| `reason` | `text` | nullable | Optional human note |
| `createdBy` | `uuid` | nullable, FK → `persons.id` ON DELETE SET NULL | |
| `createdByName` | `text` | nullable | Denormalized snapshot (ADR-100) |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` | |

---

## Kysely Migration Tables

### `kysely_migration`

Managed by Kysely's built-in migration system (ADR-009).

| Column | Type | Notes |
|---|---|---|
| `name` | `varchar(255)` | PK |
| `timestamp` | `bigint` | |

### `kysely_migration_lock`

| Column | Type | Notes |
|---|---|---|
| `id` | `varchar(255)` | PK, always `migrator_lock` |

---

## Table Count

| # | Table | Domain |
|---|---|---|
| 1 | `persons` | Auth |
| 2 | `sessions` | Auth |
| 3 | `password_reset_tokens` | Auth |
| 4 | `oidc_config` | Auth |
| 5 | `app_settings` | Auth |
| 6 | `digital_products` | Domain |
| 7 | `components` | Domain |
| 8 | `component_instances` | Domain |
| 9 | `component_groups` | Domain |
| 10 | `line_of_businesses` | Domain |
| 11 | `teams` | Domain |
| 12 | `product_composes` | Junction |
| 13 | `product_consumes_from` | Junction |
| 14 | `product_depends_on_component` | Junction |
| 15 | `component_depends_on_component` | Junction |
| 16 | `component_sources_from` | Junction |
| 17 | `component_exposes` | Junction |
| 18 | `importer_configs` | Importer |
| 19 | `import_runs` | Importer |
| 20 | `import_run_errors` | Importer |
| 21 | `entity_changes` | Audit |
| 22 | `edge_changes` | Audit |
| 23 | `kysely_migration` | Kysely |
| 24 | `kysely_migration_lock` | Kysely |

**Note**: ADR-077 originally specified 27 tables + ComponentGroup = 28.
The `password_reset_tokens` table (ADR-099) brings the total to 28.
However, the original count included `oidc_config` and `app_settings` in
the 27. The actual table count is 24 unique tables listed above. The
discrepancy is because ADR-077's "27 tables" included some junction
tables that were counted differently. The canonical list is the 24
tables above — all required for v1.

---

## Enum Constants (in `packages/core`)

All enums are `const` arrays + union types + `*_META` maps (ADR-079).

| Constant | Values | Used by |
|---|---|---|
| `COMPONENT_CATEGORIES` | 24 values (COMPUTE, STORAGE, ...) | `components.category` CHECK |
| `COMPONENT_PROVIDERS` | values + `OTHER` | `components.provider` CHECK |
| `ENVIRONMENTS` | DEV, TEST, STAGING, DEMO, PRODUCTION, OTHER | `component_instances.environment` CHECK |
| `COMPONENT_LIFECYCLE` | ACTIVE, RETIRED | `components.lifecycle`, `digital_products.lifecycle` CHECK |
| `INSTANCE_STATUS` | RUNNING, STOPPED, ERROR, GONE | `component_instances.status` CHECK |
| `PRODUCT_TYPES` | BUSINESS_CAPABILITY, PLATFORM, CUSTOMER_FACING | `digital_products.type` CHECK |
| `RELATIONSHIP_TYPES` | COMPOSES, CONSUMES_FROM, DEPENDS_ON, SOURCES_FROM, EXPOSES, HAS_INSTANCE, OWNS, BELONGS_TO | Audit `edge_changes.edgeType` |
| `ROLES` | ADMIN, EDITOR, VIEWER | `persons.role` CHECK |
| `IMPORT_RUN_STATUS` | PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, INTERRUPTED | `import_runs.status` CHECK |
| `ERROR_CODES` | AUTH_INVALID_CREDENTIALS, AUTH_RATE_LIMITED, ... | Error response `code` field (ADR-071) |
