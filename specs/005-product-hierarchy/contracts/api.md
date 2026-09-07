# API Contracts: Product hierarchy

All routes under `/api/v1/`, `verifySession`-authenticated, strict Zod query/
body schemas (unknown fields rejected), errors `{code, message, details?}`.
GETs are side-effect-free. Mutations require `EDITOR` (viewer → `403
FORBIDDEN`) and write `entity_changes`/`edge_changes` in the same transaction.

## Products

### `GET /products`
Query: `q?`, `type?`, `lifecycle?` (default excludes `RETIRED`), `includeRetired?: boolean`.
Response `200`:
```json
{
  "products": [{ "id", "name", "slug", "type", "lifecycle",
                 "lobOwner": {"id","name"} | null,
                 "teamOwner": {"id","name"} | null }],
  "edges": [{ "parentId", "childId" }]
}
```

### `POST /products`
Body (strict): `{ name, slug?, type, description?, lobOwnerId?, teamOwnerId? }`
— slug auto-derived from `name` when omitted.
→ `201 { product }` | `400 VALIDATION_FAILED` | `409 SLUG_TAKEN`

### `GET /products/:slug`
→ `200`:
```json
{
  "product": { "id","name","slug","description","type","lifecycle",
               "lobOwner","teamOwner" },
  "composedBy":  [ { "id","name","slug","type" } ],        // parents
  "composes":    [ { "id","name","slug","type" } ],        // children
  "consumesFrom":[ { "id","name","slug","type" } ],        // platforms
  "consumedBy":  [ { "id","name","slug","type" } ],        // consumers (PLATFORM only)
  "components": {
    "declared":  [ { "id","name","slug","category","lifecycle" } ],
    "inherited": [ { "id","name","slug","category","lifecycle",
                     "via": { "id","name","slug" } } ]
  },
  "instances": {
    "declared":  [ { "id","componentName","environment","status","region" } ],
    "inherited": [ { "id","componentName","environment","status","region",
                     "via": { "id","name","slug" } } ]
  },
  "counts": { "composedBy","composes","components","instances" }
}
```
→ `404 NOT_FOUND`

### `PATCH /products/:id`
Body: partial `{ name?, slug?, description?, type?, lifecycle?, lobOwnerId?, teamOwnerId? }`
→ `200 { product }` | `404` | `409 SLUG_TAKEN` | `409 TYPE_CHANGE_BLOCKED`
(`details.edges: [{edgeType, otherId, otherName}]`)

### `DELETE /products/:id`
→ `204` | `404` | `409 REFERENCED` (`details.counts: {composes, composedBy, consumesFrom, consumedBy, dependsOn}`)

## Product edges

All edge mutations: body `{ <counterpart>Id: uuid }` for adds; path `:id` for
removes. → `204` on success; `404` unknown entity; `422 INVALID_EDGE_TYPE`
(`details.rule`); `409 CYCLE` (`code: CYCLE_DETECTED`, `details.path`).

| Endpoint | Edge |
|---|---|
| `POST /products/:id/composes` `{ childId }` | parent=`:id`, child=`childId` |
| `DELETE /products/:id/composes/:childId` | remove COMPOSES |
| `POST /products/:id/consumes-from` `{ platformId }` | consumer=`:id`, platform=`platformId` (must be PLATFORM) |
| `DELETE /products/:id/consumes-from/:platformId` | remove CONSUMES_FROM |
| `POST /products/:id/depends-on` `{ componentId }` | product=`:id` depends on component |
| `DELETE /products/:id/depends-on/:componentId` | remove DEPENDS_ON_COMPONENT |

## Organization

### `GET /lobs`, `POST /lobs`, `PATCH /lobs/:id`, `DELETE /lobs/:id`
### `GET /teams`, `POST /teams`, `PATCH /teams/:id`, `DELETE /teams/:id`
### `GET /teams/:id/members` → `{ members: [{ id, displayName, username, slug }] }`

Bodies (strict): `{ name, slug?, description? }`. Responses mirror the
component-groups conventions (`{ lobs: [...] }`, `{ teams: [...] }`).
`DELETE` → `204` | `409 REFERENCED` (`details.counts: { products, groups,
components, members? }`).

## Search (modified)

`GET /search?q=` result groups gain `lobs` and `teams` arrays with
`{ id, name, slug, href }` (`/lobs`, `/teams`); `components`/`products`/
`groups`/`importerConfigs` unchanged.
