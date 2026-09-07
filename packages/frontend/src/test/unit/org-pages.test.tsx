import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LobsPage } from "@/pages/lobs";
import { TeamsPage } from "@/pages/teams";

vi.mock("@/api/hooks/auth", () => ({
  useSession: vi.fn(() => ({ data: { role: "EDITOR" } })),
}));

const mockList = vi.fn();
const mutateAsync = vi.fn();
const delMutate = vi.fn(async () => undefined);

vi.mock("@/api/hooks/org", () => ({
  useLobs: () => mockList("lobs"),
  useTeams: () => mockList("teams"),
  useCreateLob: () => ({ mutateAsync }),
  useUpdateLob: () => ({ mutateAsync }),
  useDeleteLob: () => ({ mutateAsync: delMutate }),
  useCreateTeam: () => ({ mutateAsync }),
  useUpdateTeam: () => ({ mutateAsync }),
  useDeleteTeam: () => ({ mutateAsync: delMutate }),
  useTeamMembers: vi.fn(() => ({
    data: { members: [{ id: "m1", username: "alice", displayName: "Alice", slug: "alice" }] },
    isPending: false,
  })),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const entities = [
  { id: "e1", name: "Revenue", slug: "revenue", description: null, createdAt: "", updatedAt: "" },
];

describe("Org pages", () => {
  it("lobs page lists entities with create affordance for editors", () => {
    mockList.mockReturnValue({
      data: { lobs: entities },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <LobsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Revenue")).toBeDefined();
    expect(screen.getByRole("button", { name: /new/i })).toBeDefined();
  });

  it("teams page expands a read-only roster", () => {
    mockList.mockReturnValue({
      data: { teams: entities },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /show members/i }));
    expect(screen.getByText(/Alice/)).toBeDefined();
  });

  it("surfaces 409 REFERENCED on delete", async () => {
    delMutate.mockRejectedValueOnce({
      code: "REFERENCED",
      message: "still referenced",
      details: { counts: { products: 2, groups: 0, components: 0, members: 1 } },
    });
    mockList.mockReturnValue({
      data: { teams: entities },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]!); // row delete (trash) button
    expect(
      await screen.findByText(/Cannot delete Revenue/i),
    ).toBeDefined();
  });
});
