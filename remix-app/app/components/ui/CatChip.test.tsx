// @vitest-environment jsdom
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { CatChip } from "./CatChip";
import type { LucideIcon } from "lucide-react";

// Stub Lucide icon — renders a plain SVG so we can test the chip rendering
const StubIcon: LucideIcon = (({
  size,
  strokeWidth,
  color,
  ...rest
}: {
  size?: number | string;
  strokeWidth?: number | string;
  color?: string;
  [key: string]: unknown;
}) => (
  <svg
    data-testid="stub-icon"
    width={size as number}
    height={size as number}
    strokeWidth={strokeWidth as number}
    stroke={color as string}
    {...(rest as React.SVGProps<SVGSVGElement>)}
  />
)) as unknown as LucideIcon;

describe("CatChip", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a span with the icon inside", () => {
    const { container } = render(<CatChip icon={StubIcon} />);
    const chip = container.querySelector("span");
    const icon = container.querySelector("[data-testid='stub-icon']");
    expect(chip).toBeTruthy();
    expect(icon).toBeTruthy();
  });

  it("neutral (no family): bg = var(--surface-2), color = var(--ink)", () => {
    const { container } = render(<CatChip icon={StubIcon} family={null} active={false} />);
    const chip = container.querySelector("span");
    expect(chip?.style.background).toBe("var(--surface-2)");
    expect(chip?.style.color).toBe("var(--ink)");
  });

  it("family=vital (no active): bg = var(--vital-50), color = var(--vital)", () => {
    const { container } = render(<CatChip icon={StubIcon} family="vital" active={false} />);
    const chip = container.querySelector("span");
    expect(chip?.style.background).toBe("var(--vital-50)");
    expect(chip?.style.color).toBe("var(--vital)");
  });

  it("family=energy (no active): bg = var(--energy-50), color = var(--energy)", () => {
    const { container } = render(<CatChip icon={StubIcon} family="energy" active={false} />);
    const chip = container.querySelector("span");
    expect(chip?.style.background).toBe("var(--energy-50)");
    expect(chip?.style.color).toBe("var(--energy)");
  });

  it("active=true inverts to ink bg + n-50 text regardless of family", () => {
    const { container } = render(<CatChip icon={StubIcon} family="vital" active={true} />);
    const chip = container.querySelector("span");
    expect(chip?.style.background).toBe("var(--ink)");
    expect(chip?.style.color).toBe("var(--n-50)");
  });

  it("active=true with null family also inverts", () => {
    const { container } = render(<CatChip icon={StubIcon} family={null} active={true} />);
    const chip = container.querySelector("span");
    expect(chip?.style.background).toBe("var(--ink)");
    expect(chip?.style.color).toBe("var(--n-50)");
  });

  it("icon size = round(size * 0.5) when size=40 → 20", () => {
    const { container } = render(<CatChip icon={StubIcon} size={40} />);
    const svg = container.querySelector("[data-testid='stub-icon']");
    expect(svg?.getAttribute("width")).toBe("20");
  });

  it("icon size = round(size * 0.5) when size=32 → 16", () => {
    const { container } = render(<CatChip icon={StubIcon} size={32} />);
    const svg = container.querySelector("[data-testid='stub-icon']");
    expect(svg?.getAttribute("width")).toBe("16");
  });
});
