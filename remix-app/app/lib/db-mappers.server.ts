/**
 * db-mappers.server.ts — Typed DB-row→Metric mappers (DATA-05, D-08)
 *
 * Eliminates `as any` at the DB→Metric boundary via typed subcategory narrowing.
 * The `narrowSubcategory` helper uses an allow-list to guarantee assignment to
 * the correct union member — no `as any` anywhere.
 *
 * PRINCIPLES III compliance: TypeScript strict mode enforced; widening `as any`
 * replaced with explicit allow-list narrowing.
 */

import type { InferSelectModel } from "drizzle-orm";
import type { metrics } from "../../db/schema";
import type {
  Metric,
  ImprovementDirection,
  VitaminSubcategory,
  MineralSubcategory,
  InflammatorySubcategory,
  MetabolicSubcategory,
  HormoneSubcategory,
  AutonomicSubcategory,
  BodyCompositionSubcategory,
  LipidSubcategory,
  HematologySubcategory,
  MetricRange,
} from "../types/metrics";

// ── Subcategory allow-lists ────────────────────────────────────────────────────
//
// These are the ground-truth union members per category.
// Source: app/types/metrics.ts subcategory type declarations.
// The allow-list is readonly so TypeScript infers the tuple type needed for
// narrowSubcategory's T extends string constraint.

const VITAMIN_SUBCATEGORIES = ["b-vitamins", "fat-soluble"] as const satisfies readonly VitaminSubcategory[];
const MINERAL_SUBCATEGORIES = ["essential", "trace"] as const satisfies readonly MineralSubcategory[];
const INFLAMMATORY_SUBCATEGORIES = ["crp", "homocysteine", "cytokines", "oxidativeStress"] as const satisfies readonly InflammatorySubcategory[];
const METABOLIC_SUBCATEGORIES = ["glucose", "kidney", "electrolytes", "acidBase"] as const satisfies readonly MetabolicSubcategory[];
const HORMONE_SUBCATEGORIES = ["thyroid", "sex", "cortisol", "growth"] as const satisfies readonly HormoneSubcategory[];
const AUTONOMIC_SUBCATEGORIES = ["hrv", "bloodPressure", "sleep", "recovery"] as const satisfies readonly AutonomicSubcategory[];
const BODY_COMPOSITION_SUBCATEGORIES = ["fat", "leanMass", "boneDensity", "regional"] as const satisfies readonly BodyCompositionSubcategory[];
const LIPID_SUBCATEGORIES = ["cholesterol", "triglycerides", "lipoproteins"] as const satisfies readonly LipidSubcategory[];
const HEMATOLOGY_SUBCATEGORIES = ["cbc", "hemoglobin", "wbc", "platelets"] as const satisfies readonly HematologySubcategory[];

// ── narrowSubcategory ─────────────────────────────────────────────────────────
//
// Returns the value typed as T when it is in the allow-list, otherwise the fallback.
// Uses Array.prototype.includes with the readonly tuple type so TypeScript can
// verify the return value is T — no `as any` required.

export function narrowSubcategory<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  if (value !== null && value !== undefined && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

// ── ImprovementDirection narrowing ────────────────────────────────────────────
//
// The DB column is a free varchar; the type is a 3-member union.
// The seed writing enforces only valid values, so this narrowing is safe.
// Using `as ImprovementDirection` here is justified: the seed script (Plan 03)
// is the sole writer and only writes the three valid strings. This is a known-safe
// cast, not a widening `as any`.

const IMPROVEMENT_DIRECTIONS = [
  "higher is better",
  "lower is better",
  "target range",
] as const satisfies readonly ImprovementDirection[];

function narrowImprovement(value: string): ImprovementDirection {
  return narrowSubcategory(value, IMPROVEMENT_DIRECTIONS, "higher is better");
}

// ── Range assembly ────────────────────────────────────────────────────────────
//
// DB stores flat referenceMin/referenceMax and optimalMin/optimalMax.
// BaseMetric uses { min, max } range objects. Reassemble here.

function buildRange(
  min: number | null,
  max: number | null
): MetricRange | undefined {
  if (min !== null && max !== null) {
    return { min, max };
  }
  return undefined;
}

// ── dbRowToMetric ─────────────────────────────────────────────────────────────
//
// Maps a raw DB row (typeof metrics.$inferSelect) to a typed Metric union member.
// The switch discriminates on row.category, each case returning the correct
// discriminated union member with a narrowed subcategory — no `as any`.

export function dbRowToMetric(row: InferSelectModel<typeof metrics>): Metric {
  const base = {
    id: row.id,
    name: row.name,
    value: row.value,
    unit: row.unit,
    timestamp: row.timestamp.toISOString(),
    description: row.description ?? undefined,
    improvement: narrowImprovement(row.improvement),
    source: row.source,
    referenceRange: buildRange(row.referenceMin, row.referenceMax),
    optimalRange: buildRange(row.optimalMin, row.optimalMax),
  };

  switch (row.category) {
    case "vitamins":
      return {
        ...base,
        category: "vitamins",
        subcategory: narrowSubcategory(row.subcategory, VITAMIN_SUBCATEGORIES, "b-vitamins"),
      };
    case "minerals":
      return {
        ...base,
        category: "minerals",
        subcategory: narrowSubcategory(row.subcategory, MINERAL_SUBCATEGORIES, "essential"),
      };
    case "inflammatory":
      return {
        ...base,
        category: "inflammatory",
        subcategory: narrowSubcategory(row.subcategory, INFLAMMATORY_SUBCATEGORIES, "crp"),
      };
    case "metabolic":
      return {
        ...base,
        category: "metabolic",
        subcategory: narrowSubcategory(row.subcategory, METABOLIC_SUBCATEGORIES, "glucose"),
      };
    case "hormones":
      return {
        ...base,
        category: "hormones",
        subcategory: narrowSubcategory(row.subcategory, HORMONE_SUBCATEGORIES, "thyroid"),
      };
    case "autonomic":
      return {
        ...base,
        category: "autonomic",
        subcategory: narrowSubcategory(row.subcategory, AUTONOMIC_SUBCATEGORIES, "hrv"),
      };
    case "bodyComposition":
      return {
        ...base,
        category: "bodyComposition",
        subcategory: narrowSubcategory(row.subcategory, BODY_COMPOSITION_SUBCATEGORIES, "fat"),
      };
    case "lipids":
      return {
        ...base,
        category: "lipids",
        subcategory: narrowSubcategory(row.subcategory, LIPID_SUBCATEGORIES, "cholesterol"),
      };
    case "hematology":
      return {
        ...base,
        category: "hematology",
        subcategory: narrowSubcategory(row.subcategory, HEMATOLOGY_SUBCATEGORIES, "cbc"),
      };
  }
}
