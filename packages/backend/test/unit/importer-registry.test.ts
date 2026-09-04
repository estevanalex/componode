import { describe, it, expect } from "vitest";
import { getManifests, getManifest, getImporter } from "../../src/services/importer-registry.js";
import type { Importer } from "@componode/core";

describe("importer registry", () => {
  it("returns the github manifest", async () => {
    const manifests = await getManifests();
    const github = manifests.find((m) => m.name === "github");
    expect(github).toBeDefined();
    expect(github?.label).toBe("GitHub");
    expect(github?.configSchema).toBeDefined();
  });

  it("getManifest returns a manifest by name", async () => {
    const manifest = await getManifest("github");
    expect(manifest.name).toBe("github");
  });

  it("getManifest throws for unknown importers", async () => {
    await expect(getManifest("unknown")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("getImporter returns a github importer instance", async () => {
    const importer = await getImporter("github");
    expect(importer.name).toBe("github");
    expect(typeof importer.run).toBe("function");
  });

  it("getImporter throws for unknown importers", async () => {
    await expect(getImporter("unknown")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
