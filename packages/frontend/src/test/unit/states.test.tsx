import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/vitest";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Forbidden } from "@/components/states/forbidden";
import { StatusBadge } from "@/components/states/status-badge";

afterEach(() => {
  cleanup();
});

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("EmptyState", () => {
  it("renders icon, title, description, and action link", () => {
    renderWithRouter(
      <EmptyState
        icon={Package}
        title="No items"
        description="Get started by adding one."
        action={{ label: "Add", to: "/add" }}
      />,
    );

    expect(screen.getByText("No items")).toBeDefined();
    expect(screen.getByText("Get started by adding one.")).toBeDefined();

    const link = screen.getByRole("link", { name: "Add" });
    expect(link).toHaveAttribute("href", "/add");
  });
});

describe("ErrorState", () => {
  it("renders retry button that calls onRetry", () => {
    const onRetry = vi.fn();
    render(<ErrorState error={{ message: "Something failed" }} onRetry={onRetry} />);

    const button = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("Forbidden", () => {
  it("renders access denied with no retry button", () => {
    renderWithRouter(<Forbidden />);

    expect(screen.getByText("Access denied")).toBeDefined();
    expect(
      screen.getByText("You don't have permission to view this page."),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();

    const link = screen.getByRole("link", { name: "Back to dashboard" });
    expect(link).toHaveAttribute("href", "/");
  });
});

describe("StatusBadge", () => {
  it("maps ERROR and GONE to destructive classes", () => {
    const { rerender } = render(<StatusBadge status="ERROR" />);
    expect(screen.getByText("ERROR")).toHaveClass("text-destructive");

    rerender(<StatusBadge status="GONE" />);
    expect(screen.getByText("GONE")).toHaveClass("text-destructive");
  });

  it("maps RETIRED to muted classes", () => {
    render(<StatusBadge status="RETIRED" />);
    expect(screen.getByText("RETIRED")).toHaveClass("text-muted-foreground");
  });
});
