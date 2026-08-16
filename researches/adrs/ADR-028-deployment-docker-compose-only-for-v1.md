### ADR-028 — Deployment: Docker Compose only for v1

**Context**: The prior project targeted Kubernetes via Kustomize. For an OSS
v1, the deployment surface should be minimal.

**Decision**: **Docker Compose only for v1.** `docker compose up` brings up
Postgres + backend + frontend. K8s/Helm packaging is a community-contributed
follow-on.

**Rationale**: One path that works, not two paths where one is perpetually
half-maintained. `docker compose up` is the OSS self-hosted default (Grafana,
Backstage, Plausible, Posthog). A community member who wants Helm will
contribute it.