# Data Model: Deployment, CI/CD, and Generated Docs

This feature introduces no new database tables or product entities. The data model below describes the repository artifacts that the feature manipulates: `Release`, `Changeset`, and `DocsSite`.

## Entities

### Release

A published Componode version produced by the release workflow.

| Field | Type | Description |
|---|---|---|
| `version` | string (semver) | The version number, e.g., `1.0.0`. |
| `tag` | string | The Git tag, e.g., `v1.0.0`. |
| `changelog` | string (markdown) | Human-readable summary of all changes in this release. |
| `artifacts` | string[] | References to the source archive and container image. |
| `releasedAt` | ISO timestamp | When the release was published. |
| `changesets` | Changeset[] | The unreleased changesets consumed to produce this release. |

**State transitions**: `unreleased` → `prerelease` (PR open) → `released`.

### Changeset

A small, reviewable description of a user-facing change collected before a release.

| Field | Type | Description |
|---|---|---|
| `id` | string | Slugified file name, e.g., `polish-login-flow`. |
| `summary` | string | Human-readable description of the change. |
| `type` | enum | `major`, `minor`, or `patch` (semver impact). |
| `package` | string | The package or workspace affected (`componode` root for v1). |

**Validation rules**:
- A changeset must have a non-empty summary.
- The type must be one of `major`, `minor`, or `patch`.
- Each pull request with a user-facing change should include at least one changeset.

### DocsSite

The generated, navigable publication of the repository's documentation.

| Field | Type | Description |
|---|---|---|
| `source` | string[] | Source files: `docs/*.md`, `docs/openapi.yaml`, `README.md`. |
| `buildOutput` | string | Directory containing the generated static site. |
| `publishedUrl` | string | URL where the site is reachable. |
| `lastGeneratedAt` | ISO timestamp | Last build time. |

**Relationships**:
- `DocsSite` is generated from `Release` documentation at release time.
- `Release.changelog` links to `DocsSite` deployment guide.

## No database changes

The `Release`, `Changeset`, and `DocsSite` artifacts are stored as files in the repository and GitHub release assets. No PostgreSQL schema changes are required for this feature.
