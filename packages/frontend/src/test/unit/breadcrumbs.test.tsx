import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import {
  CrumbLabelProvider,
  useSetCrumbLabel,
} from "@/components/layout/crumb-context";

afterEach(cleanup);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>,
  );
}

describe("Breadcrumbs", () => {
  it("renders nothing on the dashboard root", () => {
    const { container } = renderAt("/");
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders section crumb linking to its root on list pages", () => {
    renderAt("/components");
    const crumb = screen.getByText("Components");
    expect(crumb.getAttribute("aria-current")).toBe("page");
  });

  it("renders section link + id page crumb on detail pages", () => {
    renderAt("/components/0192f9d4-7c3a-7b2e-8f4a-1234567890ab");
    const link = screen.getByText("Components");
    expect(link.closest("a")?.getAttribute("href")).toBe("/components");
    expect(
      screen.getByText("0192f9d4-7c3a-7b2e-8f4a-1234567890ab"),
    ).toBeDefined();
  });

  it("replaces the final UUID crumb with the page-provided slug", () => {
    function SetLabel() {
      useSetCrumbLabel("payments-api");
      return null;
    }
    render(
      <MemoryRouter
        initialEntries={["/components/0192f9d4-7c3a-7b2e-8f4a-1234567890ab"]}
      >
        <CrumbLabelProvider>
          <Breadcrumbs />
          <SetLabel />
        </CrumbLabelProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("payments-api")).toBeDefined();
    expect(
      screen.queryByText("0192f9d4-7c3a-7b2e-8f4a-1234567890ab"),
    ).toBeNull();
  });
});
