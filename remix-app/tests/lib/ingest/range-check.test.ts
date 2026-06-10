import { describe, it, expect } from "vitest";
import { checkRange } from "~/lib/ingest/range-check";

describe("checkRange", () => {
  it("both bounds null → no_range_data", () => {
    expect(checkRange(50, null, null)).toBe("no_range_data");
  });

  it("value exactly at referenceMin → normal", () => {
    expect(checkRange(15, 15, 150)).toBe("normal");
  });

  it("value below referenceMin → below_reference", () => {
    expect(checkRange(14.9, 15, 150)).toBe("below_reference");
  });

  it("value exactly at referenceMax → normal", () => {
    expect(checkRange(150, 15, 150)).toBe("normal");
  });

  it("value above referenceMax → above_reference", () => {
    expect(checkRange(150.1, 15, 150)).toBe("above_reference");
  });

  it("value within range → normal", () => {
    expect(checkRange(75, 15, 150)).toBe("normal");
  });

  it("only min bound set, value below → below_reference", () => {
    expect(checkRange(30, 40, null)).toBe("below_reference");
  });

  it("only min bound set, value above min → normal", () => {
    expect(checkRange(60, 40, null)).toBe("normal");
  });

  it("only max bound set, value above → above_reference", () => {
    expect(checkRange(200, null, 130)).toBe("above_reference");
  });

  it("only max bound set, value below max → normal", () => {
    expect(checkRange(100, null, 130)).toBe("normal");
  });

  it("value exactly at min with max null → normal", () => {
    expect(checkRange(60, 60, null)).toBe("normal");
  });

  it("value exactly at max with min null → normal", () => {
    expect(checkRange(130, null, 130)).toBe("normal");
  });
});
