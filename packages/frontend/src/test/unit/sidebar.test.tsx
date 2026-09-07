import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("@/api/hooks/auth", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/api/hooks/auth";
const mockUseSession = vi.mocked(useSession);

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

beforeEach(() => {
  mockUseSession.mockReturnValue({
    data: { id: "1", username: "alice", role: "ADMIN" },
  } as ReturnType<typeof useSession>);
});

describe("Sidebar", () => {
  it("renders grouped sections with all nav items for admins", () => {
    renderSidebar();
    expect(screen.getByText("Catalog")).toBeDefined();
    expect(screen.getByText("Sources")).toBeDefined();
    expect(screen.getByText("Administration")).toBeDefined();
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Component Groups")).toBeDefined();
    expect(screen.getByText("Importers")).toBeDefined();
    expect(screen.getByText("Users")).toBeDefined();
  });

  it("hides the Administration section for non-admin users", () => {
    mockUseSession.mockReturnValue({
      data: { id: "2", username: "bob", role: "VIEWER" },
    } as ReturnType<typeof useSession>);
    renderSidebar();
    expect(screen.queryByText("Administration")).toBeNull();
    expect(screen.queryByText("Users")).toBeNull();
    expect(screen.getByText("Components")).toBeDefined();
  });

  it("marks the active route", () => {
    render(
      <MemoryRouter initialEntries={["/components"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    const link = screen.getByText("Components").closest("a");
    expect(link?.getAttribute("aria-current")).toBe("page");
  });

  it("collapses to icons and persists the choice in sessionStorage", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(sessionStorage.getItem("sidebar-collapsed")).toBe("true");
    expect(screen.getByTestId("sidebar").dataset.collapsed).toBe("true");
    // Section labels hidden when collapsed
    expect(screen.queryByText("Catalog")).toBeNull();
  });
});
