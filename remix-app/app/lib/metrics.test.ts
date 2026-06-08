import { describe, it, expect } from "vitest";
import { getMetricStatus } from "~/lib/metrics";
import type { Metric } from "~/types/metrics";

// Fixture factory — `as unknown as Metric` is acceptable in test fixtures only
// (CONVENTIONS.md §any Usage). Only value/referenceRange/optimalRange matter here.
function makeMetric(
  value: number,
  referenceRange?: { min: number; max: number },
  optimalRange?: { min: number; max: number }
): Metric {
  return {
    id: "test",
    name: "Test Metric",
    value,
    unit: "units",
    category: "vitamins",
    subcategory: "b-vitamins",
    timestamp: "2025-01-01T00:00:00.000Z",
    source: "manual",
    improvement: "target range",
    referenceRange,
    optimalRange,
    syncStatus: "local",
    syncVersion: 1,
  } as unknown as Metric;
}

// Contract lock for getMetricStatus. These cases encode the behavior of the
// (formerly inline) home.tsx form verbatim, so the extraction is behavior-stable.
// referenceRange [50,150], optimalRange [70,120] unless noted.
const REF = { min: 50, max: 150 };
const OPT = { min: 70, max: 120 };

describe("getMetricStatus", () => {
  it("value at optimal min → optimal", () => {
    expect(getMetricStatus(makeMetric(70, REF, OPT))).toBe("optimal");
  });
  it("value at optimal max → optimal", () => {
    expect(getMetricStatus(makeMetric(120, REF, OPT))).toBe("optimal");
  });
  it("value mid optimal → optimal", () => {
    expect(getMetricStatus(makeMetric(90, REF, OPT))).toBe("optimal");
  });
  it("value in ref, below optimal → borderline", () => {
    expect(getMetricStatus(makeMetric(60, REF, OPT))).toBe("borderline");
  });
  it("value in ref, above optimal → borderline", () => {
    expect(getMetricStatus(makeMetric(135, REF, OPT))).toBe("borderline");
  });
  it("value exactly at ref min (below optimal) → borderline", () => {
    expect(getMetricStatus(makeMetric(50, REF, OPT))).toBe("borderline");
  });
  it("value exactly at ref max → borderline", () => {
    expect(getMetricStatus(makeMetric(150, REF, OPT))).toBe("borderline");
  });
  it("value below ref min → deficient", () => {
    expect(getMetricStatus(makeMetric(30, REF, OPT))).toBe("deficient");
  });
  it("value above ref max → excess", () => {
    expect(getMetricStatus(makeMetric(200, REF, OPT))).toBe("excess");
  });
  it("no referenceRange and no optimalRange → optimal (defensive fallback)", () => {
    expect(getMetricStatus(makeMetric(42))).toBe("optimal");
  });
  it("no referenceRange, value outside optimalRange → optimal (locks the quirk)", () => {
    expect(getMetricStatus(makeMetric(50, undefined, OPT))).toBe("optimal");
  });
});
