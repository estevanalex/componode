import { describe, it, expect } from "vitest";
import { createProblem, buildProblemTypeUri, type Problem } from "../../src/errors/problem.js";

describe("createProblem", () => {
  it("builds an RFC 7807 Problem document with standard fields", () => {
    const problem = createProblem("NOT_FOUND", { message: "User not found" });

    expect(problem.type).toBe("https://componode.io/problems/NOT_FOUND");
    expect(problem.title).toBe("Not found");
    expect(problem.status).toBe(404);
    expect(problem.detail).toBe("User not found");
    expect(problem.code).toBe("NOT_FOUND");
    expect(problem.message).toBe("User not found");
  });

  it("uses a custom base URL when provided", () => {
    const problem = createProblem("AUTH_FORBIDDEN", {
      message: "Insufficient permissions",
      baseUrl: "https://example.com",
    });

    expect(problem.type).toBe("https://example.com/problems/AUTH_FORBIDDEN");
  });

  it("preserves legacy details as an extension", () => {
    const details = { retryAfter: 60 };
    const problem = createProblem("AUTH_RATE_LIMITED", { message: "Too many requests", details });

    expect(problem.details).toEqual(details);
  });

  it("exposes invalid-params for validation errors", () => {
    const invalidParams = [
      { name: "username", reason: "Username is required" },
      { name: "email", reason: "Must be a valid email address" },
    ];
    const problem = createProblem("VALIDATION_FAILED", { message: "Validation failed", invalidParams });

    expect(problem["invalid-params"]).toEqual(invalidParams);
  });

  it("omits invalid-params when the array is empty", () => {
    const problem = createProblem("VALIDATION_FAILED", { message: "Validation failed", invalidParams: [] });

    expect(problem["invalid-params"]).toBeUndefined();
  });

  it("falls back to the error type title when no message is provided", () => {
    const problem = createProblem("INTERNAL_ERROR");

    expect(problem.title).toBe("Internal server error");
    expect(problem.detail).toBe("Internal server error");
    expect(problem.message).toBe("Internal server error");
  });

  it("serializes a Problem document in under 1 ms", () => {
    const start = performance.now();
    const problem: Problem = createProblem("VALIDATION_FAILED", {
      message: "Validation failed",
      invalidParams: [
        { name: "username", reason: "Username is required" },
      ],
    });
    const serialized = JSON.stringify(problem);
    const end = performance.now();

    expect(serialized).toContain("\"type\":\"https://componode.io/problems/VALIDATION_FAILED\"");
    expect(end - start).toBeLessThan(1);
  });
});

describe("buildProblemTypeUri", () => {
  it("returns a stable type URI for an error code", () => {
    expect(buildProblemTypeUri("NOT_FOUND")).toBe("https://componode.io/problems/NOT_FOUND");
    expect(buildProblemTypeUri("NOT_FOUND", "https://example.com")).toBe("https://example.com/problems/NOT_FOUND");
  });
});
