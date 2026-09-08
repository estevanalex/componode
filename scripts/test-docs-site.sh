#!/bin/sh
set -e

# Docs site build test for Componode.
# Usage: scripts/test-docs-site.sh

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"

echo "Building docs site..."
pnpm docs:build

OUT_DIR="docs-site/.vitepress/dist"

if [ ! -d "$OUT_DIR" ]; then
  echo "Docs site output directory not found: $OUT_DIR"
  exit 1
fi

echo "Checking required pages..."
for page in index.html deployment.html api.html importer-development.html; do
  if [ ! -f "$OUT_DIR/$page" ]; then
    echo "Missing required docs page: $page"
    exit 1
  fi
  echo "  $page exists"
done

echo "Docs site build test passed."
