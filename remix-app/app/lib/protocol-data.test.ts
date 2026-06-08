import { describe, it, expect } from "vitest";
import { parseISO, addDays } from "date-fns";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/protocol-data";

// Cessation start is 2025-12-23T00:00:00.000Z. Always inject `now` (Pitfall 5) —
// never call getCessationDay() with no args in a test (would be date-coupled).
const START = parseISO("2025-12-23T00:00:00.000Z");
const day = (n: number) => addDays(START, n);

describe("getCessationDay (injectable now)", () => {
  for (const n of [1, 21, 22, 60, 61, 120, 121, 150, 151]) {
    it(`returns ${n} for now = start + ${n} days`, () => {
      expect(getCessationDay(day(n))).toBe(n);
    });
  }
  it("returns 0 at the start date", () => {
    expect(getCessationDay(START)).toBe(0);
  });
});

describe("getCurrentCessationPhase (.phase, not .name)", () => {
  const cases: Array<[number, string]> = [
    [-5, "acute"], // pre-start → clamp to first phase
    [0, "acute"], // the cessation start date (getCessationDay === 0) → acute, not optimization
    [1, "acute"],
    [21, "acute"],
    [22, "stabilization"],
    [60, "stabilization"],
    [61, "clearing"],
    [120, "clearing"],
    [121, "optimization"],
    [150, "optimization"],
    [151, "optimization"], // past the last range → falls back to the last phase
  ];
  for (const [d, phase] of cases) {
    it(`day ${d} → ${phase}`, () => {
      expect(getCurrentCessationPhase(d).phase).toBe(phase);
    });
  }
});
