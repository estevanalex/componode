import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GithubImporter } from "../src/importer.js";
import { NOOP_LOGGER, type ImporterContext } from "@componode/core";

function makeContext(): ImporterContext {
  return {
    runId: "run-1",
    logger: NOOP_LOGGER,
    signal: new AbortController().signal,
    reportPhase: vi.fn(),
  };
}

function makeRepo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 123,
    full_name: "testorg/repo",
    name: "repo",
    html_url: "https://github.com/testorg/repo",
    fork: false,
    archived: false,
    language: "TypeScript",
    topics: ["tag"],
    visibility: "public",
    default_branch: "main",
    updated_at: "2024-01-01T00:00:00Z",
    pushed_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("GithubImporter", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/orgs/testorg/repos") {
        return new Response(JSON.stringify([makeRepo()]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("yields a DiscoveredAsset for each repository", async () => {
    const importer = new GithubImporter();
    const context = makeContext();
    const assets = [];

    for await (const asset of importer.run({ org: "testorg" }, { token: "fake" }, context)) {
      assets.push(asset);
    }

    expect(assets).toHaveLength(1);
    expect(assets[0].category).toBe("REPOSITORY");
    expect(assets[0].provider).toBe("GITHUB");
    expect(assets[0].externalId).toBe("testorg/repo");
    expect(assets[0].instances).toHaveLength(1);
    expect(assets[0].instances[0].environment).toBe("PRODUCTION");
  });

  it("filters forks when includeForks is false", async () => {
    fetchSpy.mockImplementation(async () => {
      return new Response(
        JSON.stringify([makeRepo({ fork: true }), makeRepo({ full_name: "testorg/regular", name: "regular" })]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const importer = new GithubImporter();
    const assets = [];

    for await (const asset of importer.run({ org: "testorg" }, { token: "fake" }, makeContext())) {
      assets.push(asset);
    }

    expect(assets).toHaveLength(1);
    expect(assets[0].externalId).toBe("testorg/regular");
  });

  it("respects AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    const importer = new GithubImporter();
    const context: ImporterContext = {
      runId: "run-1",
      logger: NOOP_LOGGER,
      signal: controller.signal,
      reportPhase: vi.fn(),
    };

    const assets = [];
    for await (const asset of importer.run({ org: "testorg" }, { token: "fake" }, context)) {
      assets.push(asset);
    }

    expect(assets).toHaveLength(0);
  });
});
