# Quickstart: 003-component-catalog

## Goal

Validate the component catalog, group management, and remaining importers end-to-end.

## Prerequisites

- `pnpm install` completed.
- PostgreSQL running and `DATABASE_URL` set.
- 002 migrations and seed applied.

## Steps

1. **Start the backend**:
   ```bash
   pnpm --filter @componode/backend dev
   ```

2. **Run migrations**:
   ```bash
   pnpm --filter @componode/backend migrate
   ```

3. **Trigger an existing GitHub importer (002)** so the catalog has components:
   ```bash
   pnpm --filter @componode/backend exec vitest run --config vitest.integration.config.ts test/integration/importer-github.test.ts
   ```
   Or use `curl` against a running server.

4. **List components**:
   ```bash
   curl -b cookies.txt "http://localhost:3000/api/v1/components?page=1&pageSize=50"
   ```

5. **Search by prefix**:
   ```bash
   curl -b cookies.txt "http://localhost:3000/api/v1/components?search=repo"
   ```

6. **Filter by category and provider**:
   ```bash
   curl -b cookies.txt "http://localhost:3000/api/v1/components?category=REPOSITORY&provider=GITHUB"
   ```

7. **View a component detail**:
   ```bash
   curl -b cookies.txt "http://localhost:3000/api/v1/components/<id>"
   ```

8. **Create a ComponentGroup**:
   ```bash
   curl -b cookies.txt -X POST -H "Content-Type: application/json" -d '{"name":"My Group","slug":"my-group","description":"...","owner":"<user-id>"}' "http://localhost:3000/api/v1/component-groups"
   ```

9. **Assign a component to the group**:
   ```bash
   curl -b cookies.txt -X PATCH -H "Content-Type: application/json" -d '{"componentGroupId":"<group-id>"}' "http://localhost:3000/api/v1/components/<id>"
   ```

10. **Run the AWS importer integration test**:
    ```bash
    pnpm --filter @componode/backend exec vitest run --config vitest.integration.config.ts test/integration/importer-aws.test.ts
    ```

11. **Open the frontend** at `http://localhost:5173/components` and verify list, filters, search, detail, and group UI.

## Expected Outcomes

- `GET /api/v1/components` returns `200` with paginated `components`.
- Search returns results matching prefix on `name`/`slug` or exact on `externalId`.
- Group creation and assignment persist and are reflected in the catalog.
- New importer tests pass, populating `components`/`component_instances`.
