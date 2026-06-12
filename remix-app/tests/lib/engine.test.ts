/**
 * engine.test.ts — Import-purity + behavior tests for engine.server.ts (ENG-01, D-02)
 *
 * Coverage axes:
 *   1. Import-purity (static fs read — asserts no Drizzle/Remix/DB references)
 *   2. classifyMetricStatus boundary cases (synthetic inputs)
 *   3. getCessationDay / getCessationPhase boundary cases (synthetic inputs)
 *   4. computePearson known-input cases
 *   5. mapVariantToProtocol — synthetic genotypes + VariantMap fixtures (no DB)
 *
 * D-02: synthetic-input axis covered here; DB-seeded-data axis covered in 06-05.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseISO, addDays } from "date-fns";
import {
  classifyMetricStatus,
  getCessationDay,
  getCessationPhase,
  computePearson,
  mapVariantToProtocol,
} from "~/lib/engine.server";
import type { Metric } from "~/types/metrics";
import type { SubjectGenotype, VariantMap } from "~/types/report";

// =============================================================================
// Fixture helpers
// =============================================================================

// makeMetric mirrors the factory in metrics.test.ts — `as unknown as Metric` is
// acceptable in test fixtures only (CONVENTIONS.md §any Usage).
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

function makeVariantMap(overrides: Partial<VariantMap> & Pick<VariantMap, 'id' | 'gene'>): VariantMap {
  return {
    id: overrides.id,
    gene: overrides.gene,
    genotypePattern: overrides.genotypePattern ?? null,
    category: overrides.category ?? 'methylation',
    evidenceTier: overrides.evidenceTier ?? 'k2',
    recommendationText: overrides.recommendationText ?? 'Consider supplementation.',
    evidenceCitation: overrides.evidenceCitation ?? null,
  };
}

function makeGenotype(overrides: Partial<SubjectGenotype> & Pick<SubjectGenotype, 'gene' | 'genotype'>): SubjectGenotype {
  return {
    gene: overrides.gene,
    genotype: overrides.genotype,
    assaySource: overrides.assaySource ?? null,
  };
}

// =============================================================================
// 1. Import-purity test (D-01 / ROADMAP SC2)
// =============================================================================

describe("engine.server.ts import purity (D-01)", () => {
  it("source contains no drizzle-orm, react-router, @react-router, or @neondatabase imports", () => {
    const enginePath = resolve(__dirname, "../../app/lib/engine.server.ts");
    const source = readFileSync(enginePath, "utf-8");

    const forbidden = [
      /from ['"]drizzle-orm/,
      /from ['"]react-router/,
      /from ['"]@react-router\//,
      /from ['"]@neondatabase\//,
    ];

    for (const pattern of forbidden) {
      expect(
        source,
        `engine.server.ts must not import from ${pattern.source}`
      ).not.toMatch(pattern);
    }
  });
});

// =============================================================================
// 2. classifyMetricStatus boundary cases
// =============================================================================

const REF = { min: 50, max: 150 };
const OPT = { min: 70, max: 120 };

describe("classifyMetricStatus", () => {
  it("value at optimal min → optimal", () => {
    expect(classifyMetricStatus(makeMetric(70, REF, OPT))).toBe("optimal");
  });
  it("value at optimal max → optimal", () => {
    expect(classifyMetricStatus(makeMetric(120, REF, OPT))).toBe("optimal");
  });
  it("value mid optimal → optimal", () => {
    expect(classifyMetricStatus(makeMetric(90, REF, OPT))).toBe("optimal");
  });
  it("value in ref, below optimal → borderline", () => {
    expect(classifyMetricStatus(makeMetric(60, REF, OPT))).toBe("borderline");
  });
  it("value in ref, above optimal → borderline", () => {
    expect(classifyMetricStatus(makeMetric(135, REF, OPT))).toBe("borderline");
  });
  it("value exactly at ref min → borderline", () => {
    expect(classifyMetricStatus(makeMetric(50, REF, OPT))).toBe("borderline");
  });
  it("value exactly at ref max → borderline", () => {
    expect(classifyMetricStatus(makeMetric(150, REF, OPT))).toBe("borderline");
  });
  it("value below ref min → deficient", () => {
    expect(classifyMetricStatus(makeMetric(30, REF, OPT))).toBe("deficient");
  });
  it("value above ref max → excess", () => {
    expect(classifyMetricStatus(makeMetric(200, REF, OPT))).toBe("excess");
  });
  it("no referenceRange and no optimalRange → optimal (defensive fallback)", () => {
    expect(classifyMetricStatus(makeMetric(42))).toBe("optimal");
  });
  it("no referenceRange, value outside optimalRange → optimal (locks the quirk)", () => {
    expect(classifyMetricStatus(makeMetric(50, undefined, OPT))).toBe("optimal");
  });
});

// =============================================================================
// 3. getCessationDay / getCessationPhase boundary cases
// =============================================================================

const CESSATION_START = "2025-12-23T00:00:00.000Z";
const START_DATE = parseISO(CESSATION_START);
const day = (n: number) => addDays(START_DATE, n);

describe("getCessationDay (injectable now)", () => {
  for (const n of [1, 21, 22, 60, 61, 120, 121, 150, 151]) {
    it(`returns ${n} for now = start + ${n} days`, () => {
      expect(getCessationDay(CESSATION_START, day(n))).toBe(n);
    });
  }
  it("returns 0 at the start date", () => {
    expect(getCessationDay(CESSATION_START, START_DATE)).toBe(0);
  });
});

describe("getCessationPhase (boundary cases)", () => {
  const cases: Array<[number, string]> = [
    [-5, "acute"],   // pre-start → clamp to first
    [0, "acute"],    // start date
    [1, "acute"],
    [21, "acute"],
    [22, "stabilization"],
    [60, "stabilization"],
    [61, "clearing"],
    [120, "clearing"],
    [121, "optimization"],
    [150, "optimization"],
    [151, "optimization"], // past last range → clamp to last
  ];
  for (const [d, phase] of cases) {
    it(`day ${d} → ${phase}`, () => {
      expect(getCessationPhase(d).phase).toBe(phase);
    });
  }
});

// =============================================================================
// 4. computePearson known-input cases
// =============================================================================

describe("computePearson", () => {
  it("perfect positive correlation → 1", () => {
    expect(computePearson([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBeCloseTo(1.0, 10);
  });
  it("perfect negative correlation → -1", () => {
    expect(computePearson([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1.0, 10);
  });
  it("two-element positive → 1", () => {
    expect(computePearson([1, 3], [2, 4])).toBeCloseTo(1.0, 10);
  });
  it("constant y (zero denominator) → 0", () => {
    expect(computePearson([1, 2, 3, 4, 5], [3, 3, 3, 3, 3])).toBe(0);
  });
  it("empty arrays → 0", () => {
    expect(computePearson([], [])).toBe(0);
  });
  it("mismatched lengths → 0", () => {
    expect(computePearson([1, 2], [1, 2, 3])).toBe(0);
  });
  it("single element (zero variance) → 0", () => {
    expect(computePearson([5], [5])).toBe(0);
  });
});

// =============================================================================
// 5. mapVariantToProtocol — synthetic fixture cases
// =============================================================================

describe("mapVariantToProtocol", () => {
  const variantMaps: VariantMap[] = [
    makeVariantMap({
      id: 1,
      gene: "COMT",
      genotypePattern: "G/A",
      category: "methylation",
      evidenceTier: "k2",
      recommendationText: "Consider magnesium support for COMT heterozygous variant.",
    }),
    makeVariantMap({
      id: 2,
      gene: "MTHFR",
      genotypePattern: "A/G",
      category: "methylation",
      evidenceTier: "k1",
      recommendationText: "Ensure adequate methylfolate intake.",
      evidenceCitation: "PMID:12345678",
    }),
    makeVariantMap({
      id: 3,
      gene: "APOE",
      genotypePattern: null,  // gene-level fallback — matches any APOE genotype
      category: "cardiovascular",
      evidenceTier: "k3",
      recommendationText: "Monitor lipid panel regularly.",
    }),
    makeVariantMap({
      id: 4,
      gene: "BDNF",
      genotypePattern: "C/T",
      category: "neurotransmitter",
      evidenceTier: "k4",
      recommendationText: "Aerobic exercise may support neuroplasticity.",
    }),
  ];

  it("exact genotype match returns recommendation with correct evidenceTier", () => {
    const genotypes = [makeGenotype({ gene: "COMT", genotype: "G/A" })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results).toHaveLength(1);
    expect(results[0].evidenceTier).toBe("k2");
    expect(results[0].id).toBe("1");
    expect(results[0].source).toBe("variant");
  });

  it("flipped allele order A/G subject vs G/A pattern → still matches (Pitfall 7 normalization)", () => {
    const genotypes = [makeGenotype({ gene: "COMT", genotype: "A/G" })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results).toHaveLength(1);
    // gene is on sourceContext, not directly on GradedRecommendation
    expect(results[0].sourceContext.gene).toBe("COMT");
    expect(results[0].sourceContext.genotype).toBe("A/G");
    expect(results[0].evidenceTier).toBe("k2");
  });

  it("gene-level fallback (genotypePattern null) matches any APOE genotype", () => {
    const genotypes = [makeGenotype({ gene: "APOE", genotype: "E3/E4" })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("cardiovascular");
    expect(results[0].evidenceTier).toBe("k3");
  });

  it("no matching gene → empty results", () => {
    const genotypes = [makeGenotype({ gene: "UNKNOWN", genotype: "A/B" })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results).toHaveLength(0);
  });

  it("assaySource '23andMe' → detectionConfidence 'verified'", () => {
    const genotypes = [makeGenotype({ gene: "COMT", genotype: "G/A", assaySource: "23andMe" })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results[0].sourceContext.detectionConfidence).toBe("verified");
  });

  it("assaySource 'SelfDecode' → detectionConfidence 'inferred'", () => {
    const genotypes = [makeGenotype({ gene: "COMT", genotype: "G/A", assaySource: "SelfDecode" })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results[0].sourceContext.detectionConfidence).toBe("inferred");
  });

  it("assaySource null → detectionConfidence omitted from sourceContext", () => {
    const genotypes = [makeGenotype({ gene: "COMT", genotype: "G/A", assaySource: null })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results[0].sourceContext.detectionConfidence).toBeUndefined();
  });

  it("evidenceCitation propagated when present", () => {
    const genotypes = [makeGenotype({ gene: "MTHFR", genotype: "A/G" })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results).toHaveLength(1);
    expect(results[0].evidenceCitation).toBe("PMID:12345678");
  });

  it("evidenceCitation null → omitted from recommendation", () => {
    const genotypes = [makeGenotype({ gene: "COMT", genotype: "G/A" })];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results[0].evidenceCitation).toBeUndefined();
  });

  it("multiple genotypes → recommendations from each matching map entry", () => {
    const genotypes = [
      makeGenotype({ gene: "COMT", genotype: "G/A" }),
      makeGenotype({ gene: "APOE", genotype: "E3/E4" }),
    ];
    const results = mapVariantToProtocol(genotypes, variantMaps);
    expect(results).toHaveLength(2);
    const genes = results.map(r => r.sourceContext.gene);
    expect(genes).toContain("COMT");
    expect(genes).toContain("APOE");
  });

  it("empty genotypes → empty results", () => {
    expect(mapVariantToProtocol([], variantMaps)).toHaveLength(0);
  });

  it("empty variantMaps → empty results", () => {
    const genotypes = [makeGenotype({ gene: "COMT", genotype: "G/A" })];
    expect(mapVariantToProtocol(genotypes, [])).toHaveLength(0);
  });
});
