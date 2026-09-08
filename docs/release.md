# Releasing Componode

Componode uses [changesets](https://github.com/changesets/changesets) and GitHub
Actions for versioned releases.

## Adding a changeset

Every user-facing change should have a changeset. Run:

```bash
pnpm changeset
```

Select the `componode` package and choose the semver impact:

- `major` — breaking changes
- `minor` — new features
- `patch` — bug fixes or small improvements

Write a human-readable summary. Commit the generated `.changeset/*.md` file with
the code change.

## Cutting a release

A maintainer triggers the release workflow from the GitHub Actions tab on the
`main` branch. The workflow:

1. Consumes all unreleased changesets.
2. Bumps `package.json` and updates `CHANGELOG.md`.
3. Opens a release pull request for review.
4. After the release PR is merged, a tagged container image and source archive
   are published as GitHub Release artifacts.

## Release artifacts

Each release produces:

- A Git-tagged source archive.
- A tagged container image built from the repository `Dockerfile` and attached
  to the GitHub Release.
- An updated `CHANGELOG.md`.

## Versioning

Componode follows [Semantic Versioning](https://semver.org/). The version is
managed in the root `package.json`.
