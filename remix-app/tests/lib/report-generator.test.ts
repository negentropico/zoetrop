/**
 * report-generator.test.ts — Unit tests for generateReport.
 *
 * ENG-03: Metric-rule evaluation path unit test (the variant path is tested in
 * engine.test.ts; this file covers the previously-untested metric→rule path).
 *
 * All tests mock data.server + corpus.server + db.server — no DB required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReportSnapshot } from "~/types/report";

// ── Top-level mocks (hoisted by Vitest) ─────────────────────────────────────
// These are declared at top-level so Vitest's hoisting system works correctly.
// Test setup controls return values via vi.mocked().mockResolvedValue(...).

vi.mock("~/lib/data.server", () => ({
  getMetrics: vi.fn(),
  getSubjectGenotypes: vi.fn(),
}));

vi.mock("~/lib/corpus.server", () => ({
  CORPUS_VERSION: "v1.0-owner-2026-06",
  getVariantMaps: vi.fn(),
  getMetricRules: vi.fn(),
}));

// Captured snapshot — written by the mock insert.values() impl
let capturedInsertValues: Record<string, unknown> | null = null;

vi.mock("~/lib/db.server", () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn(() => ({
      values: vi.fn((vals: Record<string, unknown>) => {
        capturedInsertValues = vals;
        return Promise.resolve(undefined);
      }),
    })),
  })),
}));

// ── DB-gated skip guard ──────────────────────────────────────────────────────
const connectionString =
  process.env["DB_URL_STUBBED"]
    ? undefined
    : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

// ── Import mocked modules ────────────────────────────────────────────────────
import { getMetrics, getSubjectGenotypes } from "~/lib/data.server";
import { getVariantMaps, getMetricRules } from "~/lib/corpus.server";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DEFICIENT_METRIC = {
  id: "m-1",
  name: "Ferritin",
  value: 8,
  unit: "ng/mL",
  category: "minerals" as const,
  subcategory: "essential",
  timestamp: new Date().toISOString(),
  improvement: "higher is better" as const,
  referenceMin: 12,
  referenceMax: 300,
  optimalMin: 50,
  optimalMax: 200,
  source: "manual" as const,
  description: null,
  tenantId: "tenant-1",
  subjectId: "subject-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const OPTIMAL_METRIC = {
  id: "m-2",
  name: "Vitamin B12",
  value: 600,
  unit: "pg/mL",
  category: "vitamins" as const,
  subcategory: "b-vitamins",
  timestamp: new Date().toISOString(),
  improvement: "higher is better" as const,
  referenceMin: 200,
  referenceMax: 900,
  optimalMin: 400,
  optimalMax: 800,
  source: "manual" as const,
  description: null,
  tenantId: "tenant-1",
  subjectId: "subject-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const BORDERLINE_METRIC = {
  id: "m-3",
  name: "Magnesium",
  value: 1.9,
  unit: "mg/dL",
  category: "minerals" as const,
  subcategory: "essential",
  timestamp: new Date().toISOString(),
  improvement: "higher is better" as const,
  referenceMin: 1.7,
  referenceMax: 2.6,
  optimalMin: 2.0,
  optimalMax: 2.5,
  source: "manual" as const,
  description: null,
  tenantId: "tenant-1",
  subjectId: "subject-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const FERRITIN_RULE = {
  id: 202,
  metricName: "Ferritin",
  conditionStatus: "deficient",
  category: "minerals",
  evidenceTier: "k2" as const,
  recommendationText: "Address iron stores through dietary iron and consider supplementation.",
  evidenceCitation: null,
  actionDetail: null,
  corpusVersion: "v1.0-owner-2026-06",
  createdAt: new Date(),
};

const ANY_NON_OPTIMAL_RULE = {
  id: 303,
  metricName: "Magnesium",
  conditionStatus: "any_non_optimal",
  category: "minerals",
  evidenceTier: "k3" as const,
  recommendationText: "Consider magnesium bisglycinate given non-optimal levels.",
  evidenceCitation: null,
  actionDetail: null,
  corpusVersion: "v1.0-owner-2026-06",
  createdAt: new Date(),
};

const MTHFR_GENOTYPE = {
  id: 1,
  tenantId: "tenant-1",
  subjectId: "subject-1",
  gene: "MTHFR",
  rsid: "rs1801133",
  genotype: "C/T",
  assaySource: "23andMe",
  createdAt: new Date(),
};

const MTHFR_VARIANT_MAP = {
  variant_protocol_map: {
    id: 1,
    variantId: 1,
    evidenceTier: "k2" as const,
    recommendationText: "Consider methylfolate given MTHFR C677T heterozygosity.",
    evidenceCitation: null,
    actionDetail: null,
    corpusVersion: "v1.0-owner-2026-06",
    createdAt: new Date(),
  },
  genetic_variants: {
    id: 1,
    gene: "MTHFR",
    rsid: "rs1801133",
    genotypePattern: "C/T",
    category: "methylation",
    impact: "moderate",
    clinicalImplication: "Reduced MTHFR enzyme activity",
    knowledgeSource: "PubMed",
    corpusVersion: "v1.0-owner-2026-06",
    createdAt: new Date(),
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ENG-03: metric-rule evaluation in generateReport (unit, mocked)", () => {
  beforeEach(() => {
    capturedInsertValues = null;
    vi.mocked(getVariantMaps).mockResolvedValue([]);
    vi.mocked(getMetricRules).mockResolvedValue([]);
    vi.mocked(getMetrics).mockResolvedValue([]);
    vi.mocked(getSubjectGenotypes).mockResolvedValue([]);
  });

  it("generateReport returns a string reportId", async () => {
    const { generateReport } = await import("~/lib/report-generator.server");
    const reportId = await generateReport("tenant-1", "subject-1", "user-1");
    expect(typeof reportId).toBe("string");
    expect(reportId.length).toBeGreaterThan(0);
  });

  it("ENG-03: a deficient metric matching a rule yields source 'metric', correct evidenceTier, sourceContext.metricName", async () => {
    vi.mocked(getMetrics).mockResolvedValue([DEFICIENT_METRIC]);
    vi.mocked(getMetricRules).mockResolvedValue([FERRITIN_RULE]);

    const { generateReport } = await import("~/lib/report-generator.server");
    await generateReport("tenant-1", "subject-1", "user-1");

    expect(capturedInsertValues).not.toBeNull();
    const snapshot = (capturedInsertValues as { snapshot: ReportSnapshot }).snapshot;

    expect(snapshot.recommendations.length).toBe(1);
    const rec = snapshot.recommendations[0];

    // ENG-03 assertions
    expect(rec.source).toBe("metric");
    expect(rec.evidenceTier).toBe("k2");
    expect(rec.sourceContext.metricName).toBe("Ferritin");
    expect(rec.sourceContext.metricStatus).toBe("deficient");
  });

  it("ENG-03: a metric matching 'any_non_optimal' rule when borderline produces a recommendation with source 'metric'", async () => {
    vi.mocked(getMetrics).mockResolvedValue([BORDERLINE_METRIC]);
    vi.mocked(getMetricRules).mockResolvedValue([ANY_NON_OPTIMAL_RULE]);

    const { generateReport } = await import("~/lib/report-generator.server");
    await generateReport("tenant-1", "subject-1", "user-1");

    expect(capturedInsertValues).not.toBeNull();
    const snapshot = (capturedInsertValues as { snapshot: ReportSnapshot }).snapshot;

    expect(snapshot.recommendations.length).toBe(1);
    const rec = snapshot.recommendations[0];
    expect(rec.source).toBe("metric");
    expect(rec.evidenceTier).toBe("k3");
    expect(rec.sourceContext.metricName).toBe("Magnesium");
    // borderline: in reference range but outside optimal
    expect(rec.sourceContext.metricStatus).toBe("borderline");
  });

  it("every snapshot recommendation has a non-null evidenceTier (RPT-02)", async () => {
    vi.mocked(getMetrics).mockResolvedValue([DEFICIENT_METRIC]);
    vi.mocked(getSubjectGenotypes).mockResolvedValue([MTHFR_GENOTYPE]);
    vi.mocked(getVariantMaps).mockResolvedValue([MTHFR_VARIANT_MAP]);
    vi.mocked(getMetricRules).mockResolvedValue([FERRITIN_RULE]);

    const { generateReport } = await import("~/lib/report-generator.server");
    await generateReport("tenant-1", "subject-1", "user-1");

    expect(capturedInsertValues).not.toBeNull();
    const snapshot = (capturedInsertValues as { snapshot: ReportSnapshot }).snapshot;

    // All recommendations must have a non-null evidenceTier (RPT-02)
    for (const rec of snapshot.recommendations) {
      expect(rec.evidenceTier).toBeTruthy();
      expect(["k1", "k2", "k3", "k4"]).toContain(rec.evidenceTier);
    }
  });

  it("optimal metric does NOT produce a recommendation", async () => {
    vi.mocked(getMetrics).mockResolvedValue([OPTIMAL_METRIC]);
    vi.mocked(getMetricRules).mockResolvedValue([{
      id: 505,
      metricName: "Vitamin B12",
      conditionStatus: "deficient",
      category: "vitamins",
      evidenceTier: "k2" as const,
      recommendationText: "Consider B12 supplementation.",
      evidenceCitation: null,
      actionDetail: null,
      corpusVersion: "v1.0-owner-2026-06",
      createdAt: new Date(),
    }]);

    const { generateReport } = await import("~/lib/report-generator.server");
    await generateReport("tenant-1", "subject-1", "user-1");

    expect(capturedInsertValues).not.toBeNull();
    const snapshot = (capturedInsertValues as { snapshot: ReportSnapshot }).snapshot;
    // Optimal metric should NOT produce a recommendation
    expect(snapshot.recommendations.length).toBe(0);
  });

  it("snapshot is stamped with CORPUS_VERSION (D-17)", async () => {
    const { generateReport } = await import("~/lib/report-generator.server");
    await generateReport("tenant-1", "subject-1", "user-1");

    expect(capturedInsertValues).not.toBeNull();
    const snapshot = (capturedInsertValues as { snapshot: ReportSnapshot }).snapshot;
    expect(snapshot.corpusVersion).toBe("v1.0-owner-2026-06");
    expect(snapshot.schemaVersion).toBe(1);
  });

  it("two generateReport calls produce two distinct reportIds (D-17 — re-gen = new row)", async () => {
    const ids: string[] = [];

    // Override the db mock to capture IDs
    const { getDb } = await import("~/lib/db.server");
    vi.mocked(getDb).mockImplementation(() => ({
      insert: vi.fn(() => ({
        values: vi.fn((vals: { id: string; snapshot: ReportSnapshot }) => {
          ids.push(vals.id);
          capturedInsertValues = vals;
          return Promise.resolve(undefined);
        }),
      })),
    }));

    const { generateReport } = await import("~/lib/report-generator.server");
    const id1 = await generateReport("tenant-1", "subject-1", "user-1");
    const id2 = await generateReport("tenant-1", "subject-1", "user-1");

    expect(id1).not.toBe(id2);
    expect(ids[0]).not.toBe(ids[1]);
  });
});

// ── DB-gated integration tests ────────────────────────────────────────────────

describe.skipIf(!connectionString)(
  "generateReport integration (DB-gated)",
  () => {
    it("placeholder — real DB integration tested end-to-end via route smoke test", () => {
      expect(true).toBe(true);
    });
  }
);
