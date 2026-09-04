# Implementation Plan: 002-importer-framework

**Branch**: `002-importer-framework` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-importer-framework/spec.md`

## Summary

Deliver the generic importer framework plus the first concrete GitHub importer so an admin can configure and schedule a run, an editor/admin can trigger it, and every authenticated user can watch live run progress, while the backend upserts and reconciles components and instances according to the ADR-035/036/037/056/057/058/059/060/061/062/063 rules.

> **Clarification assumptions:**
> 1. This plan interprets "megaplan" as an **expanded, engineer-ready implementation plan** for the existing `002-importer-framework` milestone. If you intended a specific external **"Megaplan" integration target**, replace the `packages/importer-github` section with `packages/importer-megaplan`.
> 2. **Decided:** `component-categories.ts` will be reconciled with ADR-013 so GitHub repositories are imported with category `REPOSITORY` (Phase A, step 5).

---

## Technical Context

- **Language/Version**: TypeScript 5, Node.js LTS
- **Primary Dependencies**: Fastify, Kysely, React 18, TanStack Query, Vite, Tailwind CSS v4, shadcn/ui, `node-cron` (or `toad-scheduler`), `p-queue` (or in-process semaphore), `octokit`
- **Storage**: PostgreSQL (CHECK constraints generated from `packages/core` constants)
- **Testing**: Vitest (unit + integration with `@testcontainers/postgresql`), React Testing Library
- **Target Platform**: Single-instance Docker Compose (backend serves frontend static)
- **Performance Goals**: In-process queue bounded by `IMPORTER_MAX_CONCURRENCY` (default 3); per-asset incremental commits
- **Constraints**: Importers depend only on `@componode/core`; no `sql.raw()` in app code; secrets resolved by core; `AbortSignal` propagated to SDK calls

## Project Structure

```text
specs/002-importer-framework/
├── spec.md          # This feature specification
├── plan.md          # This implementation plan
├── tasks.md         # Generated executable task list
├── research.md      # Optional: ADR references
├── data-model.md    # Optional: entity notes
├── quickstart.md    # Optional: test/verification notes
└── contracts/       # Optional: interface contracts

packages/
├── core/                 # Contracts, constants, validation, observability types
├── backend/              # Fastify app, services, routes, scheduler, migrations
│   └── src/
│       ├── db/migrations/004_importer_tracking.ts
│       ├── services/importer-registry.ts
│       ├── services/importer-config-service.ts
│       ├── services/import-run-service.ts
│       ├── services/scheduler-service.ts
│       ├── services/recovery-service.ts
│       ├── routes/importers.ts
│       └── plugins/rbac.ts
├── importer-github/      # GitHub importer package
│   ├── src/manifest.ts
│   ├── src/config.ts
│   ├── src/importer.ts
│   └── test/
└── frontend/             # React app
    └── src/
        ├── api/hooks/importers.ts
        ├── pages/importers.tsx
        └── pages/importer-run.tsx
