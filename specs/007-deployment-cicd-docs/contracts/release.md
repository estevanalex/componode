# Release Contract

## Feature

007-deployment-cicd-docs

## Release Trigger

A maintainer runs the `release.yml` GitHub Actions workflow manually (`workflow_dispatch`) on the `main` branch.

## Inputs

| Input | Required | Description |
|---|---|---|
| `bump` | yes | Version bump type: `major`, `minor`, or `patch`. |

## Process

1. The workflow checks out `main`.
2. It runs `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
3. If all checks pass, it runs `changeset version` with the requested bump, consuming all `.changeset/*.md` files.
4. It opens a release pull request containing the version bump and `CHANGELOG.md` update.
5. Once the release PR is merged, a second workflow or the same workflow on `push` to `main` with a version tag publishes:
   - A GitHub Release with the changelog.
   - A tagged source archive.
   - A tagged container image built from `Dockerfile`, attached to the GitHub Release as an artifact.

## Outputs

| Output | Description |
|---|---|
| `version` | The new semver version, e.g., `1.1.0`. |
| `tag` | The Git tag, e.g., `v1.1.0`. |
| `changelog` | The `CHANGELOG.md` section for this release. |
| `releaseUrl` | The URL of the published GitHub Release. |
| `artifacts` | The source archive and tagged container image; the image is attached to the GitHub Release. |

## Changeset Format

Each changeset is a Markdown file in `.changeset/`:

```markdown
---
"componode": minor
---

Add a short, human-readable description of the change.
```

- `componode` is the root package name for v1.
- The bump level must be `major`, `minor`, or `patch`.
- The summary appears in `CHANGELOG.md`.

## Preconditions

- Every user-facing pull request since the last release must have a changeset.
- The release PR must pass all CI checks before merge.
- The docs site is regenerated and published as part of the release.

## Error Scenarios

- Missing changesets: the workflow fails with a clear message and no version is bumped.
- CI checks fail: the release PR is opened but marked as failing; it cannot be merged without override.
- Container build fails: the release is not published until the build is fixed and the workflow is re-run.
