### ADR-024 — Importer registry: in-tree, code-registered

**Context**: The way contributors add new importers defines the project's
extensibility contract.

**Decision**: **In-tree, code-registered.** Every importer lives in the repo
under `packages/importer-<provider>/`, implements a common `Importer`
interface, and is auto-discovered at boot via a registry. Contributors add a
new importer by opening a PR with a new package. No runtime plugin loading.

**Rationale**: No arbitrary-code-execution attack surface. Full type safety at
build time. Contributors open PRs; maintainers review. This is how Backstage
plugins and cartography modules work.