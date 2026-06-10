// @vitest-environment jsdom
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Reset documentElement data-theme and localStorage before each test.
    // The component reads localStorage for initial state and useLayoutEffect
    // keeps data-theme in sync, so we seed localStorage to control the theme.
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("zt-theme");
  });

  afterEach(() => {
    // Ensure Testing Library renders are cleaned up between tests
    cleanup();
  });

  it("renders with initial aria-label for light mode (default, no stored preference)", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Switch to dark theme");
  });

  it("renders with light-mode aria-label when localStorage has light", () => {
    localStorage.setItem("zt-theme", "light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Switch to dark theme");
  });

  it("renders with dark-mode aria-label when localStorage has dark", () => {
    localStorage.setItem("zt-theme", "dark");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Switch to light theme");
  });

  it("useLayoutEffect sets data-theme from localStorage on mount (dark)", () => {
    localStorage.setItem("zt-theme", "dark");
    act(() => {
      render(<ThemeToggle />);
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("useLayoutEffect sets data-theme from localStorage on mount (light)", () => {
    localStorage.setItem("zt-theme", "light");
    act(() => {
      render(<ThemeToggle />);
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("clicking toggle sets data-theme to dark and writes localStorage", async () => {
    const user = userEvent.setup();
    localStorage.setItem("zt-theme", "light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    await user.click(button);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("zt-theme")).toBe("dark");
  });

  it("clicking toggle twice returns to light and writes localStorage", async () => {
    const user = userEvent.setup();
    localStorage.setItem("zt-theme", "light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    await user.click(button); // light → dark
    await user.click(button); // dark → light

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("zt-theme")).toBe("light");
  });

  it("aria-label updates after toggle click", async () => {
    const user = userEvent.setup();
    localStorage.setItem("zt-theme", "light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    expect(button.getAttribute("aria-label")).toBe("Switch to dark theme");
    await user.click(button);
    expect(button.getAttribute("aria-label")).toBe("Switch to light theme");
  });
});
