# Data Model: RFC 7807 Error Wrapping

**Feature**: RFC 7807 Error Wrapping (`008`)

This feature introduces no database tables, migrations, or persistent entities. It defines a runtime data contract and a code-level mapping.

## Entity: `Problem`

The RFC 7807 problem document returned to API clients.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string (URI) | Yes | Absolute `https` URI identifying the problem category, e.g., `https://componode.io/problems/AUTH_FORBIDDEN`. |
| `title` | string | Yes | Short, human-readable summary, e.g., "Forbidden". |
| `status` | integer | Yes | HTTP status code, e.g., `403`. |
| `detail` | string | Yes | Human-readable explanation specific to this occurrence. |
| `instance` | string (URI) | No | URI identifying the specific occurrence; may be omitted in v1. |
| `code` | string | Yes | Componode machine-readable error code (preserved as extension). |
| `message` | string | Yes | Componode human-readable message (preserved as extension). |
| `details` | any | No | Additional context such as retry-after seconds or the legacy validation object. |
| `invalid-params` | `Array<{ name: string, reason: string }>` | No | RFC 9457 extension for validation errors. |

### Validation rules

- `type` MUST be a stable absolute URI derived from the error `code`.
- `status` MUST match the HTTP response status code.
- `code` and `message` MUST be present at the top level for backward compatibility.
- `invalid-params` MUST be an array of objects with `name` and `reason` strings when validation fails with multiple fields.

## Entity: `ErrorType`

The mapping between a Componode error code and its problem `type` URI.

| Field | Type | Description |
|---|---|---|
| `code` | string | Componode error code from the controlled `ERROR_CODES` set. |
| `type` | string (URI) | Absolute `https` URI for the problem type. |
| `title` | string | Default human-readable title for this error category. |
| `status` | integer | Default HTTP status code for this error category. |

### Relationships

- `ErrorType` is a one-to-one lookup from each `code` to one `type` URI.
- Multiple problem instances can share the same `ErrorType`.

## No database changes

No tables, columns, or migrations are introduced. The `Problem` and `ErrorType` entities are runtime values constructed by the backend error handler and referenced by the OpenAPI schema.
