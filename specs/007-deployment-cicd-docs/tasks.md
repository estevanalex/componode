# Tasks: Deployment, CI/CD, and Generated Docs

**Input**: Design documents from `/specs/007-deployment-cicd-docs/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: This feature uses smoke tests and workflow validation. Tests are listed before implementation to satisfy the test-first cycle.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the tooling needed by all three user stories.

- [x] T001 Add `@changesets/cli` as a dev dependency in `package.json` and run `pnpm install` to update `pnpm-lock.yaml`.
- [x] T002 [P] Add `vitepress` as a dev dependency in `package.json` and run `pnpm install` to update `pnpm-lock.yaml`.
- [x] T003 [P] Create `.env.example` at repository root with all required and optional environment variables for `docker-compose.yml`.
- [x] T004 [P] Create `.github/workflows/ci.yml` to run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` on every pull request.
- [x] T005 [P] Add `docs:build`, `docs:preview`, and `version` root package scripts to `package.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Refine the existing deployment artifacts so all user stories have a stable base.

- [x] T006 [P] Update `Dockerfile` to run the application as a non-root user, set least-privilege file permissions, and ensure `dist/server.js` is the entrypoint.
- [x] T007 [P] Update `docker-compose.yml` to reference `.env`, remove hardcoded secrets from the committed file, add an `app` service dependency on the `postgres` `healthy` condition, and ensure every required environment variable is listed in `.env.example`.
- [x] T008 Verify `init-db.sql` creates the `componode` database role and schema with least privilege and does not conflict with Docker Compose `POSTGRES_*` defaults.
- [x] T009 Create `docs/deployment.md` as the canonical human-readable deployment guide, covering `.env` setup, `docker compose up`, first login, and upgrade path.
- [x] T010 [P] Create `docs/release.md` documenting the changeset workflow, how to cut a release, and where release artifacts are published.

**Checkpoint**: Tooling and base deployment files are in place. User stories can now proceed in parallel.

---

## Phase 3: User Story 1 - Self-Host with Docker Compose (Priority: P1) 🎯 MVP

**Goal**: A new user can install and run Componode on their own infrastructure with a single configuration file and one command.

**Independent Test**: Run `scripts/smoke-test.sh` on a fresh clone with Docker installed; it starts the stack and verifies `/api/v1/health` returns `200` within the startup time target.

### Tests for User Story 1

- [x] T011 [P] [US1] Create `scripts/smoke-test.sh` that copies `.env.example` to `.env`, runs `docker compose up -d`, waits for healthy status, and asserts `GET /api/v1/health` returns `200`.
- [x] T012 [P] [US1] Create `packages/backend/test/integration/health.test.ts` (or reuse existing) to verify `/api/v1/health` is reachable inside the container.

### Implementation for User Story 1

- [x] T013 [US1] Ensure `docker-compose.yml` mounts a persistent `postgres_data` volume and does not lose data on `docker compose down`.
- [x] T014 [US1] Update `README.md` with a "Quick Start" section that links to `docs/deployment.md` and shows the single-command deployment.
- [x] T015 [US1] Add a `app` health check in `docker-compose.yml` using `wget --spider -q http://localhost:3000/api/v1/health` and confirm `depends_on` uses `condition: service_healthy`.
- [x] T016 [US1] Validate the smoke test: it should FAIL before the deployment package is fully configured and PASS after.

**Checkpoint**: User Story 1 is independently functional — a new user can deploy Componode and log in.

---

## Phase 4: User Story 2 - Release with Changesets (Priority: P2)

**Goal**: A maintainer can prepare and publish a new Componode version through a structured, changeset-driven release process.

**Independent Test**: Create a test changeset, run the release workflow locally or in CI, and verify a release PR is opened with a version bump and updated `CHANGELOG.md`.

### Tests for User Story 2

- [x] T017 [P] [US2] Create `.changeset/config.json` with `mainBranch: main`, `changelogFilename: CHANGELOG.md`, and `access: public` for the root package.
- [x] T018 [P] [US2] Create `scripts/release-dry-run.sh` that runs `pnpm changeset version` in a clean temp clone and verifies `package.json` and `CHANGELOG.md` are updated correctly.

### Implementation for User Story 2

