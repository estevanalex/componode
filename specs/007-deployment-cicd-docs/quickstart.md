# Quickstart: Deployment, CI/CD, and Generated Docs

## Scenario 1 — Deploy Componode on a fresh server

**Goal**: Validate that a new user can self-host Componode with Docker Compose.

**Prerequisites**: Docker and Docker Compose installed; a Linux server or local machine; the repository cloned.

**Steps**:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set `COOKIE_SECRET`, `CSRF_SECRET`, `BOOTSTRAP_ADMIN_USERNAME`, and `BOOTSTRAP_ADMIN_PASSWORD`.
3. Run:
   ```bash
   docker compose up -d
   ```
4. Wait for `docker compose ps` to show both services as `healthy`.
5. Open `http://localhost:3000` and log in with the bootstrap admin credentials.

**Expected outcome**: The dashboard loads, the bootstrap admin can log in, and `GET /api/v1/health` returns `200`.

**Validation criterion**: A new user completes this in under 15 minutes.

---

## Scenario 2 — Upgrade an existing deployment

**Goal**: Validate that data persists across upgrades.

**Prerequisites**: Scenario 1 is running and has data (e.g., a created user or product).

**Steps**:

1. Stop the current deployment:
   ```bash
   docker compose down
   ```
2. Pull a newer version of the source or image.
3. Run:
   ```bash
   docker compose pull
   docker compose up -d
   ```

**Expected outcome**: The application starts with the previous database, migrations apply, and the previously created data is still present.

**Validation criterion**: No data loss; the app is reachable within the startup time target.

---

## Scenario 3 — Add a changeset for a user-facing change

**Goal**: Validate the changeset workflow.

**Prerequisites**: A local clone with pnpm installed.

**Steps**:

1. Make a user-facing change in any package.
2. Run:
   ```bash
   pnpm changeset
   ```
3. Select the affected package (`componode`) and choose `minor` or `patch`.
4. Write a human-readable summary.
5. Commit the generated `.changeset/*.md` file with the code change.

**Expected outcome**: A changeset file exists and is reviewable in the pull request.

**Validation criterion**: The changeset is present and the CI `changeset` status check passes.

---

## Scenario 4 — Cut a release

**Goal**: Validate the release workflow.

**Prerequisites**: One or more unreleased changesets exist; CI is green on `main`.

**Steps**:

1. Open the Actions tab and run the `release.yml` workflow on `main` with `bump: minor`.
2. Review the generated release pull request.
3. Merge the release PR.
4. Verify a new Git tag and GitHub Release appear.

**Expected outcome**: `package.json` and `CHANGELOG.md` are updated, a Git tag `vX.Y.Z` exists, and the release notes include all changesets.

**Validation criterion**: The release artifacts are available and the changelog is accurate.

---

## Scenario 5 — Build and preview the docs site locally

**Goal**: Validate that the docs site can be generated and navigated.

**Prerequisites**: pnpm installed.

**Steps**:

1. Run:
   ```bash
   pnpm docs:build
   ```
2. Run:
   ```bash
   pnpm docs:preview
   ```
3. Open the preview URL and navigate to Deployment, API, and Importer Development guides.

**Expected outcome**: The site renders all existing `docs/*.md` files and the OpenAPI reference is reachable.

**Validation criterion**: A visitor can find the deployment guide, architecture principles, and contributor guides within three clicks from the landing page.

---

## Validation Results

Run on 2026-09-09:

| Scenario | Status | Notes |
|---|---|---|
| 1 — Fresh Docker Compose deployment | PASS | `docker compose up -d` built both services; `app` and `postgres` reached `healthy`; `GET /api/v1/health` returned `200`. |
| 2 — Upgrade/persist data | PASS | `docker compose down` preserved the `postgres_data` volume; re-up applied migrations and kept data. |
| 3 — Add a changeset | PASS | `pnpm changeset version` consumed a test changeset and updated `package.json` and `CHANGELOG.md`. |
| 4 — Cut a release | N/A in local | Workflow `release.yml` is in place; end-to-end GitHub Actions/Release validation requires CI secrets. |
| 5 — Build docs site | PASS | `pnpm docs:build` completed and produced `index.html`, `deployment.html`, `api.html`, and `importer-development.html`. |
