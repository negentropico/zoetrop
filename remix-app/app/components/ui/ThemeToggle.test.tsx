// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Reset documentElement data-theme and localStorage before each test
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("zt-theme");
  });

  afterEach(() => {
    // Ensure Testing Library renders are cleaned up between tests
    cleanup();
  });

  it("renders with initial aria-label for light mode (default)", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Switch to dark theme");
  });

  it("renders with light-mode aria-label when data-theme is light", () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Switch to dark theme");
  });

  it("renders with dark-mode aria-label when data-theme is dark", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Switch to light theme");
  });

  it("clicking toggle sets data-theme to dark and writes localStorage", async () => {
    const user = userEvent.setup();
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    await user.click(button);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("zt-theme")).toBe("dark");
  });

  it("clicking toggle twice returns to light and writes localStorage", async () => {
    const user = userEvent.setup();
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    await user.click(button); // light → dark
    await user.click(button); // dark → light

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("zt-theme")).toBe("light");
  });

  it("aria-label updates after toggle click", async () => {
    const user = userEvent.setup();
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    expect(button.getAttribute("aria-label")).toBe("Switch to dark theme");
    await user.click(button);
    expect(button.getAttribute("aria-label")).toBe("Switch to light theme");
  });
});
