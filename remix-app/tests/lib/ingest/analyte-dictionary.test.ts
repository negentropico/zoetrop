import { describe, it, expect } from "vitest";
import { lookupAnalyte, ANALYTE_DICTIONARY } from "~/lib/ingest/analyte-dictionary";

describe("lookupAnalyte", () => {
  it("known exact key returns correct AnalyteEntry", () => {
    const entry = lookupAnalyte("ferritin");
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("Ferritin");
    expect(entry!.category).toBe("minerals");
    expect(entry!.unit).toBe("ng/mL");
    expect(entry!.referenceMin).toBe(15);
    expect(entry!.referenceMax).toBe(150);
  });

  it("unknown key returns null", () => {
    expect(lookupAnalyte("unknown-analyte-xyz")).toBeNull();
  });

  it("uppercase input is normalized → correct entry", () => {
    expect(lookupAnalyte("FERRITIN")).not.toBeNull();
    expect(lookupAnalyte("FERRITIN")!.name).toBe("Ferritin");
  });

  it("extra whitespace in input is normalized → correct entry", () => {
    expect(lookupAnalyte("  ferritin  ")).not.toBeNull();
  });

  it("mixed case with spaces → correct entry", () => {
    expect(lookupAnalyte("Total Cholesterol")).not.toBeNull();
    expect(lookupAnalyte("Total Cholesterol")!.category).toBe("lipids");
  });

  it("alias key for Vitamin D returns correct entry", () => {
    const byAlias1 = lookupAnalyte("vitamin d,25-oh,total");
    expect(byAlias1).not.toBeNull();
    expect(byAlias1!.name).toBe("Vitamin D (25-OH)");

    const byAlias2 = lookupAnalyte("25(oh)d");
    expect(byAlias2).not.toBeNull();
    expect(byAlias2!.name).toBe("Vitamin D (25-OH)");
  });

  it("hs-CRP aliases all resolve to the same entry", () => {
    const a = lookupAnalyte("hs-crp");
    const b = lookupAnalyte("hscrp");
    const c = lookupAnalyte("high-sensitivity c-reactive protein");
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(c).not.toBeNull();
    expect(a!.name).toBe(b!.name);
    expect(b!.name).toBe(c!.name);
  });

  it("TSH entry has correct category", () => {
    const entry = lookupAnalyte("tsh");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("hormones");
    expect(entry!.subcategory).toBe("thyroid");
  });

  it("entry with referenceMax is correctly returned (LDL-C)", () => {
    const entry = lookupAnalyte("ldl-c");
    expect(entry).not.toBeNull();
    expect(entry!.referenceMax).toBe(130);
    // Note: referenceMin may be 0 (from owner data) or null depending on the dictionary source
    expect(typeof entry!.referenceMin === "number" || entry!.referenceMin === null).toBe(true);
  });

  it("improvement field is one of the three valid values", () => {
    const validValues = [
      "higher is better",
      "lower is better",
      "target range",
    ] as const;
    for (const entry of Object.values(ANALYTE_DICTIONARY)) {
      expect(validValues).toContain(entry.improvement);
    }
  });
});

describe("ANALYTE_DICTIONARY", () => {
  it("is a non-empty Record", () => {
    expect(Object.keys(ANALYTE_DICTIONARY).length).toBeGreaterThan(0);
  });

  it("covers standard common panels (D-03)", () => {
    // CBC
    expect(lookupAnalyte("hemoglobin")).not.toBeNull();
    expect(lookupAnalyte("wbc")).not.toBeNull();
    expect(lookupAnalyte("hematocrit")).not.toBeNull();
    expect(lookupAnalyte("platelets")).not.toBeNull();

    // CMP / metabolic
    expect(lookupAnalyte("glucose")).not.toBeNull();
    expect(lookupAnalyte("creatinine")).not.toBeNull();
    expect(lookupAnalyte("sodium")).not.toBeNull();
    expect(lookupAnalyte("potassium")).not.toBeNull();
    expect(lookupAnalyte("albumin")).not.toBeNull();

    // Lipids
    expect(lookupAnalyte("ldl-c")).not.toBeNull();
    expect(lookupAnalyte("hdl-c")).not.toBeNull();
    expect(lookupAnalyte("triglycerides")).not.toBeNull();

    // Thyroid
    expect(lookupAnalyte("tsh")).not.toBeNull();

    // Vitamins / minerals
    expect(lookupAnalyte("25-oh vitamin d")).not.toBeNull();
    expect(lookupAnalyte("ferritin")).not.toBeNull();

    // Inflammatory
    expect(lookupAnalyte("hs-crp")).not.toBeNull();
    expect(lookupAnalyte("homocysteine")).not.toBeNull();
  });

  it("all entries have valid MetricCategory values", () => {
    const validCategories = new Set([
      "vitamins",
      "minerals",
      "inflammatory",
      "metabolic",
      "hormones",
      "autonomic",
      "bodyComposition",
      "lipids",
      "hematology",
    ]);
    for (const [key, entry] of Object.entries(ANALYTE_DICTIONARY)) {
      expect(
        validCategories.has(entry.category),
        `Entry "${key}" has invalid category "${entry.category}"`
      ).toBe(true);
    }
  });

  it("no entry has a subject value (only reference/range metadata)", () => {
    // PHI-free check: no field named 'value' on any AnalyteEntry
    for (const entry of Object.values(ANALYTE_DICTIONARY)) {
      expect("value" in entry).toBe(false);
    }
  });
});
