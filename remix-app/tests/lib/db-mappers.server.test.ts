/**
 * tests/lib/db-mappers.server.test.ts
 *
 * Unit tests for db-mappers.server.ts — verifies dbRowToMetric maps DB rows
 * to correctly-typed Metric union members with no `as any` at subcategory boundary.
 *
 * Tests use constructed mock DB row objects that match typeof metrics.$inferSelect.
 */

import { describe, it, expect } from "vitest";
import type { InferSelectModel } from "drizzle-orm";
import type { metrics } from "../../db/schema";

// Mock DB row factory — all required fields, nullable fields set to null
function makeRow(
  overrides: Partial<InferSelectModel<typeof metrics>>
): InferSelectModel<typeof metrics> {
  return {
    id: "test-id",
    name: "Test Metric",
    value: 1.0,
    unit: "unit",
    category: "vitamins",
    subcategory: "b-vitamins",
    timestamp: new Date("2026-06-10T00:00:00.000Z"),
    description: null,
    improvement: "higher is better",
    referenceMin: null,
    referenceMax: null,
    optimalMin: null,
    optimalMax: null,
    source: "bloodwork",
    createdAt: new Date("2026-06-10T00:00:00.000Z"),
    updatedAt: new Date("2026-06-10T00:00:00.000Z"),
    tenantId: "tenant-1",
    subjectId: "subject-1",
    ...overrides,
  };
}

describe("db-mappers.server.ts — dbRowToMetric (DATA-05)", () => {
  it("exports dbRowToMetric function", async () => {
    const mod = await import("../../app/lib/db-mappers.server");
    expect(typeof mod.dbRowToMetric).toBe("function");
  });

  it("exports narrowSubcategory helper", async () => {
    const mod = await import("../../app/lib/db-mappers.server");
    expect(typeof mod.narrowSubcategory).toBe("function");
  });

  it("maps a vitamins row to VitaminMetric with correct subcategory", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const row = makeRow({ category: "vitamins", subcategory: "b-vitamins" });
    const result = dbRowToMetric(row);
    expect(result.category).toBe("vitamins");
    expect(result.subcategory).toBe("b-vitamins");
  });

  it("maps a fat-soluble vitamin row correctly", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const row = makeRow({ category: "vitamins", subcategory: "fat-soluble" });
    const result = dbRowToMetric(row);
    expect(result.category).toBe("vitamins");
    expect(result.subcategory).toBe("fat-soluble");
  });

  it("maps all 9 categories without throwing", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const categories = [
      { category: "vitamins", subcategory: "b-vitamins" },
      { category: "minerals", subcategory: "essential" },
      { category: "inflammatory", subcategory: "crp" },
      { category: "metabolic", subcategory: "glucose" },
      { category: "hormones", subcategory: "thyroid" },
      { category: "autonomic", subcategory: "hrv" },
      { category: "bodyComposition", subcategory: "fat" },
      { category: "lipids", subcategory: "cholesterol" },
      { category: "hematology", subcategory: "cbc" },
    ] as const;

    for (const { category, subcategory } of categories) {
      const row = makeRow({ category, subcategory });
      const result = dbRowToMetric(row);
      expect(result.category).toBe(category);
    }
  });

  it("converts DB timestamp Date to ISO string", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const row = makeRow({ timestamp: new Date("2026-06-10T00:00:00.000Z") });
    const result = dbRowToMetric(row);
    expect(typeof result.timestamp).toBe("string");
    expect(result.timestamp).toBe("2026-06-10T00:00:00.000Z");
  });

  it("assembles referenceRange from flat referenceMin/Max when both non-null", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const row = makeRow({ referenceMin: 10, referenceMax: 100 });
    const result = dbRowToMetric(row);
    expect(result.referenceRange).toEqual({ min: 10, max: 100 });
  });

  it("leaves referenceRange undefined when referenceMin is null", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const row = makeRow({ referenceMin: null, referenceMax: 100 });
    const result = dbRowToMetric(row);
    expect(result.referenceRange).toBeUndefined();
  });

  it("assembles optimalRange when both optimalMin/Max are non-null", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const row = makeRow({ optimalMin: 50, optimalMax: 80 });
    const result = dbRowToMetric(row);
    expect(result.optimalRange).toEqual({ min: 50, max: 80 });
  });

  it("falls back to first subcategory member when subcategory is null", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const row = makeRow({ category: "vitamins", subcategory: null });
    const result = dbRowToMetric(row);
    // fallback to first member of vitamins subcategory union
    expect(result.category).toBe("vitamins");
    expect(result.subcategory).toBeDefined();
  });

  it("falls back to first subcategory member when subcategory is unknown", async () => {
    const { dbRowToMetric } = await import("../../app/lib/db-mappers.server");
    const row = makeRow({ category: "vitamins", subcategory: "unknown-value" });
    const result = dbRowToMetric(row);
    expect(result.category).toBe("vitamins");
    expect(result.subcategory).toBeDefined();
  });

  it("narrowSubcategory returns value when it is in the allowed list", async () => {
    const { narrowSubcategory } = await import("../../app/lib/db-mappers.server");
    const result = narrowSubcategory("b-vitamins", ["b-vitamins", "fat-soluble"] as const, "b-vitamins");
    expect(result).toBe("b-vitamins");
  });

  it("narrowSubcategory returns fallback when value is not in the allowed list", async () => {
    const { narrowSubcategory } = await import("../../app/lib/db-mappers.server");
    const result = narrowSubcategory("unknown", ["b-vitamins", "fat-soluble"] as const, "b-vitamins");
    expect(result).toBe("b-vitamins");
  });

  it("narrowSubcategory returns fallback when value is null", async () => {
    const { narrowSubcategory } = await import("../../app/lib/db-mappers.server");
    const result = narrowSubcategory(null, ["b-vitamins", "fat-soluble"] as const, "b-vitamins");
    expect(result).toBe("b-vitamins");
  });
});
