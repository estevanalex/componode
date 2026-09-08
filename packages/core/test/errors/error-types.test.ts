import { describe, it, expect } from "vitest";
import { ERROR_TYPES, getErrorType, isErrorCode } from "../../src/constants/error-types.js";
import { ERROR_CODES } from "../../src/constants/error-codes.js";

describe("ERROR_TYPES", () => {
  it("maps every ERROR_CODE to an ErrorType", () => {
    for (const code of ERROR_CODES) {
      const errorType = ERROR_TYPES[code];
      expect(errorType).toBeDefined();
      expect(errorType.code).toBe(code);
      expect(errorType.status).toBeGreaterThanOrEqual(400);
      expect(errorType.status).toBeLessThan(600);
      expect(errorType.title).toBeTruthy();
    }
  });
});

describe("getErrorType", () => {
  it("returns the matching ErrorType for a known code", () => {
    const errorType = getErrorType("NOT_FOUND");
    expect(errorType.code).toBe("NOT_FOUND");
    expect(errorType.status).toBe(404);
    expect(errorType.title).toBe("Not found");
  });

  it("returns a generic 500 ErrorType for an unknown code", () => {
    const errorType = getErrorType("UNKNOWN_CODE" as never);
    expect(errorType.status).toBe(500);
    expect(errorType.title).toBe("Internal server error");
  });
});

describe("isErrorCode", () => {
  it("returns true for valid error codes", () => {
    expect(isErrorCode("AUTH_FORBIDDEN")).toBe(true);
    expect(isErrorCode("VALIDATION_FAILED")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isErrorCode("not-a-code")).toBe(false);
    expect(isErrorCode(123)).toBe(false);
    expect(isErrorCode(null)).toBe(false);
  });
});
