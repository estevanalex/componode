# Research: Deployment, CI/CD, and Generated Docs

## 1. Deployment Packaging

### Decision
Use a multi-stage `Dockerfile` plus a `docker-compose.yml` file to produce a single-machine, self-hosted deployment. The backend serves the built frontend static files from the same container.

### Rationale
- The constitution and ADR-028 explicitly choose Docker Compose for v1 deployment.
- A single container keeps the self-hosted operational surface small: one image, one database volume, one exposed port.
- The repository already contains a working `Dockerfile` and `docker-compose.yml` from the foundation, so the remaining work is documentation, hardening, and validation rather than a new architecture.
- Multi-stage builds keep the runtime image small and avoid shipping build tools or source.

### Alternatives considered
- **Kubernetes / Helm**: Deferred to v1.1 per the constitution; too complex for v1 single-org self-hosting.
- **Raw Node.js with PM2**: Requires the deployer to install pnpm, build, and manage the database manually. Rejected because Docker Compose is already ratified and gives a reproducible environment.

## 2. Release Process

### Decision
Use `@changesets/cli` in the monorepo and a GitHub Actions workflow to version-bump, generate a changelog, and publish a GitHub Release.

### Rationale
- The constitution/technology stack lists "CI/CD: GitHub Actions + changesets" as a binding decision.
- Changesets fit a monorepo with a single public-facing version at the root: each user-facing change gets a `.changeset/*.md` file, and the release workflow consumes them to produce one version bump and one changelog.
- GitHub Releases can host source archives and tag container images without introducing a registry dependency for v1.
- The workflow is triggerable by a maintainer (e.g., `workflow_dispatch`) and reviewable via a pull request.

### Alternatives considered
- **Semantic-release**: Fully automated on every merge. Rejected because the project wants a human-reviewed release PR.
- **Manual version bumps in `package.json`**: Easy to forget changelog entries and inconsistent. Rejected in favor of changesets.

## 3. Documentation Site

### Decision
Generate a static documentation site from the existing `docs/*.md` files and `docs/openapi.yaml` using a lightweight static-site generator.

### Rationale
- ADR-030 restricts documentation to `README.md` + `docs/` Markdown only.
- The docs are already authored in Markdown; a static generator turns them into a navigable site with search and theming without duplicating content.
- OpenAPI YAML can be rendered as interactive API reference within the same site.
- The site can be built in CI and published to GitHub Pages or included in the release artifacts.

### Alternatives considered
- **Custom build with Vite + React**: Overkill for v1; would require a separate frontend project. Rejected.
- **Keep docs as raw Markdown in the repo**: Already the baseline; the feature adds a generated view on top of it.
- **Docusaurus / VitePress / Starlight**: All viable. The plan phase will choose one based on the existing toolset (Vite is already in the frontend, so VitePress is a natural fit).
