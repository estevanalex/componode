import { describe, it, expect } from "vitest";
import { loadSpec } from "../../scripts/generate-api-doc.js";

describe("OpenAPI Problem schema", () => {
  const spec = loadSpec();

  it("has the standard RFC 7807 fields", () => {
    const schema = (spec.components?.schemas ?? {}).Problem as { properties: Record<string, unknown>; required: string[] } | undefined;
    expect(schema).toBeDefined();

    const fields = ["type", "title", "status", "detail"];
    for (const field of fields) {
      expect(schema?.properties).toHaveProperty(field);
      expect(schema?.required).toContain(field);
    }
  });

  it("has the Componode extension fields", () => {
    const schema = (spec.components?.schemas ?? {}).Problem as { properties: Record<string, unknown> } | undefined;
    expect(schema).toBeDefined();
    expect(schema?.properties).toHaveProperty("code");
    expect(schema?.properties).toHaveProperty("message");
    expect(schema?.properties).toHaveProperty("details");
    expect(schema?.properties).toHaveProperty("invalid-params");
  });
});
