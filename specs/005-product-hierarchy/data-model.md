# Data Model: Product hierarchy

**No migrations** — every table already exists (migration `001`).

## Entities

### DigitalProduct (`digital_products`)

| Field | Type | Rules |
|---|---|---|
| id | uuid v7 | PK |
| name | text | required |
| slug | text | required, unique, editable (URL follows; no redirect) |
| description | text | nullable |
| type | text | `BUSINESS_CAPABILITY` \| `PLATFORM` \| `CUSTOMER_FACING`; editable but `TYPE_CHANGE_BLOCKED` if it would invalidate existing edges |
| lifecycle | text | `ACTIVE` \| `RETIRED`; reversible |
| lobOwnerId / teamOwnerId | uuid | nullable FK (`set null` on delete) — delete of owner is blocked while referenced instead |

### Edges (typed junctions, ADR-048)

| Table | Columns | Rules |
|---|---|---|
| `product_composes` | parentId, childId, createdAt | Parent type ∈ {BC, CF}; DAG; insert-time cycle check → `409 CYCLE` |
| `product_consumes_from` | consumerId, platformId, createdAt | `platformId` must be `PLATFORM` → `422` |
| `product_depends_on_component` | productId, componentId, createdAt | Component may be RETIRED (display-only) |

### Org entities

| Table | Notes |
|---|---|
| `line_of_businesses` | id, name, slug (unique), description — flat CRUD |
| `teams` | id, name, slug (unique), description — flat CRUD + read-only roster via `persons.teamId` |
| `persons` | the user table — not managed here |

### Audit (append-only, written in the same transaction)

- `entity_changes`: `entityType`, `entityId`, `action` (created/updated/
  retired/unretired/deleted), `changes` jsonb, `createdBy`, `createdByName`
- `edge_changes`: `edgeType`, `fromEntityType/Id`, `toEntityType/Id`,
  `action` (added/removed), actor fields

## Validation summary

- Slug unique per ADR-046; UUIDs are v7 per ADR-045
- Product delete: zero edges across all three junctions else `409 REFERENCED`
- LOB/Team delete: zero owner references (+ zero members for teams) else
  `409 REFERENCED`
- Edge insert: type rules + cycle check else `422 INVALID_EDGE_TYPE` /
  `409 CYCLE`
- Type update: no existing edge may become illegal else `409
  TYPE_CHANGE_BLOCKED`
- All request bodies: strict Zod, unknown fields rejected (ADR-095)
