# Contract: RFC 7807 Problem Response

**Feature**: RFC 7807 Error Wrapping (`008`)

## API Error Contract

Every non-2xx response from `https://{host}/api/v1/...` uses the following contract.

### Content-Type

```text
Content-Type: application/problem+json
```

### Problem Object

```json
{
  "type": "https://componode.io/problems/AUTH_FORBIDDEN",
  "title": "Forbidden",
  "status": 403,
  "detail": "Insufficient permissions",
  "code": "AUTH_FORBIDDEN",
  "message": "Insufficient permissions"
}
```

### Field Semantics

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string (URI) | Yes | Absolute URI that identifies the problem type. Stable across releases. |
| `title` | string | Yes | Short human-readable summary of the problem. |
| `status` | integer | Yes | HTTP status code. Always matches the actual response status. |
| `detail` | string | Yes | Human-readable explanation of this occurrence. |
| `code` | string | Yes | Componode machine-readable error code (RFC 7807 extension). |
| `message` | string | Yes | Componode human-readable message (RFC 7807 extension). |
| `details` | any | No | Additional structured context (RFC 7807 extension). |
| `invalid-params` | array | No | Validation errors as `{ name, reason }` objects (RFC 9457 extension). |

### Validation Error Example

```json
{
  "type": "https://componode.io/problems/VALIDATION_FAILED",
  "title": "Validation failed",
  "status": 400,
  "detail": "Request validation failed",
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "details": {
    "field": "username",
    "issue": "required"
  },
  "invalid-params": [
    { "name": "username", "reason": "Username is required" },
    { "name": "email", "reason": "Must be a valid email address" }
  ]
}
```

### Internal Error Example

```json
{
  "type": "https://componode.io/problems/INTERNAL_ERROR",
  "title": "Internal server error",
  "status": 500,
  "detail": "An internal error occurred",
  "code": "INTERNAL_ERROR",
  "message": "An internal error occurred"
}
```

> Debug details (stack trace, internal path, SQL) are never included unless `DEBUG_ERROR_DETAILS=true` is set server-side.

### Versioning

The problem response contract is additive. The `code` and `message` extension fields are preserved for backward compatibility across v1.x releases.