```

## 1. Objective & Acceptance Criteria

### Objective
Implement the importer execution framework and the first concrete importer (`importer-github`) so that:
- admins can create/edit/delete importer configs (schedule, scope, secret refs);
- editors/admins can trigger on-demand runs and cancel running runs;
- scheduled runs execute via an in-process cron scheduler;
- the GitHub importer pulls public/private repositories and yields `Component` + `ComponentInstance` records;
- the core validates, upserts, orphans, and retires records in per-asset transactions;
- users see live run phase and per-asset counts in the UI.

### Acceptance Criteria
- [x] `GET /api/v1/importers` returns the registry of available importers (name, label, description, config schema).
- [x] `POST /api/v1/importer-configs` (admin) creates a config; `PATCH`/`DELETE` (admin) updates/removes it.
- [x] `POST /api/v1/importer-configs/:id/trigger` (editor+) returns `202 { runId }` and starts a run.
- [x] `GET /api/v1/importer-configs/:id/runs` and `GET .../:id/runs/:runId` return run status, counts, and `currentPhase`.
- [x] `POST /api/v1/importer-configs/:id/runs/:runId/cancel` (editor+) sets `cancelRequestedAt` and aborts the generator.
- [x] GitHub importer yields repos as `category = REPOSITORY`, `provider = GITHUB`, `resourceType = github:repository`.
- [x] Each yielded asset upserts `components` (key: `category`, `provider`, `externalId`) and `component_instances` (key: `componentId`, `externalId`).
- [x] Missing instances from previous runs are orphaned (`status = GONE`) during the run.
- [x] On `COMPLETED`, components previously touched by the config but not yielded are retired (`lifecycle = RETIRED`).
- [x] On server boot, stale `RUNNING`/`PENDING` rows are recovered to `INTERRUPTED`/`CANCELLED`.
- [x] Frontend `/importers` page lists configs, allows create/edit with a schema-driven form, shows runs, and polls a run detail view for phase/counts.
- [x] `pnpm build`, `pnpm test:unit`, and `pnpm test:integration` pass for the importer-specific suites.

---

## 2. Scope

### In scope
- Core contract updates (`Importer`, `DiscoveredAsset`, `ImportRun`, `ComponentInstance`).
- DB migration adding missing run/instance columns (`currentPhase`, `cancelRequestedAt`, `lastSeenAt`, `lastSeenInRunId`, `slug` on `component_instances`).
- Taxonomy reconciliation: add `REPOSITORY` category to `component-categories.ts`, `validateDiscoveredAsset`, and the DB `CHECK` constraint.
- Backend services: `ImporterRegistry`, `SecretResolver`, `ImporterConfigService`, `ImportRunService`/`RunCoordinator`, `SchedulerService`, `RecoveryService`.
- Backend routes for configs, runs, triggers, cancel, registry.
- `packages/importer-github` package with manifest and `run` implementation.
- Frontend pages, hooks, types, and route wiring for importers/run detail.
- Observability: run-level metrics and spans.
- Unit and integration tests.

### Out of scope
- The remaining 6 v1 importers (AWS, Azure, Kubernetes, Web URL, API URL, MCP server) — deferred to `003-component-catalog`.
- Component catalog browsing/filtering UI beyond what the importer produces — `003`.
- Audit/entity_changes writes for each upsert — optional, can be added in `005-audit-and-settings`.
- Webhook/event-driven triggers — post-v1.
- External secret stores (Vault, AWS SM) — env-only secret refs for `002`.

### Constraints
- TypeScript 5, Fastify, Kysely, React 18, TanStack Query, Vite, Tailwind v4, shadcn/ui.
- Importers depend **only** on `@componode/core`; they never import `@componode/backend` or other importers.
- No `sql.raw()` in application code; all DB access via Kysely builder.
- Per-asset incremental commits; phase-2 reconciliation only on `COMPLETED`.
- In-process scheduling with `node-cron`; concurrency limited by `IMPORTER_MAX_CONCURRENCY` (default 3).
- `AbortSignal` must be passed through to `fetch`/`Octokit` calls for cancellation.
- Secrets are resolved by the core and passed as `Record<string, string>` to the importer; importers never see `process.env`.
- All log output is structured JSON; no secrets in logs.

---

## 3. Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Single-Organization | Pass | No new tenant/org concepts. |
| II. Importer-First | Pass | Framework + concrete `importer-github`; core owns persistence. |
| III. Two-Level Taxonomy | Pass | Phase A reconciles `component-categories.ts` with ADR-013 and updates the DB `components_category_check` via a migration. |
| IV. Environment-as-Instance | Pass | One `Component` per repo, one `ComponentInstance` per repo (`PRODUCTION` env) in this importer. |
| V. Factual vs. Meaning Layer | Pass | GitHub importer yields only components/instances; no product edges. |
| VI. Test-First | Enforced | Tests for harness, registry, run lifecycle, reconciliation, and GitHub importer must be written/updated before implementation. |
| VII. Observability | Pass | Run metrics and spans added; structured logging used in run path. |

---

## 4. Detailed Implementation

### Phase A — Core contracts & schema updates (blocking everything else)

1. **Update `packages/core/src/contracts/importer.ts`**  
   Change the `Importer` interface to ADR-056:
   ```ts
   export interface ImporterContext {
     runId: string;
     logger: Logger;
     signal: AbortSignal;
     reportPhase: (name: string) => void | Promise<void>;
     tracer?: Tracer;
   }

   export interface Importer {
     readonly name: string;
     readonly version: string;
     run(
       config: Record<string, unknown>,
       secrets: Record<string, string>,
       context: ImporterContext,
     ): AsyncGenerator<DiscoveredAsset>;
   }
   ```
   Keep `SecretResolver` type for backend use but remove it from `ImporterContext`.

2. **Update `packages/core/src/contracts/discovered-asset.ts`**  
   - Rename `DiscoveredAssetEnvironment` → `DiscoveredAssetInstance` for clarity (optional, internal name only).  
   - Add `deployedAt?: string | null`.  
   - Add `slug?: string` to `DiscoveredAsset`.  
   - Remove any remaining `relationships` comments/fields; keep `relationships` out of v1.

3. **Update `packages/core/src/contracts/import-run.ts`**  
   Add to `ImportRun`:
   ```ts
   currentPhase?: string | null;
   cancelRequestedAt?: string | null;
   ```

4. **Update `packages/core/src/contracts/component-instance.ts`**  
   Add:
   ```ts
   slug: string;
   lastSeenAt?: string | null;
   lastSeenInRunId?: string | null;
   ```
   (Make `slug` non-nullable because AGENTS.md requires it and the DB migration adds it.)

5. **Update `packages/core/src/constants/component-categories.ts`**  
   - Replace the existing 24 entries with the 24 values from ADR-013:
     `COMPUTE, SERVERLESS, CONTAINER, CONTAINER_ORCHESTRATION, DATABASE, STORAGE, NETWORK, QUEUE, CDN, DNS, CERTIFICATE, SECRET, KMS_KEY, IDENTITY, OBSERVABILITY, API, MCP_SERVER, WEB_ENDPOINT, REPOSITORY, PACKAGE_REGISTRY, DOCUMENTATION, IAC, JOB, LIBRARY`.
   - Update `COMPONENT_CATEGORY_META` with labels and descriptions for each.
   - Any values no longer in the list (e.g. `MESSAGE_QUEUE`, `CACHE`) are removed.

6. **Update `packages/core/src/validation/discovered-asset.ts`**  
   - Update the `category` enum set to match the new constants.  
   - Add `slug` as optional string (max 100).  
   - Add `deployedAt` to instance schema.  
   - Keep `externalId` required and `environment` required per ADR-057.

7. **Update `packages/core/src/index.ts`**  
   Re-export new/renamed types. No breaking changes to `001` exports.

8. **DB migration `packages/backend/src/db/migrations/004_importer_tracking.ts`**  
   Add columns:
   - `import_runs.currentPhase` `text` nullable  
   - `import_runs.cancelRequestedAt` `timestamptz` nullable  
   - `component_instances.lastSeenAt` `timestamptz` nullable  
   - `component_instances.lastSeenInRunId` `uuid` nullable (FK → `import_runs.id` ON DELETE SET NULL)  
   - `component_instances.slug` `text` not null unique
   - Replace the `components_category_check` constraint with the new ADR-013 category set so `REPOSITORY` is valid.
   - Add a unique index on `component_instances.slug`.

9. **Update `packages/backend/src/db/types.ts`**  
   Reflect the new columns in `ImportRunRow` and `ComponentInstanceRow`.

10. **Update slug uniqueness in migration**  
    The `component_instances` table already has a unique constraint on `(componentId, externalId)`. The new `slug` column also needs a `UNIQUE` constraint.

### Phase B — Backend importer framework

11. **`packages/backend/src/services/importer-registry.ts`**
    - Maintain a static list of importer package names, e.g. `const IMPORTER_PACKAGES = ["@componode/importer-github"]`.
    - `getManifests(): Promise<ImporterManifest[]>` imports each package's `./manifest` export (non-lazy at boot is fine; manifests are tiny).
    - `getImporter(name): Promise<Importer>` lazy-imports the `implPath` from the manifest, caches per name.
    - `getConfigSchema(name): unknown` returns the manifest's `configSchema` for validation and UI rendering.
    - Throw `NOT_FOUND` for unknown importer names.

12. **`packages/backend/src/services/secret-resolver.ts`**
    - Rename the existing `EnvSecretResolver` to `SecretResolver` or create `resolveSecrets(secretRefs: Array<{ key: string; env?: string; file?: string }>): Promise<Record<string, string>>`.
    - Accept only `env:VAR_NAME` or `file:PATH` refs in `002`; throw for unsupported prefixes.
    - Redact values in logs (do not log the resolved map).

13. **`packages/backend/src/utils/slug.ts`**
    - `slugify(input: string): string` — lowercase, replace non-alphanumeric with `-`, collapse, trim.
    - `generateUniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string>` — append `-2`, `-3`, etc. until `exists` returns false.
    - `generateComponentSlug(name: string, externalId: string): string` — prefer slugified `name`; if empty, use `externalId`.
    - `generateInstanceSlug(componentSlug: string, environment: string, externalId: string): string` — `${componentSlug}-${environment.toLowerCase()}-${externalId}`.

14. **`packages/backend/src/services/importer-config-service.ts`**
    Functions:
    - `listImporterConfigs()` — select all, order by `createdAt` desc, do not include `secretRefs` values in response (redact).
    - `getImporterConfig(id)` — by id.
    - `createImporterConfig(input, createdBy)` — validate `importerName` exists, validate `scope` against the importer's `configSchema`, validate cron expression if `schedule` provided, insert row.
    - `updateImporterConfig(id, input, updatedBy)` — partial update; if `schedule` changed, re-register with scheduler.
    - `deleteImporterConfig(id)` — delete (cascades runs/errors via FK).
    Zod schema lives in `packages/core/src/schemas/importer-config.ts`:
    ```ts
    export const createImporterConfigSchema = z.object({
      importerName: z.string().min(1),
      label: z.string().min(1).max(100),
      scope: z.record(z.unknown()),
      secretRefs: z.array(
        z.object({
          key: z.string(),
          env: z.string().optional(),
          file: z.string().optional(),
        }),
      ).optional(),
      schedule: z.string().optional(), // cron
      enabled: z.boolean().default(true),
    });
    ```

15. **`packages/backend/src/services/import-run-service.ts`** (or `run-coordinator.ts`)
    State:
    - `const runningControllers = new Map<string, AbortController>()` keyed by `runId`.
    - `pQueue` (or a simple semaphore) with `IMPORTER_MAX_CONCURRENCY` default 3.

    Functions:
    - `startRun(configId, triggeredBy?)`
      1. Check if the config already has a `RUNNING` or `PENDING` row → `409 CONFLICT`.
      2. Create `PENDING` row in `import_runs`.
      3. Enqueue worker via `pQueue`.
      4. Return `{ runId }` with `202`.
    - `cancelRun(runId)`
      1. Set `import_runs.cancelRequestedAt = now`.
      2. Call `runningControllers.get(runId)?.abort()`.
      3. Return `204`.
    - `worker(configId, runId, triggeredBy)`
      1. Transition `PENDING` → `RUNNING`, set `startedAt`.
      2. Load config; resolve `secretRefs` to `secrets`.
      3. Get importer from registry.
      4. Build `ImporterContext`:
         - `runId`
         - `logger` = `request.log.child({ runId, importer: config.importerName })` or a child Pino logger wrapped in the `Logger` interface.
         - `signal` = `AbortController.signal`.
         - `reportPhase: (name) => update import_runs.currentPhase = name`.
         - `tracer` = backend tracer or `NOOP_TRACER`.
      5. Iterate `importer.run(config, secrets, context)`.
      6. For each `DiscoveredAsset`:
         - `validateDiscoveredAsset`; if invalid, insert `import_run_errors`, increment `assetsProcessed`, continue.
         - Begin per-asset transaction.
         - Upsert `Component` by `(category, provider, externalId)`:
           - If found, update `name`, `resourceType`, `details`, `updatedAt`, `updatedBy` (run actor), set `lifecycle = ACTIVE` if retired.
           - If not found, generate slug, create with `uuidv7()`, `createdBy` = run actor.
         - For each instance in `asset.instances`:
           - Upsert `ComponentInstance` by `(componentId, externalId)`:
             - Generate/verify unique `slug` using `generateInstanceSlug`.
             - Update or insert; set `status` to yielded value or default `RUNNING`; set `lastSeenAt = now`, `lastSeenInRunId = runId`.
         - Phase 1 reconciliation: for the current component, find `ComponentInstance` rows with `componentId` and `lastSeenInRunId != runId` (or not in the yielded instance list); set `status = GONE`.
         - Increment `assetsProcessed`/`assetsCreated`/`assetsUpdated` counters.
         - Commit transaction.
      7. When generator ends normally, run **phase 2 reconciliation**:
         - Find `Component` rows touched by this `configId` (add `lastSeenInRunId`? Better: track yielded `componentId`s in memory; query components where `id NOT IN yieldedIds` and `lifecycle = ACTIVE` and `provider = config.importerName`? Need a way to know "previously touched by this importer".)
         - **Decision:** add `lastSeenInRunId` and `lastSeenAt` to `components` too? Or track via `component_instances`. Since a component may have been previously imported by this config but yielded no instances now. Simpler: add `component.lastSeenInRunId` and `component.lastSeenAt` in the same migration. Then phase 2 updates components with `lastSeenInRunId != runId` and `lifecycle = ACTIVE` to `RETIRED`, and orphans all their instances.
         - Update `import_runs` to `COMPLETED`, `completedAt = now`.
      8. On `AbortError` or `cancelRequestedAt` set: set `CANCELLED` and `completedAt`.
      9. On other errors: set `FAILED`, record `errorMessage`, `errorType`, `errorStack` (only if `DEBUG_ERROR_DETAILS`? Stack trace for ops is allowed; do not leak to client), and `completedAt`.
      10. Always remove controller from `runningControllers`.

    > **Note on phase 2 scope:** ADR-036 says "components previously touched by this importer config but not yielded this run get retired". Tracking requires a `lastSeenInRunId` on `components`. Add this column in the same migration as `component_instances.lastSeenInRunId`.

16. **`packages/backend/src/services/scheduler-service.ts`**
    - On server start, `SchedulerService.init()` loads all enabled configs with `schedule`, schedules cron jobs with `node-cron`.
    - `scheduleConfig(config)` adds a job that calls `ImportRunService.startRun(config.id, null)`.
    - `unscheduleConfig(id)` removes the job.
    - `rescheduleConfig(config)` unschedule + schedule.
    - Use `node-cron` dependency; if `schedule` is empty or config disabled, unschedule.

17. **`packages/backend/src/services/recovery-service.ts`**
    - `recoverRuns()` called in `server.ts` before `app.listen()`.
    - For `import_runs.status = 'RUNNING'`:
      - If `cancelRequestedAt IS NOT NULL` → `CANCELLED`, `completedAt = now`.
      - Else → `INTERRUPTED`, `completedAt = now`.
    - For `status = 'PENDING'` → `INTERRUPTED`.
    - Do **not** re-enqueue; next cron/manual trigger will retry from zero (ADR-038).

18. **`packages/backend/src/routes/importers.ts`**
    Endpoints (all relative to `/api/v1`):
    - `GET /importers` — list registered importer manifests. `preHandler: verifySession` (any authenticated).
    - `GET /importer-configs` — list configs. `preHandler: verifySession`.
    - `GET /importer-configs/:id` — get one config. `preHandler: verifySession`.
    - `POST /importer-configs` — create. `preHandler: verifySession, requireRole("importer:config:create")`.
    - `PATCH /importer-configs/:id` — update. `preHandler: verifySession, requireRole("importer:config:update")`.
    - `DELETE /importer-configs/:id` — delete. `preHandler: verifySession, requireRole("importer:config:delete")`.
    - `POST /importer-configs/:id/trigger` — start run. `preHandler: verifySession, requireRole("importer:run:trigger")`.
    - `GET /importer-configs/:id/runs` — list runs. `preHandler: verifySession`.
    - `GET /importer-configs/:id/runs/:runId` — run detail. `preHandler: verifySession`.
    - `POST /importer-configs/:id/runs/:runId/cancel` — cancel. `preHandler: verifySession, requireRole("importer:run:cancel")`.
    - `GET /importer-configs/:id/runs/:runId/errors` — paginated errors. `preHandler: verifySession`.

19. **RBAC permission map (`packages/backend/src/plugins/rbac.ts`)**
    Add:
    ```ts
    "importer:config:create": "ADMIN",
    "importer:config:update": "ADMIN",
    "importer:config:delete": "ADMIN",
    "importer:run:trigger": "EDITOR",
    "importer:run:cancel": "EDITOR",
    "importer:config:list": "VIEWER", // implicit because no restriction
    ```
    Keep list/get endpoints with no `requireRole` so all authenticated users can view.

20. **Register routes in `packages/backend/src/app.ts`**
    Add `await app.register(importerRoutes, { prefix: "/api/v1" });` after session routes.

21. **Metrics & tracing**
    Add to `packages/backend/src/plugins/metrics.ts`:
    ```ts
    const importRunsTotal = new Counter({ name: "import_runs_total", labelNames: ["importer", "status"] });
    const importRunDurationSeconds = new Histogram({ name: "import_run_duration_seconds", labelNames: ["importer"] });
    const importRunAssetsYieldedTotal = new Counter({ name: "import_run_assets_yielded_total", labelNames: ["importer"] });
    const importRunErrorsTotal = new Counter({ name: "import_run_errors_total", labelNames: ["importer", "errorType"] });
    ```
    Update `traceDbQuery` usage in `import-run-service` for upsert operations.

### Phase C — `packages/importer-github`

22. **Package scaffolding**
    - `packages/importer-github/package.json` (type module, deps: `@componode/core`, `octokit`, dev deps).
    - `packages/importer-github/tsconfig.json` extending base.
    - `pnpm-workspace.yaml` already covers `packages/*`; add the package to `packages/backend/package.json` as `workspace:*`.

23. **`packages/importer-github/src/manifest.ts`**
    ```ts
    export const manifest = {
      name: "github",
      label: "GitHub",
      description: "Import GitHub repositories as components.",
      version: "1.0.0",
      implPath: "@componode/importer-github/importer",
      configSchema: githubConfigSchema, // Zod schema exported from core or local
    };
    ```

24. **`packages/importer-github/src/config.ts`**
    Zod schema:
    ```ts
    export const githubConfigSchema = z.object({
      org: z.string().min(1),
      repos: z.array(z.string()).optional(), // empty = all
      includeForks: z.boolean().default(false),
      includeArchived: z.boolean().default(false),
    });
    ```

25. **`packages/importer-github/src/importer.ts`**
    - `GithubImporter` class implements `Importer`.
    - `run(config, secrets, context)`:
      1. `context.reportPhase("Authenticating")`.
      2. Instantiate `Octokit` with `auth: secrets.token`.
      3. `context.reportPhase("Listing repositories")`.
      4. Fetch repos for `config.org` (paginated, pass `signal` to Octokit/ fetch if possible; otherwise check `signal.aborted` between pages).
      5. Filter by `repos`, `includeForks`, `includeArchived`.
      6. For each repo, `context.reportPhase(`Processing ${repo.name}`)`.
      7. Yield a `DiscoveredAsset`:
         ```ts
         {
           category: "REPOSITORY",
           provider: "GITHUB",
           resourceType: "github:repository",
           name: repo.full_name,
           externalId: `${config.org}/${repo.name}`, // or repo.id.toString()
           slug: slugify(repo.name),
           details: { language: repo.language, topics: repo.topics, visibility: repo.visibility, htmlUrl: repo.html_url },
           instances: [{
             environment: "PRODUCTION",
             externalId: "default",
             url: repo.html_url,
             status: "RUNNING",
             rawConfig: { defaultBranch: repo.default_branch },
           }],
         }
         ```
      8. Stop if `context.signal.aborted`.

26. **`packages/importer-github/test/importer.test.ts`**
    - Mock Octokit with `nock` or a mock `Octokit` constructor.
    - Test yields correct assets and respects `AbortSignal`.

### Phase D — Frontend

27. **API types (`packages/frontend/src/api/types.ts`)**
    Add:
    ```ts
    export interface ImporterManifest { name: string; label: string; description: string; configSchema?: unknown; }
    export interface ImporterConfig { id: string; importerName: string; label: string; scope: Record<string, unknown>; secretRefs?: Array<{ key: string; env?: string; file?: string }>; schedule?: string | null; enabled: boolean; createdAt: string; updatedAt: string; }
    export interface ImportRun { id: string; configId: string; status: ImportRunStatus; triggeredBy?: string | null; startedAt?: string | null; completedAt?: string | null; assetsProcessed: number; assetsCreated: number; assetsUpdated: number; instancesOrphaned: number; componentsRetired: number; currentPhase?: string | null; errorMessage?: string | null; createdAt: string; }
    export type ImportRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "INTERRUPTED";
    ```

28. **API hooks (`packages/frontend/src/api/hooks/importers.ts`)**
    - `useImporters()` → `GET /importers`
    - `useImporterConfigs()` → `GET /importer-configs`
    - `useCreateImporterConfig()` → `POST /importer-configs`
    - `useUpdateImporterConfig()` → `PATCH /importer-configs/:id`
    - `useDeleteImporterConfig()` → `DELETE /importer-configs/:id`
    - `useTriggerRun()` → `POST /importer-configs/:id/trigger`
    - `useCancelRun()` → `POST /importer-configs/:id/runs/:runId/cancel`
    - `useImporterRuns(configId)` → `GET /importer-configs/:id/runs`
    - `useImporterRun(configId, runId)` → `GET /importer-configs/:id/runs/:runId` with `refetchInterval: 2000` while `status === "RUNNING" || status === "PENDING"`.

29. **Schema-driven config form**
    - Create `packages/frontend/src/components/importer-config-form.tsx`.
    - For `002`, render fields based on a small declarative `configFields` array in the manifest (or JSON Schema `properties`).
    - Fields for GitHub: `org` (text), `repos` (comma-separated or multi-input), `includeForks` (switch), `includeArchived` (switch), `token` secret ref (text, placeholder `env:GITHUB_TOKEN`).
    - Use `react-hook-form` + `zodResolver` (already in deps) with the config schema.

30. **Pages**
    - `packages/frontend/src/pages/importers.tsx`: list configs, create/edit dialog, trigger button, runs table.
    - `packages/frontend/src/pages/importer-run.tsx`: run detail with live phase, counts, error list, cancel button, elapsed timer.
    - Update `packages/frontend/src/routes.tsx` to add `/importers/:configId/runs/:runId`.
    - `packages/frontend/src/components/layout/nav.tsx` already links to `/importers`.

### Phase E — Tests

31. **Unit tests**
    - `packages/core/test/validation/discovered-asset.test.ts` — update and expand for slug, deployedAt, new categories.
    - `packages/backend/test/unit/slug.test.ts` — collision, slugify.
    - `packages/backend/test/unit/importer-registry.test.ts` — load manifest, lazy impl, unknown name.
    - `packages/backend/test/unit/secret-resolver.test.ts` — env refs, missing var.

32. **Integration tests**
    - `packages/backend/test/integration/importer-configs.test.ts` — CRUD, validation, RBAC.
    - `packages/backend/test/integration/import-runs.test.ts` — trigger (202), state machine, cancel, recovery, concurrency guard.
    - `packages/backend/test/integration/import-reconciliation.test.ts` — mock importer yields asset, then missing; verify orphaning and retirement.
    - `packages/backend/test/integration/importer-github.test.ts` — nock GitHub API, run `importer-github` end-to-end through `ImportRunService`.
    - `packages/frontend/test/unit/importer-config-form.test.tsx` — form renders and submits.

---

## 5. Risks, Dependencies, and Open Questions

| Risk | Mitigation |
|---|---|
| Taxonomy reconciliation (adding `REPOSITORY`) touches core constants, validation, and DB `CHECK` constraints. | Make it the first task in Phase A; run migration tests immediately. |
| In-process scheduler with multiple replicas could double-run. | v1 is single-instance Docker Compose; document that horizontal scaling requires an external queue (v1.1). |
| GitHub API rate limits/timeouts. | Pass `AbortSignal`; support `repos` filter; document token usage. |
| Per-asset transactions on large GitHub orgs may be slow. | Acceptable for v1 single-instance scale; add `IMPORTER_MAX_CONCURRENCY` and future batching note. |
| `component_instances.slug` must be generated idempotently for upsert. | Use deterministic formula from component slug + environment + externalId, plus collision suffix only if a duplicate truly occurs. |

### Open questions resolved
- **Taxonomy:** Reconcile `component-categories.ts` with ADR-013 and add `REPOSITORY` (confirmed above).
- **Scope:** `002` ships only the GitHub importer; the framework is validated through the GitHub importer's unit/integration tests. A separate `importer-noop` mock can be added later if testing the framework in isolation becomes necessary.

---

## 6. Verification Plan

- [ ] `pnpm install` (adds `node-cron`, `p-queue` or `toad-scheduler`, `octokit`).
- [ ] `pnpm --filter @componode/core test:unit`
- [ ] `pnpm --filter @componode/backend test:unit`
- [ ] `pnpm --filter @componode/backend test:integration` (requires Docker for testcontainers)
- [ ] `pnpm --filter @componode/frontend test:unit`
- [ ] `pnpm build`
- [ ] Manual smoke test:
  1. Create a GitHub importer config with `env:GITHUB_TOKEN`.
  2. Trigger a run.
  3. Watch `/api/v1/importer-configs/:id/runs/:runId` poll status/phase.
  4. Verify `components` and `component_instances` rows created.
  5. Delete or rename a repo, re-run, verify old instance/component retired/orphaned.

**Do not begin implementation until this plan is approved.**
