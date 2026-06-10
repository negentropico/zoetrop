import { describe, it, expect } from "vitest";
import { calculatePearsonCorrelation } from "~/lib/correlations";

describe("calculatePearsonCorrelation", () => {
  it("perfect positive correlation → 1", () => {
    expect(calculatePearsonCorrelation([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBeCloseTo(1.0, 10);
  });
  it("perfect negative correlation → -1", () => {
    expect(calculatePearsonCorrelation([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1.0, 10);
  });
  it("two-element positive → 1", () => {
    expect(calculatePearsonCorrelation([1, 3], [2, 4])).toBeCloseTo(1.0, 10);
  });
  it("constant y (zero denominator) → 0", () => {
    expect(calculatePearsonCorrelation([1, 2, 3, 4, 5], [3, 3, 3, 3, 3])).toBe(0);
  });
  it("empty arrays → 0", () => {
    expect(calculatePearsonCorrelation([], [])).toBe(0);
  });
  it("mismatched lengths → 0", () => {
    expect(calculatePearsonCorrelation([1, 2], [1, 2, 3])).toBe(0);
  });
  it("single element (zero variance) → 0", () => {
    expect(calculatePearsonCorrelation([5], [5])).toBe(0);
  });
});
