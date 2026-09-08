# Data Model: Audit & Settings (006)

Changes are additive. Existing tables, triggers (append-only per ADR-100), and
CHECK constraints are untouched except where noted.

## Migration `007_audit_read_surface`

### `entity_changes` (altered)

| Column | Change |
|---|---|
| `entityId` | `uuid` → **nullable** (auth events have no entity; R2) |
| `importRunId` | **new** `uuid NULL` → `import_runs.id` `ON DELETE SET NULL` (R1) |

New indexes:

- `entity_changes_created_at_idx` on `(createdAt DESC)`
- `entity_changes_entity_idx` on `(entityType, entityId)`
- `entity_changes_import_run_idx` on `(importRunId)` where not null
- `edge_changes_created_at_idx` on `(createdAt DESC)`

`createdBy` stays `uuid NULL → persons.id ON DELETE SET NULL` (ADR-100 GDPR
snapshot semantics). `createdByName` remains the display snapshot; for
importer-driven rows it stores `importer:<name>` (R1).

### Unchanged tables

- `edge_changes` — schema unchanged; gains the `createdAt` index only.
- `import_run_errors`, `import_runs`, `app_settings`, `oidc_config`,
  `sessions` — unchanged.

## Core contract types (`packages/core`)

```text
AuditAction (constants)        // 'created' | 'updated' | 'retired' |
                               // 'status_change' | 'discovered' |
                               // 'correction' | 'login' | 'login_failed' |
                               // 'logout' | 'password_change' | 'revoked' |
                               // 'settings_change' | edge: 'added'|'removed'
AuditEntityType (constants)    // existing entity types + 'auth' | 'session' |
                               // 'importer_config' | 'settings' | 'user'

EntityChange  (existing)       // + importRunId?: string | null
                               //   entityId: string | null  (nullable)
EdgeChange    (existing)       // unchanged

ActivityFeedItem               // discriminated union:
  | ({ kind: 'entity' } & EntityChange)
  | ({ kind: 'edge' } & EdgeChange)

ActivityFeedQuery              // zod schema — filters for GET /audit/activity:
  entityType?: string; action?: string; actor?: string;   // name or person id
  kind?: 'entity'|'edge'; from?: datetime; to?: datetime;
  limit?: int (default 50, max 200); offset?: int (default 0)

EntityHistoryQuery             // same filters minus entityType/entityId
                               // (path params); kind filter still allowed

CorrectionInput                // zod schema: { entryId: uuid,
                               //   entryKind: 'entity'|'edge', note: string(1..2000) }

RunChangesResponse             // { run: ImportRun, changes: EntityChange[],
                               //   errors: ImportRunError[] }
```

Settings validation bounds (ADR-095): `sessionIdleTimeoutMs` ∈ [60_000,
86_400_000], `sessionAbsoluteTimeoutMs` ∈ [300_000, 604_800_000],
`sessionIdleTimeoutMs < sessionAbsoluteTimeoutMs` enforced in
`updateSettingsSchema` (rejected values return `VALIDATION_FAILED` and leave
prior values intact — spec edge case).

## Write-path rules

| Triggering mutation | Record | Actor |
|---|---|---|
| Component/instance curation edit (PATCH) | `entity_changes` | person |
| Component-group create/update/delete | `entity_changes` | person |
| Importer config create/update/delete | `entity_changes` (`importer_config`) | person |
| User create/role change/deactivate/password-reset issuance | `entity_changes` (`user`) | admin person |
| Settings update (app or OIDC) | `entity_changes` (`settings`), `changes` = keys + new values, **secrets masked** | admin person |
| Session revocation (self or admin) | `entity_changes` (`session`) | person |
| Login / failed login / logout / password change | `entity_changes` (`auth`, `entityId=null`) | person or attempted identity |
| Importer transition (discovered, lifecycle/status flip) | `entity_changes` + `importRunId` | `createdByName='importer:<name>'`, `createdBy=null` |
| Edge add/remove (existing) | `edge_changes` | person |
| Correction (admin) | `entity_changes`/`edge_changes`, `action='correction'`, `changes={corrects,note}` | admin person |

All writes happen **inside the same transaction** as the domain mutation
(FR-010) — existing writers already accept `trx`; new call sites must do the
same.
