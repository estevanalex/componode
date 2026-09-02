import { describe, it, expect } from "vitest";
import { validateDiscoveredAsset } from "../../src/validation/discovered-asset.js";

const baseAsset = {
  category: "COMPUTE" as const,
  provider: "AWS" as const,
  resourceType: "ec2:instance",
  name: "Web Server",
  externalId: "arn:aws:ec2:us-east-1:123:instance/i-123",
  environments: [
    {
      environment: "PRODUCTION" as const,
      externalId: "i-123-prod",
    },
  ],
  details: null,
};

describe("validateDiscoveredAsset", () => {
  it("accepts a valid discovered asset with per-instance externalId", () => {
    expect(validateDiscoveredAsset(baseAsset)).toBe(true);
  });

  it("rejects an instance missing externalId", () => {
    expect(
      validateDiscoveredAsset({
        ...baseAsset,
        environments: [{ environment: "PRODUCTION" }],
      }),
    ).toBe(false);
  });

  it("rejects an empty instance externalId", () => {
    expect(
      validateDiscoveredAsset({
        ...baseAsset,
        environments: [{ environment: "PRODUCTION", externalId: "" }],
      }),
    ).toBe(false);
  });

  it("rejects a null instance externalId", () => {
    expect(
      validateDiscoveredAsset({
        ...baseAsset,
        environments: [{ environment: "PRODUCTION", externalId: null }],
      }),
    ).toBe(false);
  });
});
