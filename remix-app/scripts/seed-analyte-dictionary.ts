/**
 * seed-analyte-dictionary.ts — One-shot generator for analyte-dictionary.ts
 *
 * Reads DISTINCT (name, category, subcategory, unit, referenceMin, referenceMax,
 * optimalMin, optimalMax, improvement) tuples from the owner's metrics rows in
 * live Neon, then emits the full dictionary file at
 * remix-app/app/lib/ingest/analyte-dictionary.ts.
 *
 * Also includes D-03 common panels (CBC, CMP, lipids, thyroid, vitamins/minerals,
 * hs-CRP/homocysteine) that may not appear in the owner's metrics yet.
 *
 * Run from remix-app/:
 *   npm run db:seed-dictionary
 *
 * Required env vars:
 *   DATABASE_URL or DATABASE_URL_UNPOOLED
 *
 * This is a REGENERATION helper — the committed source of truth is the resulting
 * analyte-dictionary.ts file. Re-run whenever new analytes are added to metrics.
 *
 * NOTE: Only reference/range metadata is written — NO subject PHI values (D-01).
 */

import { getDb } from "../app/lib/db.server";
import { metrics } from "../db/schema";
import { sql } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── 1. Validate required env vars ────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error(
    "DATABASE_URL or DATABASE_URL_UNPOOLED env var is required. " +
    "Run with: tsx --env-file-if-exists=.env scripts/seed-analyte-dictionary.ts"
  );
}

// ── 2. Query distinct analyte tuples from live Neon ──────────────────────────

console.log("[seed-dictionary] Connecting to live Neon...");
const db = getDb();

const rows = await db
  .selectDistinct({
    name: metrics.name,
    category: metrics.category,
    subcategory: metrics.subcategory,
    unit: metrics.unit,
    referenceMin: metrics.referenceMin,
    referenceMax: metrics.referenceMax,
    optimalMin: metrics.optimalMin,
    optimalMax: metrics.optimalMax,
    improvement: metrics.improvement,
  })
  .from(metrics)
  .orderBy(sql`${metrics.category}, ${metrics.name}`);

console.log(`[seed-dictionary] Found ${rows.length} distinct analyte rows in metrics`);

// ── 3. Build the dictionary entries from live Neon data ──────────────────────

