import { describe, it, expect } from "vitest";
import {
  slugify,
  generateUniqueSlug,
  generateComponentSlug,
  generateInstanceSlug,
} from "../../src/utils/slug.js";

describe("slug utils", () => {
  describe("slugify", () => {
    it("lowercases and replaces non-alphanumeric with hyphens", () => {
      expect(slugify("My Cool Repo!")).toBe("my-cool-repo");
    });

    it("trims leading and trailing separators", () => {
      expect(slugify("  --Foo Bar--  ")).toBe("foo-bar");
    });

    it("collapses multiple separators", () => {
      expect(slugify("a!!!b")).toBe("a-b");
    });

    it("returns empty string for empty input", () => {
      expect(slugify("")).toBe("");
    });
  });

  describe("generateUniqueSlug", () => {
    it("returns the base slug when it does not exist", async () => {
      const slug = await generateUniqueSlug("base", async () => false);
      expect(slug).toBe("base");
    });

    it("appends an incrementing suffix on collisions", async () => {
      let calls = 0;
      const exists = async (s: string) => {
        calls++;
        return s !== "base-3";
      };
      const slug = await generateUniqueSlug("base", exists);
      expect(slug).toBe("base-3");
      expect(calls).toBe(3);
    });
  });

  describe("generateComponentSlug", () => {
    it("uses the name when available", () => {
      expect(generateComponentSlug("My Service", "ext-123")).toBe("my-service");
    });

    it("falls back to externalId when name is empty", () => {
      expect(generateComponentSlug("", "ext-123")).toBe("ext-123");
    });
  });

  describe("generateInstanceSlug", () => {
    it("combines component, environment, and externalId slugs", () => {
      expect(generateInstanceSlug("my-service", "PRODUCTION", "i-1")).toBe("my-service-production-i-1");
    });
  });
});
