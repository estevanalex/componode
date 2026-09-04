import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ExternalLink } from "../../src/components/external-link";

afterEach(cleanup);

describe("ExternalLink", () => {
  it("renders an anchor tag with target=_blank", () => {
    render(<ExternalLink href="https://example.com">Example</ExternalLink>);
    const link = screen.getByRole("link", { name: "Example" });
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders with rel=noopener noreferrer to prevent tab-nabbing", () => {
    render(<ExternalLink href="https://example.com">Example</ExternalLink>);
    const link = screen.getByRole("link", { name: "Example" });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders children content", () => {
    render(<ExternalLink href="https://example.com">Click here</ExternalLink>);
    expect(screen.getByText("Click here")).toBeTruthy();
  });

  it("passes through href attribute", () => {
    render(<ExternalLink href="https://example.com/path">Link</ExternalLink>);
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toHaveAttribute("href", "https://example.com/path");
  });

  it("applies className when provided", () => {
    render(
      <ExternalLink href="https://example.com" className="custom-class">
        Link
      </ExternalLink>,
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toHaveClass("custom-class");
  });
});
