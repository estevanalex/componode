# Implementation Plan: Deployment, CI/CD, and Generated Docs

**Branch**: `007-deployment-cicd-docs` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-deployment-cicd-docs/spec.md`

## Summary

This feature finalizes the v1 delivery pipeline for Componode: a hardened Docker Compose deployment package, a changeset-driven GitHub Actions release workflow, and a generated documentation site from the existing Markdown and OpenAPI sources. The feature does not add new product functionality; it packages, releases, and documents the features already built in `001` through `006`.

## Technical Context

**Language/Version**: Node.js 20+, TypeScript 5, Docker Compose v2, PostgreSQL 16

**Primary Dependencies**: pnpm 9+ (workspace monorepo), Turborepo, Docker, `@changesets/cli`, VitePress for docs site generation

**Storage**: PostgreSQL in a Docker volume; release artifacts attached to GitHub Releases; docs site published to GitHub Pages

**Testing**: Vitest (existing), Docker healthchecks, GitHub Actions workflow validation, automated deployment smoke test, docs build verification

**Target Platform**: Linux/AMD64 and Linux/ARM64 single-host Docker environments

**Project Type**: monorepo deployment package + release automation + generated docs site

**Performance Goals**:
- Dockerfile build completes in under 10 minutes on CI.
- `docker compose up` starts the app within 60 seconds after the database is healthy.
- Docs site generation completes in under 2 minutes.

**Constraints**:
- Single-organization, self-hosted (Constitution I); no multi-tenant deployment patterns.
- Secrets are supplied only via environment variables or a `.env` file, never committed.
- v1 release artifacts are source archives and a tagged container image; the image is attached to the GitHub Release, and no external registry is required.
- Every required environment variable in `docker-compose.yml` must be present in `.env.example` and documented in `docs/deployment.md`.

**Scale/Scope**:
- One deployment per organization.
- One release at a time, with human review.
- Docs site published per release.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict | Notes |
|---|---|---|
| I. Single-organization, Self-Hosted | Pass | Deployment is single-host, single-org; no tenant columns or `Organization` entity. |
| II. Importer-first | Pass | No importer changes. |
| III. Two-level taxonomy | Pass | No category or provider changes. |
| IV. Environment-as-instance | Pass | No data model changes. |
| V. Factual vs. meaning | Pass | No product hierarchy or importer-declared edges. |
| VI. Test-first | Pass | Smoke tests for deployment and release workflow are included in the quickstart. |
| VII. Observability from day one | Pass | No new runtime code paths; existing Pino/Prometheus/OpenTelemetry instrumentation is preserved in the container. |

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/007-deployment-cicd-docs/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
.
├── .changeset/              # changeset config and unreleased changesets
├── .github/
│   └── workflows/
│       ├── ci.yml           # lint, typecheck, test on PRs
│       ├── release.yml      # version bump, changelog, release
│       └── docs.yml         # build and publish docs site
├── docker-compose.yml       # refined v1 deployment package
├── Dockerfile               # multi-stage build (already exists; hardened)
├── docs/                    # existing markdown guides
│   ├── api.md
│   ├── deployment.md        # new: human-readable deployment guide
│   ├── importer-development.md
│   ├── openapi.yaml
│   └── ux.md
├── docs-site/               # VitePress config and generated site
│   ├── .vitepress/
│   │   ├── config.ts
│   │   └── theme/
│   ├── index.md
│   └── public/
├── README.md                # updated deployment and release sections
└── package.json             # version managed by changesets
```

**Structure Decision**: Add deployment, CI/CD, and docs automation as repository-level artifacts. The docs site lives in a top-level `docs-site/` directory so it does not mix generated output with the source `docs/` folder. The `docs/deployment.md` guide is the canonical human-readable source and the generated docs site mirrors it.

## Complexity Tracking

No constitution violations — table omitted.
