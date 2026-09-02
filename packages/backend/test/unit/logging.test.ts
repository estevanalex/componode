import { describe, it, expect } from "vitest";
import pino from "pino";
import { Writable } from "stream";

/**
 * Replicates the redact paths from src/plugins/logging.ts.
 *
 * NOTE: The redactPaths array is not exported from the logging plugin module,
 * so we re-declare the same paths here to verify the redaction behaviour. If
 * the source paths change, this test should be updated to match.
 */
const redactPaths = [
  "password",
  "passwordHash",
  "clientSecret",
  "secretRefs",
  "secrets",
  "secrets.*",
  "sessionToken",
  "sessionId",
  "authorization",
  "cookie",
  "oidcSubject",
  "email",
  "*.password",
  "*.passwordHash",
  "*.clientSecret",
  "*.secretRefs",
  "*.sessionToken",
  "*.authorization",
];

/** Creates a pino logger that writes to an in-memory buffer. */
function createCapturingLogger(): { logger: pino.Logger; output: () => string } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const logger = pino(
    {
      level: "info",
      redact: { paths: redactPaths, censor: "[REDACTED]" },
    },
    stream,
  );
  return { logger, output: () => chunks.join("") };
}

describe("logging redaction", () => {
  it("redacts top-level password/sessionToken/authorization fields", () => {
    const { logger, output } = createCapturingLogger();

    logger.info(
      {
        password: "super-secret-password",
        sessionToken: "abc123sessiontoken",
        authorization: "Bearer some-jwt-token",
        username: "alice",
      },
      "auth event",
    );

    const body = output();
    expect(body).toContain("[REDACTED]");
    expect(body).not.toContain("super-secret-password");
    expect(body).not.toContain("abc123sessiontoken");
    expect(body).not.toContain("Bearer some-jwt-token");
    // Non-sensitive fields are preserved
    expect(body).toContain("alice");
  });

  it("redacts nested password/passwordHash via wildcard paths", () => {
    const { logger, output } = createCapturingLogger();

    logger.info(
      {
        user: {
          username: "bob",
          password: "bob-password",
          passwordHash: "$argon2id$hashvalue",
        },
      },
      "user payload",
    );

    const body = output();
    expect(body).toContain("[REDACTED]");
    expect(body).not.toContain("bob-password");
    expect(body).not.toContain("$argon2id$hashvalue");
    expect(body).toContain("bob");
  });

  it("redacts authorization header in nested objects", () => {
    const { logger, output } = createCapturingLogger();

    logger.info(
      {
        request: {
          method: "POST",
          authorization: "Bearer secret-jwt",
        },
      },
      "request logged",
    );

    const body = output();
    expect(body).toContain("[REDACTED]");
    expect(body).not.toContain("Bearer secret-jwt");
    expect(body).toContain("POST");
  });

  it("redacts every sensitive occurrence when multiple are present", () => {
    const { logger, output } = createCapturingLogger();

    logger.info(
      {
        password: "p1",
        sessionToken: "s1",
        authorization: "a1",
        nested: { password: "p2", authorization: "a2" },
      },
      "multi",
    );

    const body = output();
    // None of the raw secrets should leak
    expect(body).not.toContain("p1");
    expect(body).not.toContain("s1");
    expect(body).not.toContain("a1");
    expect(body).not.toContain("p2");
    expect(body).not.toContain("a2");
    // And redaction markers should be present
    expect(body).toContain("[REDACTED]");
  });
});
