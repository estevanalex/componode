# Feature Specification: RFC 7807 Error Wrapping

**Feature Branch**: `008-rfc-7807-errors`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "RFC 7807 error wrapping" (selected from the v1.1 roadmap; standardize API error responses to the RFC 7807 `problem+json` format while preserving Componode's existing machine-readable error codes).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Standard, Machine-Readable API Errors (Priority: P1)

As an API client developer, I want every error response from Componode to follow a well-known, documented standard so that I can handle errors with off-the-shelf tooling and generic error-handling code instead of learning a custom envelope.

**Why this priority**: External integrators and future clients cannot reliably consume a custom `{code, message, details?}` envelope. RFC 7807 (`problem+json`) is the de-facto HTTP API error standard and reduces integration friction.

**Independent Test**: A client sends an invalid request to a protected endpoint and receives an `application/problem+json` response that an RFC 7807 parser can read.

**Acceptance Scenarios**:

1. **Given** a client sends a request without a session cookie to a protected endpoint, **When** the server rejects it, **Then** the response has `Content-Type: application/problem+json` and includes `type`, `title`, `status`, and the existing Componode `code` as an extension.
2. **Given** a client submits invalid input to a form, **When** validation fails, **Then** the response is `application/problem+json` with `status: 400` and the validation details are exposed under a standard extension field without leaking internal stack traces.
3. **Given** a client requests a resource that does not exist, **When** the server returns a 404, **Then** the response is `application/problem+json` with a stable `type` URI identifying a "not found" problem.

---

### User Story 2 - Backward Compatibility for Existing Clients (Priority: P2)

As the maintainer of the Componode frontend, I want the existing `code`, `message`, and `details` fields to remain present in error responses so that the current frontend error-handling logic continues to work without a rewrite.

**Why this priority**: The frontend is the primary API client in v1. The RFC 7807 migration must be additive: the new envelope adds standard fields but does not remove or rename fields the frontend already depends on.

**Independent Test**: The existing frontend unit and integration tests that assert on `code` and `message` continue to pass after the migration.

**Acceptance Scenarios**:

1. **Given** the frontend receives an `AUTH_FORBIDDEN` error, **When** it reads the response body, **Then** `code: "AUTH_FORBIDDEN"` and `message` are still present at the top level alongside the new RFC 7807 fields.
2. **Given** the frontend handles a validation error, **When** it inspects `details`, **Then** the content is identical in shape and value to the pre-migration response.

---

### User Story 3 - Accurate API Documentation (Priority: P3)

As an API consumer reading the Componode documentation, I want the OpenAPI reference to describe the new problem response format so that I can generate correct client code and understand the error contract.

**Why this priority**: A standards-based error contract is only valuable if it is discoverable. The docs site and OpenAPI spec must reflect the new format.

**Independent Test**: The generated OpenAPI page shows a reusable `Problem` schema and every error response references it.

**Acceptance Scenarios**:

1. **Given** the OpenAPI reference is generated, **When** an error response is rendered, **Then** the schema shown is the RFC 7807 `Problem` schema with the Componode `code` extension documented.
2. **Given** the docs site is published, **When** a visitor opens the API reference, **Then** the error response section explains the `problem+json` format and the meaning of `type` URIs.

### Edge Cases

- What happens if a client sends `Accept: application/json` instead of `application/problem+json`?
- How are validation errors with multiple fields represented in the RFC 7807 `invalid-params` extension?
- What `type` URI is used for generic internal errors without leaking implementation details?
- How does the system handle 500-class errors under RFC 7807 while still preventing stack-trace leakage?
- What happens to the existing test suite that asserts the exact shape of the error envelope?
- How are unknown routes (404 not found) represented as RFC 7807 problems?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The API MUST return all error responses using the RFC 7807 `application/problem+json` media type.
- **FR-002**: Every problem document MUST contain a stable `type` URI that identifies the error category, plus `title`, `status`, and `detail` fields consistent with RFC 7807.
- **FR-003**: The API MUST preserve the existing Componode `code`, `message`, and `details` fields inside the RFC 7807 document as extension members so existing clients remain compatible.
- **FR-004**: The HTTP status code in the problem document's `status` field MUST match the actual HTTP response status code.
- **FR-005**: The API MUST continue to omit stack traces, SQL, and internal paths from problem documents unless an explicit debug mode is enabled.
- **FR-006**: Validation errors with multiple fields MUST be exposed through the standard RFC 7807 `invalid-params` extension using the field name and a human-readable message for each violation.
- **FR-007**: Unknown routes and resource-not-found errors MUST be returned as RFC 7807 problems with `status: 404`.
- **FR-008**: The OpenAPI reference MUST define a reusable `Problem` schema and update every error response to reference it.

### Key Entities

- **Problem**: The RFC 7807 error document returned to API clients. Contains standard fields and Componode-specific extensions.
- **ErrorType**: The mapping from a Componode error code to a stable `type` URI. Maintained as a controlled set alongside the existing error code list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A generic RFC 7807 client can parse any Componode error response without custom parsing logic.
- **SC-002**: 100% of existing backend integration tests that expect errors still pass, with the same `code` and `message` values.
- **SC-003**: The OpenAPI reference's `Problem` schema is referenced by every documented error response.
- **SC-004**: No error response in the test suite leaks stack traces, SQL, or internal file paths.
- **SC-005**: The generated docs site displays the new `Problem` schema and a description of the error format on the API reference page.

## Assumptions

- The RFC 7807 migration is additive; the existing `{code, message, details?}` envelope values are preserved as extension members.
- The frontend is the primary consumer in v1 and does not need to be rewritten to consume the new `type` or `title` fields immediately.
- `type` URIs are stable and can be relative to the Componode API (e.g., `/problems/AUTH_FORBIDDEN`) or absolute URNs; they do not need to be resolvable web pages.
- The existing controlled error code set remains the source of truth for the `code` extension.
- No new error codes or HTTP status code semantics are introduced by this feature; only the response envelope format changes.
