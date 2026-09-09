import { describe, it, expect } from "vitest";
import { loadSpec } from "../../scripts/generate-api-doc.js";

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

interface ContentEntry {
  schema?: { $ref?: string };
}

interface Response {
  description?: string;
  content?: Record<string, ContentEntry>;
  $ref?: string;
}

describe("OpenAPI error responses", () => {
  const spec = loadSpec();
  const problemSchemaRef = "#/components/schemas/Problem";

  function resolveResponse(response: Response): Response {
    if (response?.$ref) {
      const key = response.$ref.split("/").pop()!;
      const resolved = (spec.components?.responses ?? {})[key];
      return resolved ? { ...resolved } : response;
    }
    return response;
  }

  it("defines a Problem schema", () => {
    const schemas = spec.components?.schemas ?? {};
    expect(schemas.Problem).toBeDefined();
  });

  it("every error response references the Problem schema", () => {
    const missing: string[] = [];

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const method of METHODS) {
        const op = methods[method];
        if (!op) continue;

        const responses = (op.responses as Record<string, Response> | undefined) ?? {};

        for (const [status, raw] of Object.entries(responses)) {
          if (!status.startsWith("4") && !status.startsWith("5")) continue;

          // Health 503 is an operational status payload, not an error.
          if (path === "/health" && status === "503") continue;

          const response = resolveResponse(raw);
          const content = response?.content ?? {};
          const problem = content["application/problem+json"];
          if (!problem?.schema?.$ref || !problem.schema.$ref.endsWith("Problem")) {
            missing.push(`${method.toUpperCase()} ${path} ${status}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("does not use the legacy Error schema", () => {
    const text = JSON.stringify(spec);
    expect(text).not.toContain("#/components/schemas/Error");
  });
});
