# API Contract: Component Catalog and Groups

## Component Catalog

### List Components

`GET /api/v1/components`

Query params:
- `page` (number, default 1)
- `pageSize` (number, default 50, max 100)
- `category` (comma-separated)
- `provider` (comma-separated)
- `lifecycle` (comma-separated, default `ACTIVE`)
- `status` (comma-separated, e.g., `RUNNING,STOPPED`)
- `group` (comma-separated component group slugs or `none`)
- `search` (string, prefix on name/slug or exact on externalId)
- `sort` (`name` | `lastSeenAt` | `createdAt`, default `name`)
- `order` (`asc` | `desc`, default `asc`)

Multi-value semantics: OR within each dimension, AND across dimensions.

Response `200`:
```json
{
  "components": [
    {
      "id": "...",
      "name": "...",
      "slug": "...",
      "category": "...",
      "provider": "...",
      "resourceType": "...",
      "lifecycle": "...",
      "componentGroupId": "...",
      "componentGroupName": "...",
      "instanceCount": 3
    }
  ],
  "total": 1000,
  "page": 1,
  "pageSize": 50
}
```

### Get Component Detail

`GET /api/v1/components/:id`

Response `200`:
```json
{
  "id": "...",
  "name": "...",
  "slug": "...",
  "category": "...",
  "provider": "...",
  "resourceType": "...",
  "lifecycle": "...",
  "details": {},
  "componentGroupId": "...",
  "componentGroupName": "...",
  "instances": [
    { "id": "...", "environment": "PRODUCTION", "status": "RUNNING", "externalId": "...", "lastSeenAt": "..." }
  ]
}
```

## Component Groups

### List Groups

`GET /api/v1/component-groups`

Query params:
- `lifecycle` (default `ACTIVE`)

Response `200`:
```json
{
  "groups": [
    { "id": "...", "name": "...", "slug": "...", "description": "...", "owner": "...", "lifecycle": "..." }
  ]
}
```

### Create Group

`POST /api/v1/component-groups` (editor/admin)

Body:
```json
{ "name": "...", "slug": "...", "description": "...", "owner": "..." }
```

Response `201`.

### Update Group

`PATCH /api/v1/component-groups/:id` (editor/admin)

Body: partial of `name`, `description`, `owner`, `lifecycle`.

### Delete Group

`DELETE /api/v1/component-groups/:id` (editor/admin)

### Assign Component to Group

`PATCH /api/v1/components/:id` (editor/admin)

Body:
```json
{ "componentGroupId": "..." }
```

`null` to unassign.

## Errors

- `400 VALIDATION_FAILED` for invalid filter or group input.
- `403 AUTH_FORBIDDEN` for viewers attempting writes.
- `404 NOT_FOUND` for unknown component or group.
- `409 CONFLICT` for duplicate `ComponentGroup.slug`.
