# Data Model: 003-component-catalog

## Component (extended)

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, UUID v7 |
| name | text | Imported or curated |
| slug | text | Unique, human-readable |
| category | text | CHECK from 24 ADR-013 values |
| provider | text | GITHUB, AWS, AZURE, KUBERNETES, WEB_URL, API_URL, MCP_SERVER, OTHER |
| resourceType | text | Provider-native type |
| externalId | text | Stable source identifier |
| details | jsonb | Provider-specific metadata |
| lifecycle | text | ACTIVE / RETIRED |
| componentGroupId | uuid | FK → component_groups.id, nullable |
| lastSeenAt | timestamptz | From 002 |
| lastSeenInRunId | uuid | From 002 |

### Indexes

- `components_name_idx` for prefix search.
- `components_slug_idx` for prefix search.
- `components_external_id_idx` for exact search.
- `components_component_group_id_idx` for group filtering.
- `components_category_provider_lifecycle_idx` for faceted filtering.

## ComponentInstance (existing)

No changes from 002.

## ComponentGroup (new)

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK, UUID v7 |
| name | text | Display name |
| slug | text | Unique, URL-safe |
| description | text | Nullable |
| owner | uuid | FK → persons.id |
| lifecycle | text | ACTIVE / RETIRED |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### Relationships

- `Component.componentGroupId` → `ComponentGroup.id` (many-to-one).
- `ComponentGroup.owner` → `Person.id`.

## Catalog Query Model

- List components with optional `WHERE` clauses:
  - `category IN (...)`, `provider IN (...)`, `lifecycle IN (...)`
  - `componentGroupId IN (...)` or `IS NULL`
  - `status` from instances (requires join to `component_instances` or subquery)
  - `name ILIKE 'prefix%'` or `slug ILIKE 'prefix%'` or `externalId ILIKE 'value'`
- `ORDER BY name ASC` default.
- `LIMIT 50 OFFSET (page - 1) * 50`.
