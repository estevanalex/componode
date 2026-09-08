# Deployment Contract

## Feature

007-deployment-cicd-docs

## Deployment Target

Single-host Docker Compose. One deployment serves one organization.

## Configuration Surface

The deployer supplies settings through a `.env` file or environment variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | Host port mapped to the application container. |
| `DATABASE_URL` | no | `postgres://componode:componode_pw@postgres:5432/componode` | PostgreSQL connection string. |
| `DATABASE_SSL_MODE` | no | `disable` | SSL mode for the database connection. Use `require` for external Postgres. |
| `COOKIE_SECRET` | yes | — | Cryptographically random secret for session cookies. |
| `CSRF_SECRET` | yes | — | Cryptographically random secret for CSRF tokens. |
| `BOOTSTRAP_ADMIN_USERNAME` | yes | — | Initial admin username. |
| `BOOTSTRAP_ADMIN_PASSWORD` | yes | — | Initial admin password. |
| `OIDC_ISSUER` | no | — | Optional OIDC issuer URL. |
| `OIDC_CLIENT_ID` | no | — | Optional OIDC client ID. |
| `OIDC_CLIENT_SECRET` | no | — | Optional OIDC client secret. |

## Services

The `docker-compose.yml` defines two services:

1. **postgres**: PostgreSQL 16 with a persistent volume and an `init-db.sql` mount that creates the least-privilege `componode` database user.
2. **app**: The Componode application container built from the repository root `Dockerfile`.

## Volumes and Persistence

- `postgres_data`: Persists the PostgreSQL data directory across restarts and container recreation.
- The application container is stateless; all state lives in the database.

## Health Checks

- The `postgres` service reports healthy once `pg_isready` succeeds.
- The `app` service reports healthy once `GET /api/v1/health` returns `200`.
- The `app` service waits for `postgres` to be healthy before starting.

## Network Policy

- The `app` service exposes port `3000` to the host.
- The `postgres` service exposes port `5432` to the host by default for local debugging; this can be disabled in production by overriding the compose file.
- The `/metrics` endpoint is unauthenticated and should be reachable only from the internal Docker network.

## Upgrade Path

To upgrade:

1. Pull the new source or image.
2. Run `docker compose pull` and `docker compose up -d`.
3. The application container runs migrations on startup before accepting traffic.
4. Data is preserved in `postgres_data`.

## Error Scenarios

- Missing required secret: container exits with a clear log message before starting the server.
- Port conflict: `docker compose up` fails at the Docker level with a port-already-in-use error.
- Migration failure: the application container exits and logs the error; the previous container must remain until the issue is resolved.
