#!/bin/sh
set -e

# Release dry-run for Componode.
# Clones the repo into a temp directory, adds a test changeset, and runs
# `pnpm changeset version` to verify the version and CHANGELOG are updated.

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
TEMP_DIR=$(mktemp -d)

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "Cloning repository into $TEMP_DIR for dry-run..."
git clone --depth 1 "file://$REPO_ROOT" "$TEMP_DIR/componode" >/dev/null 2>&1
cd "$TEMP_DIR/componode"

# Use the same pnpm store for speed.
COREPACK_ENABLE_AUTO_PIN=0

# Add a test changeset.
mkdir -p .changeset
cat > ".changeset/dry-run-changeset.md" <<'EOF'
---
"componode": patch
---

Dry-run changeset for release validation.
EOF

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Running changeset version..."
pnpm changeset version

echo "Verifying version and changelog were updated..."
if ! grep -q '"version":' package.json; then
  echo "package.json was not updated with a version"
  exit 1
fi

if [ ! -f CHANGELOG.md ]; then
  echo "CHANGELOG.md was not created"
  exit 1
fi

if ! grep -q "Dry-run changeset" CHANGELOG.md; then
  echo "CHANGELOG.md does not include the dry-run changeset"
  exit 1
fi

echo "Release dry-run passed."
