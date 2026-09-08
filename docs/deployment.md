# Deploying Componode

Componode is self-hosted with Docker Compose. One deployment serves one organization.

## Prerequisites

- Docker Engine 24+
- Docker Compose v2
- A Linux or Windows host with an internet connection for the first build

## Quick start

1. Clone the repository:
   ```bash
   git clone https://github.com/estevanalex/componode.git
   cd componode
   ```

2. Copy and edit the environment file:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and set strong random values for `COOKIE_SECRET` and `CSRF_SECRET`.
   Change `BOOTSTRAP_ADMIN_PASSWORD` from the default to a secure value.

4. Start the stack:
   ```bash
   docker compose up -d
   ```

5. Wait for the `app` service to become healthy:
   ```bash
   docker compose ps
   ```

6. Open `http://localhost:3000` and log in with the bootstrap admin credentials
   configured in `.env`.

## Configuration reference

The deployment is controlled by `.env`. The table below maps each variable to
its purpose.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `3000` | Host port mapped to the application container. |
| `DATABASE_URL` | no | `postgres://componode:componode_pw@postgres:5432/componode` | PostgreSQL connection string. |
| `DATABASE_SSL_MODE` | no | `disable` | Database SSL mode. Use `require` for external Postgres. |
| `MAX_DB_CONNECTIONS` | no | `10` | Connection pool size. |
| `BOOTSTRAP_ADMIN_USERNAME` | yes | — | First admin username. |
| `BOOTSTRAP_ADMIN_PASSWORD` | yes | — | First admin password. |
| `COOKIE_SECRET` | yes | — | Random secret for session cookies. |
| `CSRF_SECRET` | yes | — | Random secret for CSRF tokens. |
| `OIDC_ISSUER` | no | — | Optional OIDC issuer URL. |
| `OIDC_CLIENT_ID` | no | — | Optional OIDC client ID. |
| `OIDC_CLIENT_SECRET` | no | — | Optional OIDC client secret. |
| `NODE_ENV` | no | `production` | Node environment; should stay `production` for deployments. |
| `LOG_LEVEL` | no | `info` | Log level (`debug`, `info`, `warn`, `error`). |

## Upgrading

To upgrade to a new release:

```bash
git pull
docker compose down
docker compose pull
docker compose up -d
```

The `app` container applies pending migrations on startup, and the database
volume preserves all data across upgrades.

## Secrets

Never commit `.env` or any file containing `COOKIE_SECRET`, `CSRF_SECRET`,
`DATABASE_URL` with real credentials, or `OIDC_CLIENT_SECRET`. All sensitive
values are read from the environment at runtime.

## Troubleshooting

- **Port conflict**: ensure `PORT` in `.env` is free, or change it.
- **Database not ready**: the `app` service waits for Postgres to be healthy.
  If it fails, check `docker compose logs postgres`.
- **Missing secret**: the application logs a clear error and exits before
  accepting traffic.
