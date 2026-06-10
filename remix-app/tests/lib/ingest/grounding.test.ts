import { describe, it, expect } from "vitest";
import { checkGrounding } from "~/lib/ingest/grounding";

describe("checkGrounding", () => {
  const pageTexts = [
    "Ferritin 45 ng/mL (15-150) NORMAL",
    "Hemoglobin 14.2 g/dL (13.5-17.5) NORMAL",
  ];

  it("snippet present in the correct page → grounded", () => {
    expect(checkGrounding("Ferritin 45 ng/mL", pageTexts, 1)).toBe("grounded");
  });

  it("snippet absent from all pages → low_confidence", () => {
    expect(checkGrounding("TSH 2.1 mIU/L", pageTexts, 1)).toBe("low_confidence");
  });

  it("snippet with irregular whitespace still matches (normalized) → grounded", () => {
    // PDF text layers often produce irregular spacing; normalize handles this
    const snippet = "Ferritin  45  ng/mL"; // double spaces
    expect(checkGrounding(snippet, pageTexts, 1)).toBe("grounded");
  });

  it("snippet present but wrong pageNumber → low_confidence", () => {
    // Snippet is on page 1 but caller passes page 2
    expect(checkGrounding("Ferritin 45 ng/mL", pageTexts, 2)).toBe("low_confidence");
  });

  it("snippet present in correct page (case insensitive match) → grounded", () => {
    expect(checkGrounding("FERRITIN 45 NG/ML", pageTexts, 1)).toBe("grounded");
  });

  it("pageNumber beyond pageTexts length → low_confidence (page doesn't exist)", () => {
    expect(checkGrounding("Ferritin 45 ng/mL", pageTexts, 5)).toBe("low_confidence");
  });

  it("empty snippet on non-empty page → grounded (empty string always contained)", () => {
    expect(checkGrounding("", pageTexts, 1)).toBe("grounded");
  });

  it("snippet present on second page → grounded when pageNumber is 2", () => {
    expect(checkGrounding("Hemoglobin 14.2", pageTexts, 2)).toBe("grounded");
  });

  it("snippet present on second page but pageNumber is 1 → low_confidence", () => {
    expect(checkGrounding("Hemoglobin 14.2", pageTexts, 1)).toBe("low_confidence");
  });
});
