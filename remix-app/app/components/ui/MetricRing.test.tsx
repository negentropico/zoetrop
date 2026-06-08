// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MetricRing } from "./MetricRing";

describe("MetricRing", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an SVG element", () => {
    const { container } = render(<MetricRing />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it('tone="vital" renders progress circle with stroke var(--vital)', () => {
    const { container } = render(<MetricRing tone="vital" value={0.5} />);
    const circles = container.querySelectorAll("circle");
    // The second circle is the progress arc (index 1)
    const progressCircle = circles[1];
    expect(progressCircle).toBeTruthy();
    expect(progressCircle.getAttribute("stroke")).toBe("var(--vital)");
  });

  it('tone="energy" renders progress circle with stroke var(--energy)', () => {
    const { container } = render(<MetricRing tone="energy" value={0.7} />);
    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    expect(progressCircle.getAttribute("stroke")).toBe("var(--energy)");
  });

  it('tone="focus" (default) renders progress circle with stroke var(--focus)', () => {
    const { container } = render(<MetricRing value={0.3} />);
    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    expect(progressCircle.getAttribute("stroke")).toBe("var(--focus)");
  });

  it("unknown tone falls back to var(--focus)", () => {
    const { container } = render(
      <MetricRing tone={"unknown" as "vital"} value={0.5} />
    );
    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    expect(progressCircle.getAttribute("stroke")).toBe("var(--focus)");
  });

  it("renders label when provided", () => {
    const { container } = render(<MetricRing label="42" />);
    const labelSpan = container.querySelector(".zt-readout");
    expect(labelSpan?.textContent).toBe("42");
  });

  it("renders sublabel when provided", () => {
    const { container } = render(<MetricRing sublabel="DAYS" />);
    const sublabelSpan = container.querySelector(".zt-eyebrow");
    expect(sublabelSpan?.textContent).toBe("DAYS");
  });

  it("renders children instead of label/sublabel when children present", () => {
    const { container, queryByText } = render(
      <MetricRing label="42" sublabel="DAYS">
        <span>custom</span>
      </MetricRing>
    );
    expect(container.querySelector(".zt-readout")).toBeNull();
    expect(queryByText("custom")).toBeTruthy();
  });

  it("renders two circles (track + progress)", () => {
    const { container } = render(<MetricRing />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
  });

  it("track circle uses trackColor prop", () => {
    const { container } = render(
      <MetricRing trackColor="var(--n-100)" />
    );
    const trackCircle = container.querySelectorAll("circle")[0];
    expect(trackCircle.getAttribute("stroke")).toBe("var(--n-100)");
  });
});
