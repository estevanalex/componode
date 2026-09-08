# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

## Adding a changeset

If your pull request has any user-facing impact, add a changeset before opening the PR.

```bash
pnpm changeset
```

This interactive command creates a Markdown file in `.changeset/` describing the change and the semantic-version bump level (`major`, `minor`, or `patch`).

## Changeset format

Each `.changeset/*.md` looks like this:

```markdown
---
"componode": minor
---

Added a short, human-readable description of the change.
```

- `componode` is the root package name for v1.
- The bump level must be `major`, `minor`, or `patch`.
- The summary appears in `CHANGELOG.md`.

## What needs a changeset

- New features
- Bug fixes
- Breaking changes
- Notable documentation or deployment changes that affect users

Pure refactoring, test-only changes, and internal tooling tweaks that do not affect users do not need a changeset.

## Release process

A maintainer triggers the `release.yml` workflow from the `main` branch with the desired bump type. The workflow consumes all unreleased changesets, opens a version-bump pull request, and, after the PR is merged, publishes a GitHub Release and a tagged container image.