interface AnalyteEntryRaw {
  name: string;
  category: string;
  subcategory: string | null;
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  optimalMin: number | null;
  optimalMax: number | null;
  improvement: string;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Map from normalized key to entry
const dictionary = new Map<string, AnalyteEntryRaw>();

for (const row of rows) {
  const key = normalize(row.name);
  if (!dictionary.has(key)) {
    dictionary.set(key, {
      name: row.name,
      category: row.category,
      subcategory: row.subcategory ?? "",
      unit: row.unit,
      referenceMin: row.referenceMin ?? null,
      referenceMax: row.referenceMax ?? null,
      optimalMin: row.optimalMin ?? null,
      optimalMax: row.optimalMax ?? null,
      improvement: row.improvement,
    });
  }
}

// ── 4. D-03 common panels (not already in owner's metrics) ───────────────────
// These are canonical clinical reference constants (non-PHI).

const commonPanels: Array<[string, AnalyteEntryRaw]> = [
  // CBC
  ["wbc", { name: "WBC", category: "hematology", subcategory: "wbc", unit: "x10^3/μL", referenceMin: 4.0, referenceMax: 11.0, optimalMin: 4.5, optimalMax: 8.0, improvement: "target range" }],
  ["white blood cell count", { name: "WBC", category: "hematology", subcategory: "wbc", unit: "x10^3/μL", referenceMin: 4.0, referenceMax: 11.0, optimalMin: 4.5, optimalMax: 8.0, improvement: "target range" }],
  ["rbc", { name: "RBC", category: "hematology", subcategory: "hemoglobin", unit: "x10^6/μL", referenceMin: 4.5, referenceMax: 5.9, optimalMin: 4.8, optimalMax: 5.7, improvement: "target range" }],
  ["red blood cell count", { name: "RBC", category: "hematology", subcategory: "hemoglobin", unit: "x10^6/μL", referenceMin: 4.5, referenceMax: 5.9, optimalMin: 4.8, optimalMax: 5.7, improvement: "target range" }],
  ["platelets", { name: "Platelets", category: "hematology", subcategory: "platelets", unit: "x10^3/μL", referenceMin: 150, referenceMax: 400, optimalMin: 175, optimalMax: 350, improvement: "target range" }],
  ["mcv", { name: "MCV", category: "hematology", subcategory: "cbc", unit: "fL", referenceMin: 80, referenceMax: 100, optimalMin: 85, optimalMax: 95, improvement: "target range" }],
  ["mch", { name: "MCH", category: "hematology", subcategory: "cbc", unit: "pg", referenceMin: 27, referenceMax: 33, optimalMin: 28, optimalMax: 32, improvement: "target range" }],
  ["mchc", { name: "MCHC", category: "hematology", subcategory: "cbc", unit: "g/dL", referenceMin: 31.5, referenceMax: 36.0, optimalMin: 33.0, optimalMax: 36.0, improvement: "target range" }],
  ["neutrophils", { name: "Neutrophils", category: "hematology", subcategory: "wbc", unit: "%", referenceMin: 40, referenceMax: 75, optimalMin: 45, optimalMax: 70, improvement: "target range" }],
  ["lymphocytes", { name: "Lymphocytes", category: "hematology", subcategory: "wbc", unit: "%", referenceMin: 20, referenceMax: 45, optimalMin: 25, optimalMax: 42, improvement: "target range" }],
  ["monocytes", { name: "Monocytes", category: "hematology", subcategory: "wbc", unit: "%", referenceMin: 2, referenceMax: 10, optimalMin: 3, optimalMax: 8, improvement: "target range" }],
  ["eosinophils", { name: "Eosinophils", category: "hematology", subcategory: "wbc", unit: "%", referenceMin: 0, referenceMax: 6, optimalMin: 0, optimalMax: 4, improvement: "lower is better" }],
  ["basophils", { name: "Basophils", category: "hematology", subcategory: "wbc", unit: "%", referenceMin: 0, referenceMax: 1, optimalMin: 0, optimalMax: 1, improvement: "target range" }],
  // CMP / Metabolic
  ["sodium", { name: "Sodium", category: "metabolic", subcategory: "electrolytes", unit: "mEq/L", referenceMin: 136, referenceMax: 145, optimalMin: 138, optimalMax: 143, improvement: "target range" }],
  ["potassium", { name: "Potassium", category: "metabolic", subcategory: "electrolytes", unit: "mEq/L", referenceMin: 3.5, referenceMax: 5.1, optimalMin: 4.0, optimalMax: 4.8, improvement: "target range" }],
  ["chloride", { name: "Chloride", category: "metabolic", subcategory: "electrolytes", unit: "mEq/L", referenceMin: 98, referenceMax: 107, optimalMin: 100, optimalMax: 106, improvement: "target range" }],
  ["co2", { name: "CO2", category: "metabolic", subcategory: "acidBase", unit: "mEq/L", referenceMin: 22, referenceMax: 29, optimalMin: 23, optimalMax: 28, improvement: "target range" }],
  ["carbon dioxide", { name: "CO2", category: "metabolic", subcategory: "acidBase", unit: "mEq/L", referenceMin: 22, referenceMax: 29, optimalMin: 23, optimalMax: 28, improvement: "target range" }],
  ["calcium", { name: "Calcium", category: "metabolic", subcategory: "electrolytes", unit: "mg/dL", referenceMin: 8.5, referenceMax: 10.5, optimalMin: 9.0, optimalMax: 10.0, improvement: "target range" }],
  ["total protein", { name: "Total Protein", category: "metabolic", subcategory: "kidney", unit: "g/dL", referenceMin: 6.0, referenceMax: 8.5, optimalMin: 6.5, optimalMax: 8.0, improvement: "target range" }],
  ["albumin", { name: "Albumin", category: "metabolic", subcategory: "kidney", unit: "g/dL", referenceMin: 3.5, referenceMax: 5.0, optimalMin: 4.0, optimalMax: 5.0, improvement: "target range" }],
  ["alt", { name: "ALT", category: "metabolic", subcategory: "kidney", unit: "U/L", referenceMin: 7, referenceMax: 56, optimalMin: 7, optimalMax: 35, improvement: "lower is better" }],
  ["alanine aminotransferase", { name: "ALT", category: "metabolic", subcategory: "kidney", unit: "U/L", referenceMin: 7, referenceMax: 56, optimalMin: 7, optimalMax: 35, improvement: "lower is better" }],
  ["ast", { name: "AST", category: "metabolic", subcategory: "kidney", unit: "U/L", referenceMin: 10, referenceMax: 40, optimalMin: 10, optimalMax: 30, improvement: "lower is better" }],
  ["aspartate aminotransferase", { name: "AST", category: "metabolic", subcategory: "kidney", unit: "U/L", referenceMin: 10, referenceMax: 40, optimalMin: 10, optimalMax: 30, improvement: "lower is better" }],
  ["alkaline phosphatase", { name: "Alkaline Phosphatase", category: "metabolic", subcategory: "kidney", unit: "U/L", referenceMin: 44, referenceMax: 147, optimalMin: 50, optimalMax: 100, improvement: "target range" }],
  ["alp", { name: "Alkaline Phosphatase", category: "metabolic", subcategory: "kidney", unit: "U/L", referenceMin: 44, referenceMax: 147, optimalMin: 50, optimalMax: 100, improvement: "target range" }],
  ["bilirubin total", { name: "Bilirubin Total", category: "metabolic", subcategory: "kidney", unit: "mg/dL", referenceMin: 0.1, referenceMax: 1.2, optimalMin: 0.2, optimalMax: 1.0, improvement: "target range" }],
  ["total bilirubin", { name: "Bilirubin Total", category: "metabolic", subcategory: "kidney", unit: "mg/dL", referenceMin: 0.1, referenceMax: 1.2, optimalMin: 0.2, optimalMax: 1.0, improvement: "target range" }],
  ["bun", { name: "BUN", category: "metabolic", subcategory: "kidney", unit: "mg/dL", referenceMin: 7, referenceMax: 25, optimalMin: 10, optimalMax: 20, improvement: "target range" }],
  ["blood urea nitrogen", { name: "BUN", category: "metabolic", subcategory: "kidney", unit: "mg/dL", referenceMin: 7, referenceMax: 25, optimalMin: 10, optimalMax: 20, improvement: "target range" }],
  ["uric acid", { name: "Uric Acid", category: "metabolic", subcategory: "kidney", unit: "mg/dL", referenceMin: 3.5, referenceMax: 7.2, optimalMin: 4.0, optimalMax: 6.0, improvement: "target range" }],
  ["hba1c", { name: "HbA1c", category: "metabolic", subcategory: "glucose", unit: "%", referenceMin: 4.0, referenceMax: 5.7, optimalMin: 4.5, optimalMax: 5.4, improvement: "target range" }],
  ["hemoglobin a1c", { name: "HbA1c", category: "metabolic", subcategory: "glucose", unit: "%", referenceMin: 4.0, referenceMax: 5.7, optimalMin: 4.5, optimalMax: 5.4, improvement: "target range" }],
  ["insulin", { name: "Insulin", category: "metabolic", subcategory: "glucose", unit: "μIU/mL", referenceMin: 2, referenceMax: 25, optimalMin: 2, optimalMax: 10, improvement: "lower is better" }],
  ["fasting insulin", { name: "Insulin", category: "metabolic", subcategory: "glucose", unit: "μIU/mL", referenceMin: 2, referenceMax: 25, optimalMin: 2, optimalMax: 10, improvement: "lower is better" }],
  // Lipids
  ["ldl cholesterol", { name: "LDL-C", category: "lipids", subcategory: "cholesterol", unit: "mg/dL", referenceMin: null, referenceMax: 130, optimalMin: null, optimalMax: 100, improvement: "lower is better" }],
  ["hdl cholesterol", { name: "HDL-C", category: "lipids", subcategory: "cholesterol", unit: "mg/dL", referenceMin: 40, referenceMax: null, optimalMin: 55, optimalMax: null, improvement: "higher is better" }],
  ["vldl", { name: "VLDL", category: "lipids", subcategory: "lipoproteins", unit: "mg/dL", referenceMin: 5, referenceMax: 40, optimalMin: 5, optimalMax: 20, improvement: "lower is better" }],
  ["apob", { name: "ApoB", category: "lipids", subcategory: "lipoproteins", unit: "mg/dL", referenceMin: null, referenceMax: 130, optimalMin: null, optimalMax: 90, improvement: "lower is better" }],
  ["apolipoprotein b", { name: "ApoB", category: "lipids", subcategory: "lipoproteins", unit: "mg/dL", referenceMin: null, referenceMax: 130, optimalMin: null, optimalMax: 90, improvement: "lower is better" }],
  ["lp(a)", { name: "Lp(a)", category: "lipids", subcategory: "lipoproteins", unit: "nmol/L", referenceMin: null, referenceMax: 75, optimalMin: null, optimalMax: 30, improvement: "lower is better" }],
  // Thyroid
  ["thyroid stimulating hormone", { name: "TSH", category: "hormones", subcategory: "thyroid", unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, optimalMin: 0.8, optimalMax: 2.5, improvement: "target range" }],
  ["free t4", { name: "Free T4", category: "hormones", subcategory: "thyroid", unit: "ng/dL", referenceMin: 0.8, referenceMax: 1.8, optimalMin: 1.0, optimalMax: 1.6, improvement: "target range" }],
  ["free t3", { name: "Free T3", category: "hormones", subcategory: "thyroid", unit: "pg/mL", referenceMin: 2.3, referenceMax: 4.2, optimalMin: 3.0, optimalMax: 4.0, improvement: "target range" }],
  // Vitamins (aliases)
  ["vitamin d", { name: "Vitamin D (25-OH)", category: "vitamins", subcategory: "fat-soluble", unit: "ng/mL", referenceMin: 20, referenceMax: 80, optimalMin: 50, optimalMax: 70, improvement: "target range" }],
  ["vitamin d,25-oh,total", { name: "Vitamin D (25-OH)", category: "vitamins", subcategory: "fat-soluble", unit: "ng/mL", referenceMin: 20, referenceMax: 80, optimalMin: 50, optimalMax: 70, improvement: "target range" }],
  ["25(oh)d", { name: "Vitamin D (25-OH)", category: "vitamins", subcategory: "fat-soluble", unit: "ng/mL", referenceMin: 20, referenceMax: 80, optimalMin: 50, optimalMax: 70, improvement: "target range" }],
  ["25-oh vitamin d", { name: "Vitamin D (25-OH)", category: "vitamins", subcategory: "fat-soluble", unit: "ng/mL", referenceMin: 20, referenceMax: 80, optimalMin: 50, optimalMax: 70, improvement: "target range" }],
  ["p5p", { name: "Vitamin B6 (P5P)", category: "vitamins", subcategory: "b-vitamins", unit: "μg/L", referenceMin: 5, referenceMax: 50, optimalMin: 20, optimalMax: 40, improvement: "target range" }],
  ["vitamin b12", { name: "Vitamin B12", category: "vitamins", subcategory: "b-vitamins", unit: "pg/mL", referenceMin: 200, referenceMax: 900, optimalMin: 400, optimalMax: 800, improvement: "target range" }],
  ["folate", { name: "Folate", category: "vitamins", subcategory: "b-vitamins", unit: "ng/mL", referenceMin: 3.1, referenceMax: 20, optimalMin: 10, optimalMax: 20, improvement: "target range" }],
  ["vitamin a", { name: "Vitamin A", category: "vitamins", subcategory: "fat-soluble", unit: "μg/dL", referenceMin: 30, referenceMax: 80, optimalMin: 45, optimalMax: 70, improvement: "target range" }],
  ["retinol", { name: "Vitamin A", category: "vitamins", subcategory: "fat-soluble", unit: "μg/dL", referenceMin: 30, referenceMax: 80, optimalMin: 45, optimalMax: 70, improvement: "target range" }],
  ["vitamin e", { name: "Vitamin E", category: "vitamins", subcategory: "fat-soluble", unit: "mg/L", referenceMin: 5, referenceMax: 20, optimalMin: 12, optimalMax: 18, improvement: "target range" }],
  // Minerals (aliases)
  ["serum iron", { name: "Serum Iron", category: "minerals", subcategory: "essential", unit: "μg/dL", referenceMin: 50, referenceMax: 175, optimalMin: 80, optimalMax: 140, improvement: "target range" }],
  ["iron", { name: "Serum Iron", category: "minerals", subcategory: "essential", unit: "μg/dL", referenceMin: 50, referenceMax: 175, optimalMin: 80, optimalMax: 140, improvement: "target range" }],
  ["tibc", { name: "TIBC", category: "minerals", subcategory: "essential", unit: "μg/dL", referenceMin: 250, referenceMax: 370, optimalMin: 260, optimalMax: 340, improvement: "target range" }],
  ["transferrin saturation", { name: "Transferrin Saturation", category: "minerals", subcategory: "essential", unit: "%", referenceMin: 20, referenceMax: 50, optimalMin: 25, optimalMax: 40, improvement: "target range" }],
  ["copper", { name: "Copper", category: "minerals", subcategory: "trace", unit: "μg/dL", referenceMin: 70, referenceMax: 140, optimalMin: 85, optimalMax: 120, improvement: "target range" }],
  ["selenium", { name: "Selenium", category: "minerals", subcategory: "trace", unit: "μg/L", referenceMin: 70, referenceMax: 150, optimalMin: 100, optimalMax: 140, improvement: "target range" }],
  // Inflammatory aliases (including hs-crp hyphen variant for lab portal normalization)
  ["hs-crp", { name: "hs-CRP", category: "inflammatory", subcategory: "crp", unit: "mg/L", referenceMin: 0, referenceMax: 3.0, optimalMin: 0, optimalMax: 1.0, improvement: "lower is better" }],
  ["hscrp", { name: "hs-CRP", category: "inflammatory", subcategory: "crp", unit: "mg/L", referenceMin: 0, referenceMax: 3.0, optimalMin: 0, optimalMax: 1.0, improvement: "lower is better" }],
  ["high-sensitivity c-reactive protein", { name: "hs-CRP", category: "inflammatory", subcategory: "crp", unit: "mg/L", referenceMin: 0, referenceMax: 3.0, optimalMin: 0, optimalMax: 1.0, improvement: "lower is better" }],
  ["c-reactive protein", { name: "hs-CRP", category: "inflammatory", subcategory: "crp", unit: "mg/L", referenceMin: 0, referenceMax: 3.0, optimalMin: 0, optimalMax: 1.0, improvement: "lower is better" }],
  ["crp", { name: "hs-CRP", category: "inflammatory", subcategory: "crp", unit: "mg/L", referenceMin: 0, referenceMax: 3.0, optimalMin: 0, optimalMax: 1.0, improvement: "lower is better" }],
  // Minerals (ferritin — standard panel analyte not always in owner's data)
  ["ferritin", { name: "Ferritin", category: "minerals", subcategory: "essential", unit: "ng/mL", referenceMin: 15, referenceMax: 150, optimalMin: 50, optimalMax: 100, improvement: "target range" }],
  // Hormones aliases
  ["testosterone total", { name: "Total Testosterone", category: "hormones", subcategory: "sex", unit: "ng/dL", referenceMin: 300, referenceMax: 1000, optimalMin: 500, optimalMax: 800, improvement: "target range" }],
  ["shbg", { name: "SHBG", category: "hormones", subcategory: "sex", unit: "nmol/L", referenceMin: 10, referenceMax: 57, optimalMin: 20, optimalMax: 45, improvement: "target range" }],
  ["sex hormone binding globulin", { name: "SHBG", category: "hormones", subcategory: "sex", unit: "nmol/L", referenceMin: 10, referenceMax: 57, optimalMin: 20, optimalMax: 45, improvement: "target range" }],
  ["dhea-s", { name: "DHEA-S", category: "hormones", subcategory: "sex", unit: "μg/dL", referenceMin: 80, referenceMax: 560, optimalMin: 200, optimalMax: 450, improvement: "target range" }],
  ["dhea sulfate", { name: "DHEA-S", category: "hormones", subcategory: "sex", unit: "μg/dL", referenceMin: 80, referenceMax: 560, optimalMin: 200, optimalMax: 450, improvement: "target range" }],
  ["igf-1", { name: "IGF-1", category: "hormones", subcategory: "growth", unit: "ng/mL", referenceMin: 100, referenceMax: 300, optimalMin: 150, optimalMax: 250, improvement: "target range" }],
  ["insulin-like growth factor 1", { name: "IGF-1", category: "hormones", subcategory: "growth", unit: "ng/mL", referenceMin: 100, referenceMax: 300, optimalMin: 150, optimalMax: 250, improvement: "target range" }],
  ["estradiol", { name: "Estradiol", category: "hormones", subcategory: "sex", unit: "pg/mL", referenceMin: 10, referenceMax: 50, optimalMin: 20, optimalMax: 40, improvement: "target range" }],
  ["cortisol", { name: "Cortisol (AM)", category: "hormones", subcategory: "cortisol", unit: "μg/dL", referenceMin: 6, referenceMax: 23, optimalMin: 10, optimalMax: 18, improvement: "target range" }],
  // Autonomic
  ["hrv (rmssd)", { name: "HRV (RMSSD)", category: "autonomic", subcategory: "hrv", unit: "ms", referenceMin: 20, referenceMax: null, optimalMin: 45, optimalMax: null, improvement: "higher is better" }],
  ["recovery score", { name: "Recovery Score", category: "autonomic", subcategory: "recovery", unit: "%", referenceMin: 0, referenceMax: 100, optimalMin: 70, optimalMax: 100, improvement: "higher is better" }],
  ["resting heart rate", { name: "Resting Heart Rate", category: "autonomic", subcategory: "hrv", unit: "BPM", referenceMin: 40, referenceMax: 80, optimalMin: 48, optimalMax: 60, improvement: "lower is better" }],
  ["sleep duration", { name: "Sleep Duration", category: "autonomic", subcategory: "sleep", unit: "hrs", referenceMin: 6, referenceMax: 9, optimalMin: 7.5, optimalMax: 9, improvement: "target range" }],
  // Body composition
  ["body fat", { name: "Body Fat", category: "bodyComposition", subcategory: "fat", unit: "%", referenceMin: 8, referenceMax: 25, optimalMin: 10, optimalMax: 20, improvement: "lower is better" }],
  ["lean mass", { name: "Lean Mass", category: "bodyComposition", subcategory: "leanMass", unit: "lbs", referenceMin: null, referenceMax: null, optimalMin: 165, optimalMax: null, improvement: "higher is better" }],
  ["visceral fat (vat)", { name: "Visceral Fat (VAT)", category: "bodyComposition", subcategory: "fat", unit: "g", referenceMin: null, referenceMax: 1000, optimalMin: null, optimalMax: 600, improvement: "lower is better" }],
];

// Merge: common panels fill gaps, Neon data wins for owner-specific values
for (const [key, entry] of commonPanels) {
  if (!dictionary.has(key)) {
    dictionary.set(key, entry);
  }
}

console.log(`[seed-dictionary] Dictionary has ${dictionary.size} total entries (owner + common panels)`);

// ── 5. Generate the TypeScript file ─────────────────────────────────────────

function renderEntry(entry: AnalyteEntryRaw): string {
  const formatNum = (n: number | null) => n === null ? 'null' : n.toString();
  return `  {
    name: ${JSON.stringify(entry.name)},
    category: ${JSON.stringify(entry.category)},
    subcategory: ${JSON.stringify(entry.subcategory)},
    unit: ${JSON.stringify(entry.unit)},
    referenceMin: ${formatNum(entry.referenceMin)},
    referenceMax: ${formatNum(entry.referenceMax)},
    optimalMin: ${formatNum(entry.optimalMin)},
    optimalMax: ${formatNum(entry.optimalMax)},
    improvement: ${JSON.stringify(entry.improvement)},
  }`;
}

const sortedEntries = [...dictionary.entries()].sort(([a], [b]) => a.localeCompare(b));

const dictEntries = sortedEntries
  .map(([key, entry]) => `  ${JSON.stringify(key)}: ${renderEntry(entry)},`)
  .join('\n');

const fileContent = `// Server-only: do not import from client components
// analyte-dictionary.ts — canonical analyte→metric mapping for the lab ingest pipeline.
// This file is non-PHI reference data (ranges/metadata only — no subject values).
// D-01: this dictionary is the authority for name, category, subcategory, unit,
//       referenceMin/Max, optimalMin/Max. LLM maps lines to keys; does not invent ranges.
// D-03: v1 scope = owner's M0 analytes + standard common panels (CBC, CMP, lipids,
//       thyroid, vitamins/minerals, hs-CRP/homocysteine).
//
// REGENERATED: ${new Date().toISOString()}
// Source: live Neon metrics rows (${rows.length} distinct analytes) + D-03 common panels
// To regenerate: npm run db:seed-dictionary (from remix-app/)

import type { MetricCategory } from '~/types/metrics';

export interface AnalyteEntry {
  /** Canonical display name for the metrics table */
  name: string;
  category: MetricCategory;
  subcategory: string;
  /** Canonical unit — extracted unit must match exactly or route to unrecognized */
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  optimalMin: number | null;
  optimalMax: number | null;
  improvement: 'higher is better' | 'lower is better' | 'target range';
}

// Keys: lowercase-normalized analyte names (e.g. "ferritin", "tsh", "25-oh vitamin d")
// Aliases: multiple keys can point to the same entry for common lab portal variants.
export const ANALYTE_DICTIONARY: Record<string, AnalyteEntry> = {
${dictEntries}
};

/**
 * Normalize lookup key: lowercase, collapse whitespace, trim.
 * This matches common lab portal naming variations (case, spacing).
 */
export function lookupAnalyte(rawName: string): AnalyteEntry | null {
  const key = rawName.toLowerCase().replace(/\\s+/g, ' ').trim();
  return ANALYTE_DICTIONARY[key] ?? null;
}
`;

// ── 6. Write the file ─────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputPath = resolve(__dirname, '../app/lib/ingest/analyte-dictionary.ts');

writeFileSync(outputPath, fileContent, 'utf-8');
console.log(`[seed-dictionary] Written to: ${outputPath}`);
console.log(`[seed-dictionary] Entries from live Neon: ${rows.length}`);
console.log(`[seed-dictionary] Total entries (including common panels): ${dictionary.size}`);

// Print a summary of owner analytes found
const ownerKeys = rows.map((r) => normalize(r.name));
console.log(`\n[seed-dictionary] Owner metric analytes in dictionary:`);
for (const key of ownerKeys) {
  console.log(`  - ${key}`);
}
