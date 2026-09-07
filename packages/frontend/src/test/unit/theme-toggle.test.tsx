import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, ThemeToggle } from "@/components/theme-provider";
import { useTheme } from "next-themes";

function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme-probe">{theme}</div>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>
        dark
      </button>
      <button data-testid="set-light" onClick={() => setTheme("light")}>
        light
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("ThemeProvider", () => {
  it("defaults to system theme", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme-probe").textContent).toBe("system");
  });

  it("persists the selection to localStorage and applies the dark class", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId("set-dark"));
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(screen.getByTestId("theme-probe").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switching back to light removes the dark class", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId("set-dark"));
    fireEvent.click(screen.getByTestId("set-light"));
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("renders the theme toggle control", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).toBeDefined();
  });
});
