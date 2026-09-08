import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../../api/client.js";

describe("api client with RFC 7807 problem responses", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws an ApiError with code and message from a problem+json response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      headers: new Map([["content-type", "application/problem+json"]]),
      json: async () => ({
        type: "https://componode.io/problems/AUTH_NO_SESSION",
        title: "Authentication required",
        status: 401,
        detail: "Authentication required",
        code: "AUTH_NO_SESSION",
        message: "Not authenticated",
      }),
    } as unknown as Response);

    await expect(api("/settings")).rejects.toMatchObject({
      code: "AUTH_NO_SESSION",
      message: "Not authenticated",
    });
  });

  it("preserves details on a problem+json validation error", async () => {
    const details = {
      username: "Username is required",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: new Map([["content-type", "application/problem+json"]]),
      json: async () => ({
        type: "https://componode.io/problems/VALIDATION_FAILED",
        title: "Validation failed",
        status: 400,
        detail: "Validation failed",
        code: "VALIDATION_FAILED",
        message: "Invalid input",
        details,
        "invalid-params": [{ name: "username", reason: "Username is required" }],
      }),
    } as unknown as Response);

    await expect(api("/users")).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Invalid input",
      details,
    });
  });

  it("still accepts legacy application/json error responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      headers: new Map([["content-type", "application/json"]]),
      json: async () => ({
        code: "AUTH_FORBIDDEN",
        message: "Forbidden",
      }),
    } as unknown as Response);

    await expect(api("/users")).rejects.toEqual({
      code: "AUTH_FORBIDDEN",
      message: "Forbidden",
    });
  });
});
