// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { StatusBadge } from "./StatusBadge";
import type { Status } from "./StatusBadge";

describe("StatusBadge", () => {
  afterEach(() => {
    cleanup();
  });

  const cases: Array<{ status: Status; glyph: string; label: string }> = [
    { status: "optimal",    glyph: "✓", label: "OPTIMAL" },
    { status: "borderline", glyph: "~", label: "BORDERLINE" },
    { status: "deficient",  glyph: "↓", label: "DEFICIENT" },
    { status: "excess",     glyph: "↑", label: "EXCESS" },
  ];

  cases.forEach(({ status, glyph, label }) => {
    it(`renders glyph "${glyph}" for status "${status}"`, () => {
      render(<StatusBadge status={status} />);
      // The glyph span is aria-hidden; find by text content
      const badge = screen.getByText((content, element) => {
        return element?.getAttribute("aria-hidden") === "true" && content.includes(glyph);
      });
      expect(badge).toBeTruthy();
    });

    it(`renders label "${label}" for status "${status}"`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  // Canonical status tokens (round 3, W0): atoms read --optimal/--borderline/
  // --deficient/--excess (+ -bg), which alias the old success/warning/danger values.
  it("renders optimal badge with --optimal color and --optimal-bg background", () => {
    const { container } = render(<StatusBadge status="optimal" />);
    const span = container.querySelector("span");
    expect(span?.style.color).toBe("var(--optimal)");
    expect(span?.style.background).toBe("var(--optimal-bg)");
  });

  it("renders borderline badge with --borderline color and --borderline-bg background", () => {
    const { container } = render(<StatusBadge status="borderline" />);
    const span = container.querySelector("span");
    expect(span?.style.color).toBe("var(--borderline)");
    expect(span?.style.background).toBe("var(--borderline-bg)");
  });

  it("renders deficient badge with --deficient color and --deficient-bg background", () => {
    const { container } = render(<StatusBadge status="deficient" />);
    const span = container.querySelector("span");
    expect(span?.style.color).toBe("var(--deficient)");
    expect(span?.style.background).toBe("var(--deficient-bg)");
  });

  it("renders excess badge with --excess color and --excess-bg background", () => {
    const { container } = render(<StatusBadge status="excess" />);
    const span = container.querySelector("span");
    expect(span?.style.color).toBe("var(--excess)");
    expect(span?.style.background).toBe("var(--excess-bg)");
  });
});
