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

echo "Starting Docker Compose stack with a fresh volume..."
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "Waiting for app to be healthy..."
MAX_WAIT_SECONDS=900
WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT_SECONDS" ]; do
  if docker compose ps app | grep -q "healthy"; then
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
done

if ! docker compose ps app | grep -q "healthy"; then
  echo "App did not become healthy within ${MAX_WAIT_SECONDS}s"
  docker compose logs app --tail 50
  docker compose down
  exit 1
fi

echo "Running smoke test inside app container..."
if ! docker compose exec -T app node - <<'NODE_SCRIPT'
const BASE = 'http://localhost:3000';

function getCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
  return raw.filter(Boolean);
}

async function main() {
  // 1. Health: assert status and database connection.
  const healthRes = await fetch(`${BASE}/api/v1/health`);
  const health = await healthRes.json();
  if (!healthRes.ok || health.status !== 'healthy' || health.database !== 'connected') {
    console.error('Health check failed:', healthRes.status, health);
    process.exit(1);
  }
  console.log('Health OK:', health.status, health.database);

  // 2. Frontend: the built Vite app is served at the root.
  const rootRes = await fetch(`${BASE}/`);
  const rootHtml = await rootRes.text();
  if (!rootRes.ok || !rootHtml.includes('<title>Componode</title>') || !rootHtml.includes('id="root"')) {
    console.error('Frontend root did not return expected HTML');
    process.exit(1);
  }
  console.log('Frontend root OK');

  // 3. Login with bootstrap admin credentials. The CSRF plugin requires a
  // matching cookie and header; we seed both with the same random token.
  const csrfToken = Buffer.from(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))).toString('base64url');
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'ChangeMe123!';
  const loginRes = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      Cookie: `componode_csrf=${csrfToken}`,
    },
    body: JSON.stringify({ username, password }),
  });
  if (!loginRes.ok) {
    const loginBody = await loginRes.text();
    console.error('Login failed:', loginRes.status, loginBody);
    process.exit(1);
  }
  const cookies = getCookies(loginRes);
  const sessionMatch = cookies.find((c) => c.startsWith('componode_session='));
  if (!sessionMatch) {
    console.error('No session cookie from login');
    process.exit(1);
  }
  const sessionCookie = sessionMatch.match(/componode_session=[^;]+/)[0];

  // 4. Protected route: verify the session is usable.
  const protectedRes = await fetch(`${BASE}/api/v1/settings`, {
    headers: { Cookie: sessionCookie },
  });
  if (!protectedRes.ok) {
    const protectedBody = await protectedRes.text();
    console.error('Protected route failed:', protectedRes.status, protectedBody);
    process.exit(1);
  }
  const settings = await protectedRes.json();
  console.log('Protected route OK:', Object.keys(settings));
  console.log('Smoke test passed.');
}

main().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
NODE_SCRIPT
then
  echo "Smoke test assertions failed"
  docker compose logs app --tail 50
  docker compose down
  exit 1
fi

echo "Smoke test passed. Stopping stack..."
docker compose down
