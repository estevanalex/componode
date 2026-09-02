# Contract: Health & Metrics API

**Feature**: 001-foundation
**Base path**: `/api/v1` (health) and root (metrics)
**Auth**: Health check requires session. Metrics endpoint is unauthenticated (network-policy-restricted).

All responses use the standard error format `{code, message, details?}` (ADR-071) for the health endpoint.

---

## GET /health

System health check. Requires authenticated session.

**Response 200**:
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Response 503** (database unreachable):
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "uptime": 3600,
  "version": "1.0.0"
}
```

---

## GET /metrics

Prometheus metrics endpoint. Unauthenticated (restricted via network policy / Docker Compose internal network). Returns Prometheus text format.

**Response 200** (`text/plain; version=0.0.4`):

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/users",status="200"} 42
http_requests_total{method="POST",route="/api/v1/auth/login",status="200"} 5
http_requests_total{method="POST",route="/api/v1/auth/login",status="401"} 3

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/v1/users",le="0.1"} 40
http_request_duration_seconds_bucket{method="GET",route="/api/v1/users",le="0.5"} 42
http_request_duration_seconds_bucket{method="GET",route="/api/v1/users",le="1.0"} 42
http_request_duration_seconds_sum{method="GET",route="/api/v1/users"} 2.1
http_request_duration_seconds_count{method="GET",route="/api/v1/users"} 42

# HELP auth_events_total Authentication events
# TYPE auth_events_total counter
auth_events_total{event="login",outcome="success"} 5
auth_events_total{event="login",outcome="failure"} 3
auth_events_total{event="logout",outcome="success"} 1

# HELP db_pool_size Database connection pool size
# TYPE db_pool_size gauge
db_pool_size 10

# HELP db_pool_available Available database connections
# TYPE db_pool_available gauge
db_pool_available 7

# HELP db_query_duration_seconds Database query duration
# TYPE db_query_duration_seconds histogram
db_query_duration_seconds_bucket{operation="select",le="0.01"} 150
db_query_duration_seconds_bucket{operation="select",le="0.05"} 160
db_query_duration_seconds_sum{operation="select"} 1.2
db_query_duration_seconds_count{operation="select"} 160

# HELP rate_limit_events_total Rate limit events
# TYPE rate_limit_events_total counter
rate_limit_events_total{endpoint="/api/v1/auth/login"} 1

# Node.js default metrics (event loop, GC, memory, CPU) included via prom-client defaults
```

**Metrics exposed**:
| Metric | Type | Labels |
|---|---|---|
| `http_requests_total` | counter | method, route, status |
| `http_request_duration_seconds` | histogram | method, route |
| `auth_events_total` | counter | event, outcome |
| `db_pool_size` | gauge | — |
| `db_pool_available` | gauge | — |
| `db_query_duration_seconds` | histogram | operation |
| `rate_limit_events_total` | counter | endpoint |
| Node.js default metrics | various | — |
