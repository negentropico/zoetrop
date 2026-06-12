/**
 * corpus.server.ts — Corpus read layer (Plan 06-02 / ENG-02)
 *
 * Source-agnostic corpus read helpers for the report generator and engine.
 * Reads non-PHI population knowledge from the three corpus tables:
 *   - geneticVariants + variantProtocolMap (joined)
 *   - metricProtocolMap
 *
 * D-12: corpus/engine source-agnostic design — deferred diagnostic sources
 * (DUTCH/HTMA/WHOOP/DEXA) slot in as corpus + ingest additions without
 * changing this interface.
 *
 * Phase 7 note: these functions use getDb() directly (no tenantId scope)
 * because corpus tables are population-level non-PHI. They do NOT need the
 * withTenantDb() retrofit from Phase 7.
 */

import { getDb } from "./db.server";
import { eq } from "drizzle-orm";
import {
  geneticVariants,
  variantProtocolMap,
  metricProtocolMap,
} from "../../db/schema";

// ── Corpus version stamp ──────────────────────────────────────────────────────

/**
 * Corpus version — written to all corpus rows at seed time and to
 * reports.corpusVersion at report generation time (D-17 / PATTERNS.md).
 * Bump when the corpus content is materially revised.
 */
export const CORPUS_VERSION = "v1.0-owner-2026-06" as const;

// ── Corpus read helpers ───────────────────────────────────────────────────────

/**
 * Returns all variantProtocolMap rows joined to their parent geneticVariants row.
 * Used by the engine's mapVariantToProtocol function.
 * Returns a shape mappable to VariantMap from ~/types/report (06-01).
 */
export async function getVariantMaps() {
  const db = getDb();
  return db
    .select()
    .from(variantProtocolMap)
    .innerJoin(geneticVariants, eq(variantProtocolMap.variantId, geneticVariants.id));
}

/**
 * Returns all metricProtocolMap rows.
 * Used by the engine's metric-rule evaluation at report generation time.
 */
export async function getMetricRules() {
  const db = getDb();
  return db.select().from(metricProtocolMap);
}