- [x] T019 [US2] Create `.github/workflows/release.yml` with two jobs: `version` (opens a release PR from `workflow_dispatch` with `bump` input) and `publish` (publishes a GitHub Release, builds and tags a container image, and attaches the image to the release when a version tag is pushed).
- [x] T020 [US2] Add `.changeset/README.md` explaining how contributors add changesets.
- [x] T021 [US2] Update `package.json` version to `1.0.0` (or current baseline) and add a `CHANGELOG.md` with a v1.0.0 entry.
- [x] T022 [US2] Validate the release dry-run: it should FAIL before the workflow is configured and PASS after.

**Checkpoint**: User Story 2 is independently functional — a maintainer can trigger a release and get versioned artifacts.

---

## Phase 5: User Story 3 - Generated Documentation Site (Priority: P3)

**Goal**: A user or contributor can browse an up-to-date documentation site generated from the existing Markdown and OpenAPI sources.

**Independent Test**: Run `pnpm docs:build` and verify the output contains the deployment guide, API reference, and importer development guide, all reachable from the landing page.

### Tests for User Story 3

- [x] T023 [P] [US3] Create `docs-site/test/docs-build.test.ts` (or a shell test in `scripts/test-docs-site.sh`) that runs `pnpm docs:build`, asserts the build succeeds, and checks that `index.html`, `deployment.html`, `api.html`, and `importer-development.html` exist in the output directory.
- [x] T024 [P] [US3] Add a CI check in `.github/workflows/ci.yml` that runs `pnpm docs:build` and fails the build if the docs site does not compile.

### Implementation for User Story 3

- [x] T025 [US3] Create `docs-site/.vitepress/config.ts` with a sidebar linking `docs/deployment.md`, `docs/api.md`, `docs/importer-development.md`, `docs/ux.md`, and a generated OpenAPI API reference page.
- [x] T026 [US3] Create `docs-site/index.md` as the landing page and a `docs-site/public/` directory for static assets.
- [x] T027 [US3] Configure VitePress to treat `docs/openapi.yaml` as a source and render it as an interactive API reference page in the docs site.
- [x] T028 [US3] Create `.github/workflows/docs.yml` that builds the docs site on every push to `main` and publishes it to GitHub Pages.
- [x] T029 [US3] Validate the docs build test: it should FAIL before the docs site is configured and PASS after.

**Checkpoint**: User Story 3 is independently functional — the docs site builds and contains the required pages.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Ensure the v1 packaging feature is cohesive and the documentation is consistent.

- [x] T030 [P] Update `README.md` roadmap to mark `007-deployment-cicd-docs` complete and remove or defer the "Next" item.
- [x] T031 [P] Update `docs/deployment.md` to match the final `docker-compose.yml` and `.env.example`.
- [x] T032 Run all quickstart validation scenarios from `quickstart.md` and document results.
- [x] T033 [P] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` across the monorepo and fix any regressions introduced by the new root scripts or dependencies.
- [x] T034 Verify that `AGENTS.md` and `.specify/memory/constitution.md` still accurately describe the v1 feature breakdown and roadmap after this feature is added.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational. They can proceed in parallel once the base deployment files are refined.
- **Polish (Phase 6)**: Depends on all user stories being complete enough to validate end-to-end.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational. No dependencies on other stories.
- **User Story 2 (P2)**: Can start after Foundational. No hard dependencies, but release PRs may include docs updates.
- **User Story 3 (P3)**: Can start after Foundational. Depends on `docs/deployment.md` content from US1, but the guide can be stubbed and refined later.

### Parallel Opportunities

- Setup tasks T001–T005 are independent.
- Foundational tasks T006–T010 are independent.
- Once Foundational is complete, US1, US2, and US3 can be worked in parallel.
- Within each user story, tests and config files can be created in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1 (Docker Compose deployment).
4. **STOP and VALIDATE**: Run the smoke test on a fresh machine.

### Incremental Delivery

1. Setup + Foundational → deployment base ready.
2. User Story 1 → deployment works and is independently testable.
3. User Story 2 → release workflow works and is independently testable.
4. User Story 3 → docs site works and is independently testable.
5. Polish → consistency and final validation.

---

## Notes

- All tasks reference exact file paths.
- [P] tasks can run in parallel.
- User Story tasks are labeled [US1], [US2], [US3].
- Tests are written or created before their matching implementation to satisfy the test-first cycle.
- The feature introduces no new runtime product code; all artifacts are packaging, release, and docs infrastructure.
