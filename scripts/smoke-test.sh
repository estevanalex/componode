#!/bin/sh
set -e

# Deployment smoke test for Componode.
# Usage: scripts/smoke-test.sh

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"

if ! [ -f .env ]; then
  echo "Copying .env.example to .env"
  cp .env.example .env
fi

echo "Starting Docker Compose stack..."
docker compose down >/dev/null 2>&1 || true
docker compose up -d

echo "Waiting for app to be healthy..."
for i in $(seq 1 30); do
  if docker compose ps app | grep -q "healthy"; then
    break
  fi
  sleep 2
done

if ! docker compose ps app | grep -q "healthy"; then
  echo "App did not become healthy in time"
  docker compose logs app --tail 50
  docker compose down
  exit 1
fi

echo "Checking health endpoint..."
if ! docker compose exec -T app wget -qO- http://localhost:3000/api/v1/health | grep -q "healthy"; then
  echo "Health endpoint did not return a healthy response"
  docker compose logs app --tail 50
  docker compose down
  exit 1
fi

echo "Smoke test passed. Stopping stack..."
docker compose down
