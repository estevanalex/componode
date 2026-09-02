import { describe, it, expect, afterEach } from "vitest";
import { createElement } from "react";
import { render, cleanup, screen } from "@testing-library/react";
import { ExternalLink } from "@/components/external-link";

afterEach(() => {
  cleanup();
});

describe("ExternalLink", () => {
  it("renders an anchor with rel=noopener noreferrer and target=_blank", () => {
    const { container } = render(
      createElement(ExternalLink, { href: "https://example.com" }, "Example"),
    );
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor?.getAttribute("target")).toBe("_blank");
  });

  it("renders its children", () => {
    render(createElement(ExternalLink, { href: "https://example.com" }, "Click here"));
    expect(screen.getByText("Click here")).toBeDefined();
    expect(screen.getByRole("link")).toBeDefined();
  });

  it("passes through href and other props", () => {
    const { container } = render(
      createElement(
        ExternalLink,
        {
          href: "https://example.com",
          className: "ext",
          id: "ext-link",
          "aria-label": "External resource",
        },
        "x",
      ),
    );
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("https://example.com");
    expect(anchor?.getAttribute("class")).toBe("ext");
    expect(anchor?.getAttribute("id")).toBe("ext-link");
    expect(anchor?.getAttribute("aria-label")).toBe("External resource");
  });
});
