# Contract: User API

**Feature**: 001-foundation
**Base path**: `/api/v1`
**Auth**: Session cookie required. Admin role required for all endpoints except GET /users/me.

All responses use the standard error format `{code, message, details?}` (ADR-071).

---

## GET /users

List all users. Admin only.

**Query params**: `search` (optional, filters by username/displayName), `role` (optional, filters by role), `isActive` (optional, boolean)

**Response 200**:
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "string",
      "role": "ADMIN | EDITOR | VIEWER",
      "displayName": "string | null",
      "email": "string | null",
      "teamId": "uuid | null",
      "isActive": true,
      "createdAt": "timestamptz",
      "updatedAt": "timestamptz"
    }
  ]
}
```

---

## GET /users/me

Get the current authenticated user. Available to all roles.

**Response 200**:
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "ADMIN | EDITOR | VIEWER",
    "displayName": "string | null",
    "email": "string | null",
    "teamId": "uuid | null"
  }
}
```

---

## GET /users/:id

Get a single user by ID. Admin only.

**Response 200**: Same as list item shape.

**Errors**:
- `404` `NOT_FOUND` — user not found

---

## POST /users

Create a new user (admin-created, not self-registration). Admin only.

**Request body**:
```json
{
  "username": "string (3-50 chars, lowercase, alphanumeric + _ -)",
  "password": "string (8-128 chars)",
  "role": "ADMIN | EDITOR | VIEWER",
  "displayName": "string (optional, max 100 chars)",
  "email": "string (optional, valid email)",
  "teamId": "uuid (optional)"
}
```

**Response 201**: Created user (same as list item shape, no password).

**Errors**:
- `409` `AUTH_USERNAME_TAKEN` — username already exists
- `422` `VALIDATION_FAILED` — invalid input

---

## PATCH /users/:id

Update a user. Admin only.

**Request body** (all fields optional):
```json
{
  "role": "ADMIN | EDITOR | VIEWER",
  "displayName": "string (max 100 chars)",
  "email": "string (valid email)",
  "teamId": "uuid | null",
  "isActive": true
}
```

**Response 200**: Updated user.

**Errors**:
- `404` `NOT_FOUND` — user not found
- `422` `VALIDATION_FAILED` — invalid input

---

## GET /users/:id/sessions

List active sessions for a user. Admin only (users view their own via GET /sessions).

**Response 200**:
```json
{
  "sessions": [
    {
      "id": "string (session token — masked, last 4 chars only)",
      "createdAt": "timestamptz",
      "lastSeenAt": "timestamptz",
      "expiresAt": "timestamptz"
    }
  ]
}
```

**Note**: The session `id` is masked in the list response (showing only the last 4 characters) to prevent token exposure in the admin UI. Full session tokens are never returned by the API.
