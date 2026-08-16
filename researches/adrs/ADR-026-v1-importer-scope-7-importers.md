### ADR-026 — v1 importer scope: 7 importers

**Context**: Shipping all listed providers in v1 is unrealistic. OSS importer
ecosystems ship a credible starter set and contributors add the rest.

**Decision**: **7 importers covering all four patterns:**
1. **GitHub** (repo pattern)
2. **AWS** (cloud pattern — polymorphic components across compute/db/storage/network)
3. **Azure** (cloud pattern — proves it's not AWS-specific)
4. **Kubernetes** (container/orchestration pattern — namespace-as-env, workloads)
5. **Web URL** (endpoint-probe pattern — simplest, proves ComponentInstance + environment)
6. **API URL** (endpoint pattern variant — OpenAPI/health probe)
7. **MCP server** (new asset class — differentiates from Backstage/cartography)

**Remaining providers** (GitLab, Bitbucket, Azure DevOps, Alibaba Cloud,
Cloudflare, OpenShift, Docker/Podman) = **contributor-welcome issues** with
the importer interface documented and GitHub/AWS as reference templates.

**Rationale**: Shipping 4 half-baked cloud importers is worse than 2 solid
ones that prove the pattern. The contributor template + "good first issue"
label closes the gap faster than writing all of them ourselves.

---

## Auth & Security