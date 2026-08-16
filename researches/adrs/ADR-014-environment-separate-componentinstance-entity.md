### ADR-014 — Environment: separate ComponentInstance entity

**Context**: A component almost always exists in multiple environments
simultaneously (dev + staging + prod).

**Decision**: **Separate `ComponentInstance` entity.** One logical `Component`
→ many `ComponentInstance` records across environments
(`DEV`/`TEST`/`STAGING`/`DEMO`/`PRODUCTION`/`OTHER`).

```
Component {category, provider, resourceType, lifecycle, ...}  // logical, env-agnostic
    -[:HAS_INSTANCE]-> ComponentInstance {
        environment: enum[DEV, TEST, STAGING, DEMO, PRODUCTION, OTHER],
        url: string,
        region: string,
        status: enum[RUNNING, STOPPED, ERROR, GONE, ...],
        version: string,
        deployedAt: datetime,
        rawConfig: json
    }
```

**Rationale**: Validated by research — ServiceNow CSDM (Business Application →
per-env deployments), Humanitec (per-env Resource instances), Apigee (proxy →
env deployments), AWS API Gateway (RestAPI → Stage). A field on Component
either duplicates the component per env (loses identity) or stores a list
(unqueryable). The instance pattern keeps identity stable and lets each env
carry its own URL/status/version.

**Lifecycle vs operational state**: `Component.lifecycle` (`ACTIVE`/`RETIRED`)
on the logical component (is this still in scope); `ComponentInstance.status`
(`RUNNING`/`STOPPED`/`ERROR`/`GONE`) on the instance (is this currently
running). These must not be conflated.

> **CORRECTION (Session 2, [ADR-082](./ADR-082-componentgroup.md))**: This ADR covers Case A only (single
> source asset with multiple environment-specific deployments → one
> `Component` with multiple `ComponentInstance` records). Case B (multiple
> distinct source assets considered the same logical component by a human) is
> handled via `ComponentGroup` — see [ADR-082](./ADR-082-componentgroup.md). The `GONE` status value was
> added by [ADR-035](./ADR-035-instance-reconciliation-orphan-missing-instances.md) for orphaned instances.