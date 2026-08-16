import { db } from "../db/connection.js";
import type { UpdateSettingsInput, UpdateOidcConfigInput } from "@componode/core";

const DEFAULT_SETTINGS = {
  allowSelfRegistration: false,
  sessionIdleTimeoutMs: 1440000, // 4 hours
  sessionAbsoluteTimeoutMs: 43200000, // 12 hours
  defaultUserRole: "VIEWER" as const,
};

export async function getSettings() {
  const rows = await db
    .selectFrom("app_settings")
    .select(["app_settings.key", "app_settings.value"])
    .execute();

  const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function updateSettings(input: UpdateSettingsInput) {
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    await db
      .insertInto("app_settings")
      .values({ key, value, updatedAt: now })
      .onConflict((oc) =>
        oc.column("key").doUpdateSet({ value, updatedAt: now }),
      )
      .execute();
  }
  return getSettings();
}

export async function getOidcConfig() {
  const config = await db
    .selectFrom("oidc_config")
    .selectAll()
    .where("oidc_config.id", "=", 1)
    .executeTakeFirst();

  if (!config) {
    return {
      enabled: false,
      issuer: null,
      clientId: null,
      clientSecretRef: null,
      roleClaimPath: null,
      claimValueField: null,
      roleMapping: null,
      updatedAt: new Date().toISOString(),
    };
  }
  return config;
}

export async function updateOidcConfig(input: UpdateOidcConfigInput) {
  const now = new Date().toISOString();
  const values = {
    id: 1,
    enabled: input.enabled,
    issuer: input.issuer ?? null,
    clientId: input.clientId ?? null,
    clientSecretRef: input.clientSecretRef ?? null,
    roleClaimPath: input.roleClaimPath ?? null,
    claimValueField: input.claimValueField ?? null,
    roleMapping: input.roleMapping ?? null,
    updatedAt: now,
  };

  await db
    .insertInto("oidc_config")
    .values(values)
    .onConflict((oc) =>
      oc.column("id").doUpdateSet({
        enabled: values.enabled,
        issuer: values.issuer,
        clientId: values.clientId,
        clientSecretRef: values.clientSecretRef,
        roleClaimPath: values.roleClaimPath,
        claimValueField: values.claimValueField,
        roleMapping: values.roleMapping,
        updatedAt: now,
      }),
    )
    .execute();

  return getOidcConfig();
}
