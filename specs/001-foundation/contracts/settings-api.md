# Contract: Settings API

**Feature**: 001-foundation
**Base path**: `/api/v1`
**Auth**: Session cookie required. Admin role required for all mutation endpoints.

All responses use the standard error format `{code, message, details?}` (ADR-071).

---

## GET /settings

Get all application settings. Admin only.

**Response 200**:
```json
{
  "settings": {
    "allowSelfRegistration": false,
    "sessionIdleTimeoutMs": 1440000,
    "sessionAbsoluteTimeoutMs": 43200000,
    "defaultUserRole": "VIEWER"
  }
}
```

---

## PATCH /settings

Update application settings. Admin only.

**Request body** (all fields optional):
```json
{
  "allowSelfRegistration": true,
  "sessionIdleTimeoutMs": 1440000,
  "sessionAbsoluteTimeoutMs": 43200000,
  "defaultUserRole": "VIEWER"
}
```

**Response 200**: Updated settings (same shape as GET).

**Errors**:
- `422` `VALIDATION_FAILED` — invalid value (e.g. timeout < 60000ms, role not in enum)

---

## GET /settings/oidc

Get OIDC configuration. Admin only.

**Response 200**:
```json
{
  "oidc": {
    "enabled": false,
    "issuer": "string | null",
    "clientId": "string | null",
    "clientSecretRef": "string | null",
    "roleClaimPath": "string | null",
    "claimValueField": "string | null",
    "roleMapping": {
      "admin-group": "ADMIN",
      "editor-group": "EDITOR",
      "default": "VIEWER"
    }
  }
}
```

**Note**: `clientSecretRef` is returned (it's a reference, not the secret itself). The actual secret is resolved server-side via `SecretResolver` and never sent to the client.

---

## PUT /settings/oidc

Update OIDC configuration. Admin only.

**Request body**:
```json
{
  "enabled": true,
  "issuer": "https://idp.example.com",
  "clientId": "componode",
  "clientSecretRef": "env:OIDC_CLIENT_SECRET",
  "roleClaimPath": "groups",
  "claimValueField": "name",
  "roleMapping": {
    "admins": "ADMIN",
    "editors": "EDITOR",
    "default": "VIEWER"
  }
}
```

**Response 200**: Updated OIDC config (same shape as GET).

**Errors**:
- `422` `VALIDATION_FAILED` — invalid config (e.g. enabled=true but issuer empty)
- `422` `OIDC_DISCOVERY_FAILED` — issuer URL unreachable or doesn't serve OIDC discovery
