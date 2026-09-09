# Research: RFC 7807 Error Wrapping

**Feature**: RFC 7807 Error Wrapping (`008`)
**Date**: 2026-09-09

## RFC 7807 and RFC 9457

RFC 7807 ("Problem Details for HTTP APIs") defines a machine-readable error document format. RFC 9457 obsoletes RFC 7807 but retains the same field names and media type `application/problem+json`. The core fields are:

- `type` — a URI that identifies the problem type.
- `title` — a short, human-readable summary.
- `status` — the HTTP status code.
- `detail` — a human-readable explanation specific to this occurrence.
- `instance` — a URI that identifies the specific occurrence (optional).

Extensions are additional members whose names SHOULD be registered or prefixed.

## Decision: Additive, Backward-Compatible Migration

**Decision**: Wrap every existing error response in an RFC 7807 problem document and preserve the current `code`, `message`, and `details` fields as extension members.

**Rationale**:

- The frontend and existing tests rely on `code` as a machine-readable enum string. Removing it would require a broad frontend rewrite.
- RFC 7807 clients ignore unknown members, so the legacy fields do not interfere with standard parsers.
- The migration is purely additive: status codes, error codes, and semantics are unchanged.

## Type URI Scheme

**Decision**: Use `https://{canonical-domain}/problems/{code}`.

**Rationale**:

- Absolute `https` URIs are the most discoverable form recommended by RFC 7807.
- The path pattern is stable and deterministic.
- The base domain is configurable via an environment variable or build-time constant, defaulting to the project’s canonical domain.

**Alternatives considered**:

- Relative paths (`/problems/{code}`): simpler but only meaningful inside the API.
- URNs (`urn:componode:problem:{code}`): stable but not resolvable and less readable.
- `about:blank`: allowed by RFC 7807 but provides no discoverability.

## Validation Error Shape

**Decision**: Use the `invalid-params` extension from RFC 9457 as an array of `{ name, reason }` objects.

**Rationale**:

- RFC 9457 explicitly recommends `invalid-params` for validation errors.
- `{ name, reason }` is self-describing and easy for frontends to map back to form fields.
- The existing `details` extension is preserved unchanged for clients that already consume it.

## 500 Internal Errors

**Decision**: Map 500 responses to `type: https://{domain}/problems/INTERNAL_ERROR` with a generic `title` and `detail`.

**Rationale**:

- RFC 7807 requires a `type` URI even for unhandled failures.
- A single internal-error type avoids leaking implementation details.
- Stack traces remain server-side; they are only exposed when `DEBUG_ERROR_DETAILS=true` (already an existing environment variable).

## Content Negotiation

**Decision**: Always return `Content-Type: application/problem+json` for errors.

**Rationale**:

- RFC 7807 is a JSON media type; any JSON parser can read the body.
- Conditional negotiation adds complexity without benefit because `problem+json` is a subtype of `application/json` semantically.
- The `Accept` header does not change the body fields.

## Test Migration

**Decision**: Keep existing assertions on `code`, `message`, and `details`; add new focused tests for `type`, `title`, `status`, and `invalid-params`.

**Rationale**:

- Preserves the existing test suite as a backward-compatibility regression guard.
- New tests make the RFC 7807 contract explicit without duplicating every existing error test.
