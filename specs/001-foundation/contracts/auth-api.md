# Contract: Auth API

**Feature**: 001-foundation
**Base path**: `/api/v1`
**Auth**: Session cookie (`componode_session`) + CSRF header for state-changing requests

All responses use the standard error format `{code, message, details?}` (ADR-071).
All endpoints are rate-limited (300 req/min per user, 5 login attempts/min per username).

---

## POST /auth/login

Authenticate with username/password (local auth). Creates a server-side session.

**Request body**:
```json
{
  "username": "string (3-50 chars, lowercase)",
  "password": "string (8-128 chars)"
}
```

**Response 200**:
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "ADMIN | EDITOR | VIEWER",
    "displayName": "string | null",
    "email": "string | null"
  }
}
```

Sets cookies:
- `componode_session` (HttpOnly, SameSite=Lax, Secure in prod) — session token
- `componode_csrf` (HttpOnly=false, SameSite=Lax) — CSRF double-submit token

**Errors**:
- `401` `AUTH_INVALID_CREDENTIALS` — wrong username or password
- `429` `AUTH_RATE_LIMITED` — too many attempts (details: `{retryAfter: seconds}`)

---

## POST /auth/logout

Revoke the current session. No request body.

**Response 204**: No content. Clears cookies.

**Errors**:
- `401` `AUTH_NO_SESSION` — no active session

---

## GET /auth/session

Check if the current session is valid. Used by the frontend auth guard.

**Response 200**:
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "ADMIN | EDITOR | VIEWER",
    "displayName": "string | null",
    "email": "string | null"
  }
}
```

**Errors**:
- `401` `AUTH_NO_SESSION` — no session or session expired

---

## POST /auth/register

Self-registration (only if `allow_self_registration` is enabled in app settings).

**Request body**:
```json
{
  "username": "string (3-50 chars, lowercase, alphanumeric + _ -)",
  "password": "string (8-128 chars)",
  "displayName": "string (optional, max 100 chars)"
}
```

**Response 201**:
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "VIEWER",
    "displayName": "string | null"
  }
}
```

Sets session + CSRF cookies (auto-login on registration).

**Errors**:
- `404` `NOT_FOUND` — self-registration disabled
- `409` `AUTH_USERNAME_TAKEN` — username already exists
- `422` `VALIDATION_FAILED` — invalid input (details: field errors)
- `429` `AUTH_RATE_LIMITED` — too many registrations from this IP

---

## POST /auth/oidc/login

Initiate OIDC login. Redirects to the IdP authorization endpoint.

**Query params**: `redirect_uri` (optional, default `/`)

**Response 302**: Redirect to IdP with `state` and `code_challenge` (PKCE S256).

**Errors**:
- `503` `OIDC_NOT_CONFIGURED` — OIDC is disabled or misconfigured

---

## GET /auth/oidc/callback

OIDC callback endpoint. Exchanges the authorization code for tokens, verifies the ID token, creates/updates the user (JIT provisioning), and creates a session.

**Query params**: `code`, `state`

**Response 302**: Redirect to `redirect_uri` (from state) on success, or `/login?error=oidc_failed` on failure.

**JIT provisioning**: If the OIDC subject doesn't exist in `persons`, create with role from `roleMapping.default` (default `VIEWER`). If claim matches a mapping key, use the mapped role. Local admin override: if the user exists, their local role takes precedence over claim mapping.

**Errors**:
- `400` `OIDC_INVALID_STATE` — state parameter mismatch (possible CSRF)
- `400` `OIDC_INVALID_CODE` — code exchange failed
- `401` `OIDC_TOKEN_VERIFICATION_FAILED` — ID token verification failed
- `503` `OIDC_NOT_CONFIGURED` — OIDC is disabled

---

## POST /auth/password/change

Change the current user's password (requires current password).

**Request body**:
```json
{
  "currentPassword": "string (8-128 chars)",
  "newPassword": "string (8-128 chars)"
}
```

**Response 204**: No content.

**Errors**:
- `401` `AUTH_INVALID_CREDENTIALS` — current password is wrong
- `422` `VALIDATION_FAILED` — new password doesn't meet requirements

---

## POST /auth/password/reset

Admin-only: generate a password reset token for a user.

**Request body**:
```json
{
  "userId": "uuid"
}
```

**Response 200**:
```json
{
  "resetToken": "string (43 chars, base64url)",
  "expiresAt": "timestamptz"
}
```

The reset token is displayed to the admin (out-of-band delivery is post-v1).

**Errors**:
- `403` `AUTH_FORBIDDEN` — not an admin
- `404` `NOT_FOUND` — user not found

---

## POST /auth/password/reset/confirm

Submit a password reset (public — no session required).

**Request body**:
```json
{
  "token": "string (43 chars, base64url)",
  "newPassword": "string (8-128 chars)"
}
```

**Response 204**: No content. Token is invalidated.

**Errors**:
- `400` `AUTH_RESET_TOKEN_INVALID` — token hash not found
- `400` `AUTH_RESET_TOKEN_EXPIRED` — token has expired
- `400` `AUTH_RESET_TOKEN_USED` — token already consumed
- `422` `VALIDATION_FAILED` — new password doesn't meet requirements
