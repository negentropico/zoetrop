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

// ── Genetics knowledge by gene ────────────────────────────────────────────────

/**
 * GeneticKnowledgeEntry — shape returned by getGeneticKnowledgeByGene.
 * Mirrors the legacy GENETIC_KNOWLEDGE record shape so loaders require
 * minimal changes.
 *
 *   confidence  — evidence tier, uppercase ("K1"–"K4"), mapped from corpus k1–k4
 *   protocolAction — actionDetail if present, else first sentence of
 *                    recommendationText (≤ 140 chars), for compact UI display
 *   notes       — knowledgeSource field (provenance / assay notes)
 */
export interface CorpusGeneticKnowledgeEntry {
  confidence: string;          // "K1" | "K2" | "K3" | "K4"
  category: string;
  impact: string;
  clinicalImplication: string;
  protocolAction: string;
  notes?: string;
}

/**
 * Returns corpus genetic knowledge keyed by gene name, suitable as a
 * drop-in replacement for the legacy GENETIC_KNOWLEDGE static record.
 *
 * Join: geneticVariants.gene → variantProtocolMap (1:1 per corpus design).
 * When a gene has multiple corpus rows (multiple genotype patterns), the
 * first row encountered is used; the full corpus read is available via
 * getVariantMaps() for the engine.
 *
 * Used by loaders in insights/genetics.tsx, insights/index.tsx, dashboard.tsx.
 */
export async function getGeneticKnowledgeByGene(): Promise<Record<string, CorpusGeneticKnowledgeEntry>> {
  const rows = await getVariantMaps();

  const map: Record<string, CorpusGeneticKnowledgeEntry> = {};
  for (const row of rows) {
    const gene = row.genetic_variants.gene;
    // First row wins (handles multi-pattern genes; engine uses all rows via getVariantMaps)
    if (map[gene]) continue;

    // Map evidence tier k1→K1, k2→K2, etc.
    const confidence = row.variant_protocol_map.evidenceTier.toUpperCase();

    // Derive a compact protocolAction for UI display
    const actionDetail = row.variant_protocol_map.actionDetail;
    let protocolAction: string;
    if (actionDetail) {
      protocolAction = actionDetail;
    } else {
      // First sentence of recommendationText, capped at 140 chars
      const full = row.variant_protocol_map.recommendationText;
      const firstPeriod = full.indexOf(". ");
      const sentence = firstPeriod !== -1 ? full.slice(0, firstPeriod + 1) : full;
      protocolAction = sentence.length <= 140 ? sentence : sentence.slice(0, 137) + "…";
    }

    map[gene] = {
      confidence,
      category: row.genetic_variants.category,
      impact: row.genetic_variants.impact,
      clinicalImplication: row.genetic_variants.clinicalImplication,
      protocolAction,
      notes: row.genetic_variants.knowledgeSource ?? undefined,
    };
  }
  return map;
}
