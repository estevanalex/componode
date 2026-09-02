import type { Kysely } from "kysely";
import { sql } from "kysely";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_LIFECYCLE,
  COMPONENT_PROVIDERS,
  ENVIRONMENTS,
  IMPORT_RUN_STATUS,
  INSTANCE_STATUS,
  PRODUCT_TYPES,
  ROLES,
} from "@componode/core";

/**
 * Initial schema for Componode.
 *
 * Creates all 24 tables for the Composable Product Model using Kysely's schema
 * builder. CHECK constraints are generated from the controlled-vocabulary
 * constants in `@componode/core` (ADR-078: no native ENUMs). UUID primary keys
 * are generated application-side (ADR-045), so no `gen_random_uuid()` defaults.
 *
 * `teams` and `line_of_businesses` are created before `persons` to avoid the
 * circular foreign-key between `persons.teamId` and `teams(id)`.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // --- CHECK constraint expressions (generated from core constants) ----------
  const roleCheck = sql`role IN (${sql.join(ROLES.map((r: string) => sql.lit(r)))})`;
  const productTypeCheck = sql`type IN (${sql.join(
    PRODUCT_TYPES.map((t: string) => sql.lit(t)),
  )})`;
  const lifecycleCheck = sql`lifecycle IN (${sql.join(
    COMPONENT_LIFECYCLE.map((l: string) => sql.lit(l)),
  )})`;
  const categoryCheck = sql`category IN (${sql.join(
    COMPONENT_CATEGORIES.map((c: string) => sql.lit(c)),
  )})`;
  const providerCheck = sql`provider IN (${sql.join(
    COMPONENT_PROVIDERS.map((p: string) => sql.lit(p)),
  )})`;
  const environmentCheck = sql`environment IN (${sql.join(
    ENVIRONMENTS.map((e: string) => sql.lit(e)),
  )})`;
  const instanceStatusCheck = sql`status IN (${sql.join(
    INSTANCE_STATUS.map((s: string) => sql.lit(s)),
  )})`;
  const importRunStatusCheck = sql`status IN (${sql.join(
    IMPORT_RUN_STATUS.map((s: string) => sql.lit(s)),
  )})`;

  // --- 6. line_of_businesses (created early; referenced by digital_products) -
  await db.schema
    .createTable("line_of_businesses")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .addColumn("description", "text")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // --- 7. teams (created before persons to resolve the circular FK) ---------
  await db.schema
    .createTable("teams")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .addColumn("description", "text")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // --- 1. persons -----------------------------------------------------------
  await db.schema
    .createTable("persons")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("username", "text", (col) => col.notNull().unique())
    .addColumn("passwordHash", "text")
    .addColumn("oidcSubject", "text", (col) => col.unique())
    .addColumn("role", "text", (col) =>
      col.notNull().defaultTo("VIEWER"),
    )
    .addColumn("displayName", "text")
    .addColumn("email", "text")
    .addColumn("teamId", "uuid", (col) =>
      col.references("teams.id").onDelete("set null"),
    )
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .addColumn("isActive", "boolean", (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint("persons_role_check", roleCheck)
    .execute();

  // --- 2. sessions ----------------------------------------------------------
  await db.schema
    .createTable("sessions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("userId", "uuid", (col) =>
      col.notNull().references("persons.id").onDelete("cascade"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("lastSeenAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("expiresAt", "timestamptz", (col) => col.notNull())
    .addColumn("revokedAt", "timestamptz")
    .execute();

  await db.schema
    .createIndex("sessions_user_id_idx")
    .on("sessions")
    .column("userId")
    .execute();
  await db.schema
    .createIndex("sessions_expires_at_idx")
    .on("sessions")
    .column("expiresAt")
    .execute();

  // --- 3. password_reset_tokens ---------------------------------------------
  await db.schema
    .createTable("password_reset_tokens")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("userId", "uuid", (col) =>
      col.notNull().references("persons.id").onDelete("cascade"),
    )
    .addColumn("tokenHash", "text", (col) => col.notNull())
    .addColumn("expiresAt", "timestamptz", (col) => col.notNull())
    .addColumn("usedAt", "timestamptz")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("password_reset_tokens_token_hash_idx")
    .unique()
    .on("password_reset_tokens")
    .column("tokenHash")
    .execute();
  await db.schema
    .createIndex("password_reset_tokens_user_id_idx")
    .on("password_reset_tokens")
    .column("userId")
    .execute();

  // --- 4. oidc_config (singleton row, id = 1) -------------------------------
  await db.schema
    .createTable("oidc_config")
    .addColumn("id", "integer", (col) => col.primaryKey())
    .addColumn("enabled", "boolean", (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn("issuer", "text")
    .addColumn("clientId", "text")
    .addColumn("clientSecretRef", "text")
    .addColumn("roleClaimPath", "text")
    .addColumn("claimValueField", "text")
    .addColumn("roleMapping", "jsonb")
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint("oidc_config_singleton_check", sql`id = 1`)
    .execute();

  // --- 5. app_settings ------------------------------------------------------
  await db.schema
    .createTable("app_settings")
    .addColumn("key", "text", (col) => col.primaryKey())
    .addColumn("value", "jsonb", (col) => col.notNull())
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // --- 8. digital_products --------------------------------------------------
  await db.schema
    .createTable("digital_products")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .addColumn("description", "text")
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("lifecycle", "text", (col) =>
      col.notNull().defaultTo("ACTIVE"),
    )
    .addColumn("lobOwnerId", "uuid", (col) =>
      col.references("line_of_businesses.id").onDelete("set null"),
    )
    .addColumn("teamOwnerId", "uuid", (col) =>
      col.references("teams.id").onDelete("set null"),
    )
    .addColumn("createdBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("updatedBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint("digital_products_type_check", productTypeCheck)
    .addCheckConstraint("digital_products_lifecycle_check", lifecycleCheck)
    .execute();

  await db.schema
    .createIndex("digital_products_slug_idx")
    .on("digital_products")
    .column("slug")
    .execute();
  await db.schema
    .createIndex("digital_products_lob_owner_id_idx")
    .on("digital_products")
    .column("lobOwnerId")
    .execute();
  await db.schema
    .createIndex("digital_products_team_owner_id_idx")
    .on("digital_products")
    .column("teamOwnerId")
    .execute();

  // --- 9. component_groups --------------------------------------------------
  await db.schema
    .createTable("component_groups")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .addColumn("description", "text")
    .addColumn("teamOwnerId", "uuid", (col) =>
      col.references("teams.id").onDelete("set null"),
    )
    .addColumn("createdBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("updatedBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // --- 10. components -------------------------------------------------------
  await db.schema
    .createTable("components")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .addColumn("category", "text", (col) => col.notNull())
    .addColumn("provider", "text", (col) => col.notNull())
    .addColumn("resourceType", "text", (col) => col.notNull())
    .addColumn("lifecycle", "text", (col) =>
      col.notNull().defaultTo("ACTIVE"),
    )
    .addColumn("teamOwnerId", "uuid", (col) =>
      col.references("teams.id").onDelete("set null"),
    )
    .addColumn("componentGroupId", "uuid", (col) =>
      col.references("component_groups.id").onDelete("set null"),
    )
    .addColumn("externalId", "text")
    .addColumn("details", "jsonb")
    .addColumn("createdBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("updatedBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint("components_category_check", categoryCheck)
    .addCheckConstraint("components_provider_check", providerCheck)
    .addCheckConstraint("components_lifecycle_check", lifecycleCheck)
    .execute();

  await db.schema
    .createIndex("components_slug_idx")
    .on("components")
    .column("slug")
    .execute();
  await db.schema
    .createIndex("components_category_idx")
    .on("components")
    .column("category")
    .execute();
  await db.schema
    .createIndex("components_provider_idx")
    .on("components")
    .column("provider")
    .execute();
  await db.schema
    .createIndex("components_team_owner_id_idx")
    .on("components")
    .column("teamOwnerId")
    .execute();
  await db.schema
    .createIndex("components_component_group_id_idx")
    .on("components")
    .column("componentGroupId")
    .execute();
  await db.schema
    .createIndex("components_external_id_idx")
    .on("components")
    .column("externalId")
    .execute();

  // --- 11. component_instances ----------------------------------------------
  await db.schema
    .createTable("component_instances")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("componentId", "uuid", (col) =>
      col.notNull().references("components.id").onDelete("cascade"),
    )
    .addColumn("environment", "text", (col) => col.notNull())
    .addColumn("url", "text")
    .addColumn("region", "text")
    .addColumn("status", "text", (col) =>
      col.notNull().defaultTo("RUNNING"),
    )
    .addColumn("version", "text")
    .addColumn("deployedAt", "timestamptz")
    .addColumn("rawConfig", "jsonb")
    .addColumn("externalId", "text", (col) => col.notNull())
    .addColumn("createdBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("updatedBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      "component_instances_environment_check",
      environmentCheck,
    )
    .addCheckConstraint(
      "component_instances_status_check",
      instanceStatusCheck,
    )
    .addUniqueConstraint("component_instances_component_external_idx", [
      "componentId",
      "externalId",
    ])
    .execute();

  await db.schema
    .createIndex("component_instances_component_id_idx")
    .on("component_instances")
    .column("componentId")
    .execute();
  await db.schema
    .createIndex("component_instances_environment_idx")
    .on("component_instances")
    .column("environment")
    .execute();
  await db.schema
    .createIndex("component_instances_external_id_idx")
    .on("component_instances")
    .column("externalId")
    .execute();

  // --- 12. product_composes (DAG junction) ----------------------------------
  await db.schema
    .createTable("product_composes")
    .addColumn("parentId", "uuid", (col) =>
      col.notNull().references("digital_products.id").onDelete("cascade"),
    )
    .addColumn("childId", "uuid", (col) =>
      col.notNull().references("digital_products.id").onDelete("cascade"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint("product_composes_pkey", [
      "parentId",
      "childId",
    ])
    .execute();

  // --- 13. product_consumes_from --------------------------------------------
  await db.schema
    .createTable("product_consumes_from")
    .addColumn("consumerId", "uuid", (col) =>
      col.notNull().references("digital_products.id").onDelete("cascade"),
    )
    .addColumn("platformId", "uuid", (col) =>
      col.notNull().references("digital_products.id").onDelete("cascade"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint("product_consumes_from_pkey", [
      "consumerId",
      "platformId",
    ])
    .execute();

  // --- 14. product_depends_on_component -------------------------------------
  await db.schema
    .createTable("product_depends_on_component")
    .addColumn("productId", "uuid", (col) =>
      col.notNull().references("digital_products.id").onDelete("cascade"),
    )
    .addColumn("componentId", "uuid", (col) =>
      col.notNull().references("components.id").onDelete("cascade"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint("product_depends_on_component_pkey", [
      "productId",
      "componentId",
    ])
    .execute();

  // --- 15. component_depends_on_component -----------------------------------
  await db.schema
    .createTable("component_depends_on_component")
    .addColumn("parentId", "uuid", (col) =>
      col.notNull().references("components.id").onDelete("cascade"),
    )
    .addColumn("childId", "uuid", (col) =>
      col.notNull().references("components.id").onDelete("cascade"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint("component_depends_on_component_pkey", [
      "parentId",
      "childId",
    ])
    .execute();

  // --- 16. component_sources_from -------------------------------------------
  await db.schema
    .createTable("component_sources_from")
    .addColumn("serviceId", "uuid", (col) =>
      col.notNull().references("components.id").onDelete("cascade"),
    )
    .addColumn("repositoryId", "uuid", (col) =>
      col.notNull().references("components.id").onDelete("cascade"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint("component_sources_from_pkey", [
      "serviceId",
      "repositoryId",
    ])
    .execute();

  // --- 17. component_exposes ------------------------------------------------
  await db.schema
    .createTable("component_exposes")
    .addColumn("serviceId", "uuid", (col) =>
      col.notNull().references("components.id").onDelete("cascade"),
    )
    .addColumn("apiId", "uuid", (col) =>
      col.notNull().references("components.id").onDelete("cascade"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint("component_exposes_pkey", [
      "serviceId",
      "apiId",
    ])
    .execute();

  // --- 18. importer_configs -------------------------------------------------
  await db.schema
    .createTable("importer_configs")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("importerName", "text", (col) => col.notNull())
    .addColumn("label", "text", (col) => col.notNull())
    .addColumn("config", "jsonb", (col) => col.notNull())
    .addColumn("secretRefs", "jsonb")
    .addColumn("scope", "jsonb")
    .addColumn("schedule", "text")
    .addColumn("enabled", "boolean", (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn("createdBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("updatedBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updatedAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // --- 19. import_runs ------------------------------------------------------
  await db.schema
    .createTable("import_runs")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("configId", "uuid", (col) =>
      col.notNull().references("importer_configs.id").onDelete("cascade"),
    )
    .addColumn("status", "text", (col) =>
      col.notNull().defaultTo("PENDING"),
    )
    .addColumn("triggeredBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("startedAt", "timestamptz")
    .addColumn("completedAt", "timestamptz")
    .addColumn("assetsProcessed", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("assetsCreated", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("assetsUpdated", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("instancesOrphaned", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("componentsRetired", "integer", (col) =>
      col.notNull().defaultTo(0),
    )
    .addColumn("errorMessage", "text")
    .addColumn("errorStack", "text")
    .addColumn("errorType", "text")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint("import_runs_status_check", importRunStatusCheck)
    .execute();

  // --- 20. import_run_errors ------------------------------------------------
  await db.schema
    .createTable("import_run_errors")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("runId", "uuid", (col) =>
      col.notNull().references("import_runs.id").onDelete("cascade"),
    )
    .addColumn("assetExternalId", "text")
    .addColumn("errorType", "text", (col) => col.notNull())
    .addColumn("errorMessage", "text", (col) => col.notNull())
    .addColumn("errorStack", "text")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // --- 21. entity_changes ---------------------------------------------------
  await db.schema
    .createTable("entity_changes")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("entityType", "text", (col) => col.notNull())
    .addColumn("entityId", "uuid", (col) => col.notNull())
    .addColumn("action", "text", (col) => col.notNull())
    .addColumn("changes", "jsonb")
    .addColumn("createdBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("createdByName", "text")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // --- 22. edge_changes -----------------------------------------------------
  await db.schema
    .createTable("edge_changes")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("edgeType", "text", (col) => col.notNull())
    .addColumn("fromEntityType", "text", (col) => col.notNull())
    .addColumn("fromEntityId", "uuid", (col) => col.notNull())
    .addColumn("toEntityType", "text", (col) => col.notNull())
    .addColumn("toEntityId", "uuid", (col) => col.notNull())
    .addColumn("action", "text", (col) => col.notNull())
    .addColumn("reason", "text")
    .addColumn("createdBy", "uuid", (col) =>
      col.references("persons.id").onDelete("set null"),
    )
    .addColumn("createdByName", "text")
    .addColumn("createdAt", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // --- 23. kysely_migration (Kysely's own bookkeeping table) ----------------
  await db.schema
    .createTable("kysely_migration")
    .addColumn("name", "varchar(255)", (col) => col.primaryKey())
    .addColumn("timestamp", "bigint", (col) => col.notNull())
    .execute();

  // --- 24. kysely_migration_lock (Kysely's migration lock) ------------------
  await db.schema
    .createTable("kysely_migration_lock")
    .addColumn("id", "varchar(255)", (col) => col.primaryKey())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Drop in reverse dependency order. Junction/audit tables first, then
  // core entities, then the persons/teams/lobs foundation.
  await db.schema.dropTable("kysely_migration_lock").ifExists().execute();
  await db.schema.dropTable("kysely_migration").ifExists().execute();
  await db.schema.dropTable("edge_changes").ifExists().execute();
  await db.schema.dropTable("entity_changes").ifExists().execute();
  await db.schema.dropTable("import_run_errors").ifExists().execute();
  await db.schema.dropTable("import_runs").ifExists().execute();
  await db.schema.dropTable("importer_configs").ifExists().execute();
  await db.schema.dropTable("component_exposes").ifExists().execute();
  await db.schema.dropTable("component_sources_from").ifExists().execute();
  await db.schema
    .dropTable("component_depends_on_component")
    .ifExists()
    .execute();
  await db.schema
    .dropTable("product_depends_on_component")
    .ifExists()
    .execute();
  await db.schema.dropTable("product_consumes_from").ifExists().execute();
  await db.schema.dropTable("product_composes").ifExists().execute();
  await db.schema.dropTable("component_instances").ifExists().execute();
  await db.schema.dropTable("components").ifExists().execute();
  await db.schema.dropTable("component_groups").ifExists().execute();
  await db.schema.dropTable("digital_products").ifExists().execute();
  await db.schema.dropTable("app_settings").ifExists().execute();
  await db.schema.dropTable("oidc_config").ifExists().execute();
  await db.schema.dropTable("password_reset_tokens").ifExists().execute();
  await db.schema.dropTable("sessions").ifExists().execute();
  await db.schema.dropTable("persons").ifExists().execute();
  await db.schema.dropTable("teams").ifExists().execute();
  await db.schema.dropTable("line_of_businesses").ifExists().execute();
}
