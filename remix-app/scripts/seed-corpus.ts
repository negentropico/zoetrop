/**
 * seed-corpus.ts — Idempotent corpus seed scaffold (Plan 06-02 / ENG-02)
 *
 * Populates the three non-PHI corpus tables:
 *   - genetic_variants
 *   - variant_protocol_map
 *   - metric_protocol_map
 *
 * This scaffold ships EMPTY arrays in Plan 06-02 (structural skeleton only).
 * Plan 06-03 fills corpusSeedData with reviewed genetic/metric content.
 *
 * Run from remix-app/:
 *   npm run db:seed-corpus
 *
 * Required env vars:
 *   DATABASE_URL or DATABASE_URL_UNPOOLED
 *
 * Idempotent: uses ON CONFLICT DO NOTHING / check-before-insert so it is
 * safe to re-run without creating duplicate rows.
 *
 * IMPORTANT: The `corpusSeedData` export is a NAMED export (not default)
 * so tests/lib/corpus-lint.test.ts can import { corpusSeedData } and run
 * imperative-pattern lint over the recommendation texts.
 */

import { getDb } from "../app/lib/db.server";
import { geneticVariants, variantProtocolMap, metricProtocolMap } from "../db/schema";
import { sql } from "drizzle-orm";
import { CORPUS_VERSION } from "../app/lib/corpus.server";

// ── 1. Validate required env vars ─────────────────────────────────────────────

const DB_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error(
    "DATABASE_URL or DATABASE_URL_UNPOOLED env var is required. " +
    "Run with: npm run db:seed-corpus (from remix-app/)"
  );
}

// ── 2. Corpus seed data ───────────────────────────────────────────────────────

/**
 * Corpus seed data — exported as a named export so corpus-lint.test.ts can
 * import and run imperative-pattern lint over the recommendation texts.
 *
 * Structure:
 *   variantRules — entries for geneticVariants + variantProtocolMap insert
 *   metricRules  — entries for metricProtocolMap insert
 *
 * 06-02 ships empty arrays (structural skeleton). 06-03 fills reviewed content.
 */
export const corpusSeedData = {
  /**
   * Variant rules — each entry includes both the geneticVariants parent row
   * and its child variantProtocolMap recommendation row.
   */
  variantRules: [] as Array<{
    // geneticVariants fields
    gene: string;
    rsid?: string | null;
    genotypePattern?: string | null;
    category: string;
    impact: string;
    clinicalImplication: string;
    knowledgeSource?: string | null;
    // variantProtocolMap fields
    evidenceTier: 'k1' | 'k2' | 'k3' | 'k4';
    recommendationText: string;
    evidenceCitation?: string | null;
    actionDetail?: string | null;
  }>,

  /**
   * Metric rules — each entry is one metricProtocolMap row.
   * category must match metricCategoryEnum values.
   */
  metricRules: [] as Array<{
    metricName: string;
    conditionStatus: string;
    category: 'vitamins' | 'minerals' | 'inflammatory' | 'metabolic' | 'hormones' | 'autonomic' | 'bodyComposition' | 'lipids' | 'hematology';
    evidenceTier: 'k1' | 'k2' | 'k3' | 'k4';
    recommendationText: string;
    evidenceCitation?: string | null;
    actionDetail?: string | null;
  }>,
};

// ── 3. Seed function ──────────────────────────────────────────────────────────

console.log("[seed-corpus] Connecting to live Neon...");
const db = getDb();

let variantRulesInserted = 0;
let metricRulesInserted = 0;

// Insert variant rules (geneticVariants + variantProtocolMap)
for (const rule of corpusSeedData.variantRules) {
  // Insert parent geneticVariants row — ON CONFLICT DO NOTHING (idempotent)
  const [variant] = await db
    .insert(geneticVariants)
    .values({
      gene: rule.gene,
      rsid: rule.rsid ?? null,
      genotypePattern: rule.genotypePattern ?? null,
      category: rule.category,
      impact: rule.impact,
      clinicalImplication: rule.clinicalImplication,
      knowledgeSource: rule.knowledgeSource ?? null,
      corpusVersion: CORPUS_VERSION,
    })
    .returning({ id: geneticVariants.id });

  if (!variant) {
    console.log(`[seed-corpus] Skipped duplicate variant: ${rule.gene} ${rule.genotypePattern ?? '(any)'}`);
    continue;
  }

  // Insert child variantProtocolMap row
  await db
    .insert(variantProtocolMap)
    .values({
      variantId: variant.id,
      evidenceTier: rule.evidenceTier,
      recommendationText: rule.recommendationText,
      evidenceCitation: rule.evidenceCitation ?? null,
      actionDetail: rule.actionDetail ?? null,
      corpusVersion: CORPUS_VERSION,
    });

  variantRulesInserted++;
}

// Insert metric rules — ON CONFLICT DO NOTHING via sql`` guard
for (const rule of corpusSeedData.metricRules) {
  // Check for existing row (idempotent: skip if (metricName, conditionStatus) exists)
  const existing = await db.execute(
    sql`SELECT id FROM metric_protocol_map
        WHERE metric_name = ${rule.metricName}
          AND condition_status = ${rule.conditionStatus}
          AND corpus_version = ${CORPUS_VERSION}
        LIMIT 1`
  );

  if ((existing as { rows: unknown[] }).rows.length > 0) {
    console.log(`[seed-corpus] Skipped duplicate metric rule: ${rule.metricName} / ${rule.conditionStatus}`);
    continue;
  }

  await db.insert(metricProtocolMap).values({
    metricName: rule.metricName,
    conditionStatus: rule.conditionStatus,
    category: rule.category,
    evidenceTier: rule.evidenceTier,
    recommendationText: rule.recommendationText,
    evidenceCitation: rule.evidenceCitation ?? null,
    actionDetail: rule.actionDetail ?? null,
    corpusVersion: CORPUS_VERSION,
  });

  metricRulesInserted++;
}

console.log(`[seed-corpus] Inserted ${variantRulesInserted} variant rules, ${metricRulesInserted} metric rules`);
console.log(`[seed-corpus] Corpus version: ${CORPUS_VERSION}`);
