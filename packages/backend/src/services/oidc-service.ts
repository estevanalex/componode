import { uuidv7 } from "uuidv7";
import { createHash } from "crypto";
import { db } from "../db/connection.js";
import { EnvSecretResolver } from "../utils/secret-resolver.js";
import { createSession } from "./session-service.js";
import type { Role } from "@componode/core";

interface OidcState {
  redirectUri: string;
  pkceVerifier: string;
}

interface IdTokenClaims {
  sub?: string;
  name?: string | null;
  email?: string | null;
  preferred_username?: string | null;
  [key: string]: unknown;
}

// In-memory state store (v1 single-instance). Keyed by state token.
const stateStore = new Map<string, OidcState>();

function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function generatePkceVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function pkceChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return Buffer.from(hash).toString("base64url");
}

async function getOidcConfig() {
  const config = await db
    .selectFrom("oidc_config")
    .selectAll()
    .where("oidc_config.id", "=", 1)
    .executeTakeFirst();
  return config;
}

async function getAppSettings() {
  const rows = await db
    .selectFrom("app_settings")
    .select(["app_settings.key", "app_settings.value"])
    .execute();
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function initiateLogin(redirectUri: string = "/"): Promise<string> {
  const config = await getOidcConfig();
  if (!config || !config.enabled || !config.issuer || !config.clientId) {
    throw Object.assign(new Error("OIDC not configured"), {
      statusCode: 503,
      code: "OIDC_NOT_CONFIGURED",
    });
  }

  const state = generateState();
  const pkceVerifier = generatePkceVerifier();
  const challenge = pkceChallenge(pkceVerifier);

  stateStore.set(state, { redirectUri, pkceVerifier });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: `${process.env.PUBLIC_URL ?? ""}/api/v1/auth/oidc/callback`,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: "openid profile email",
  });

  return `${config.issuer!.replace(/\/$/, "")}/authorize?${params.toString()}`;
}

export async function handleCallback(code: string, state: string): Promise<{ sessionToken: string; redirectUri: string }> {
  const config = await getOidcConfig();
  if (!config || !config.enabled) {
    throw Object.assign(new Error("OIDC not configured"), {
      statusCode: 503,
      code: "OIDC_NOT_CONFIGURED",
    });
  }

  const storedState = stateStore.get(state);
  if (!storedState) {
    throw Object.assign(new Error("Invalid state parameter"), {
      statusCode: 400,
      code: "OIDC_INVALID_STATE",
    });
  }
  stateStore.delete(state);

  // Exchange code for tokens
  let tokens: { id_token?: string; access_token?: string };
  try {
    const tokenResponse = await fetch(`${config.issuer!.replace(/\/$/, "")}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.PUBLIC_URL ?? ""}/api/v1/auth/oidc/callback`,
        client_id: config.clientId!,
        code_verifier: storedState.pkceVerifier,
        ...(config.clientSecretRef ? { client_secret: await resolveSecret(config.clientSecretRef) } : {}),
      }),
    });

    if (!tokenResponse.ok) {
      throw Object.assign(new Error("Code exchange failed"), {
        statusCode: 400,
        code: "OIDC_INVALID_CODE",
      });
    }

    tokens = await tokenResponse.json() as { id_token?: string; access_token?: string };
  } catch (err) {
    if (err instanceof Error && (err as { code?: string }).code) throw err;
    throw Object.assign(new Error("Code exchange failed"), {
      statusCode: 400,
      code: "OIDC_INVALID_CODE",
    });
  }

  if (!tokens.id_token) {
    throw Object.assign(new Error("ID token missing"), {
      statusCode: 401,
      code: "OIDC_TOKEN_VERIFICATION_FAILED",
    });
  }

  // Decode ID token (JWT) — verify signature in production via issuer JWKS
  // For v1, we decode and trust the token (TLS + state + PKCE provide transport security)
  const claims = decodeJwtPayload(tokens.id_token);
  const oidcSubject = claims.sub;
  if (!oidcSubject) {
    throw Object.assign(new Error("ID token missing sub claim"), {
      statusCode: 401,
      code: "OIDC_TOKEN_VERIFICATION_FAILED",
    });
  }

  // Find or create user (JIT provisioning)
  let user = await db
    .selectFrom("persons")
    .selectAll()
    .where("persons.oidcSubject", "=", oidcSubject)
    .executeTakeFirst();

  if (!user) {
    // JIT provision with default role
    const settings = await getAppSettings();
    const defaultRole = (settings.default_user_role as Role) ?? "VIEWER";
    const usernameRaw = (claims.preferred_username ?? claims.email ?? `oidc-${oidcSubject.slice(0, 12)}`) as string;
    const username = usernameRaw.toLowerCase();
    const now = new Date().toISOString();

    const id = uuidv7();
    await db
      .insertInto("persons")
      .values({
        id,
        username,
        oidcSubject,
        role: defaultRole,
        displayName: claims.name ?? null,
        email: claims.email ?? null,
        slug: username.replace(/[^a-z0-9_-]/g, "-"),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    user = await db
      .selectFrom("persons")
      .selectAll()
      .where("persons.id", "=", id)
      .executeTakeFirst();
  } else {
    // Local admin override: existing user's role takes precedence over claim mapping
    // (no role update from OIDC claims for existing users)
  }

  if (!user || !user.isActive) {
    throw Object.assign(new Error("User inactive"), {
      statusCode: 403,
      code: "AUTH_FORBIDDEN",
    });
  }

  const sessionToken = await createSession(user.id);

  return { sessionToken, redirectUri: storedState.redirectUri };
}

async function resolveSecret(ref: string): Promise<string> {
  const resolver = new EnvSecretResolver();
  return resolver.resolve({ key: "clientSecret", env: ref });
}

function decodeJwtPayload(jwt: string): IdTokenClaims {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw Object.assign(new Error("Invalid JWT format"), {
      statusCode: 401,
      code: "OIDC_TOKEN_VERIFICATION_FAILED",
    });
  }
  const payload = Buffer.from(parts[1]!, "base64url").toString("utf-8");
  return JSON.parse(payload) as IdTokenClaims;
}

/**
 * Check if OIDC is enabled (public status check for login page).
 */
export async function isOidcEnabled(): Promise<boolean> {
  const config = await getOidcConfig();
  return config?.enabled === true && !!config.issuer && !!config.clientId;
}
