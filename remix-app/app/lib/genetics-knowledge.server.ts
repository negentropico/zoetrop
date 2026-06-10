/**
 * genetics-knowledge.server.ts
 * Interim Phase 4 knowledge module — retired by Phase 6 engine.
 *
 * The `.server.ts` suffix prevents React Router from bundling this into
 * the client bundle (T-04-KNOW-LEAK). Do NOT import from client components.
 *
 * Join key: `gene` (string, case-sensitive) — matches subject_genotypes.gene.
 * Non-PHI only: no genotype, rsid, or measured values are stored here.
 * PHI (genotype, rsid) lives in the `subject_genotypes` table (Plan 01 schema).
 *
 * Source: non-PHI fields extracted from seedGeneticVariants in app/lib/seed-data.ts.
 * The join key (`gene`) equals `subjectGenotypes.gene` so Plan 04's genetics
 * loader can join DB rows with this knowledge module by gene name.
 */

import type { ConfidenceLevel, VariantCategory, VariantImpact } from "../types/genetics";

// ── GeneticKnowledgeEntry ──────────────────────────────────────────────────────
//
// Non-PHI fields only. Every field here is population-level knowledge,
// NOT individual measurement data.

export interface GeneticKnowledgeEntry {
  confidence: ConfidenceLevel;
  category: VariantCategory;
  impact: VariantImpact;
  clinicalImplication: string;
  protocolAction: string;
  notes?: string;
}

// ── GENETIC_KNOWLEDGE ─────────────────────────────────────────────────────────
//
// Record<gene, GeneticKnowledgeEntry> — keyed by the gene name string.
// 16 entries covering all variants from the M0 genetic profile.
// Keys are case-sensitive and must match subject_genotypes.gene exactly.

export const GENETIC_KNOWLEDGE: Record<string, GeneticKnowledgeEntry> = {
  "NAFLD Risk": {
    confidence: "K1",
    category: "metabolism",
    impact: "high",
    clinicalImplication: "Liver protection essential",
    protocolAction: "Vitamin E 800 IU, hepatotoxin avoidance",
  },
  "FAAH": {
    confidence: "K3",
    category: "metabolism",
    impact: "high",
    clinicalImplication: "Cannabis sensitivity, slower clearance",
    protocolAction: "120+ day cessation minimum",
    notes: "Not in 23andMe array, inferred from SelfDecode",
  },
  "CYP1A2": {
    confidence: "K3",
    category: "metabolism",
    impact: "high",
    clinicalImplication: "Slow caffeine metabolism",
    protocolAction: "<200mg caffeine, AM only",
    notes: "Not in 23andMe array, inferred from SelfDecode",
  },
  "MTHFR": {
    confidence: "K1",
    category: "methylation",
    impact: "high",
    clinicalImplication: "Reduced methylation capacity",
    protocolAction: "Methylfolate 800mcg",
  },
  "COMT": {
    confidence: "K1",
    category: "neurotransmitter",
    impact: "high",
    clinicalImplication: "Intermediate activity, catecholamines 40% slower",
    protocolAction: "Avoid methyl donors, tyrosine",
  },
  "APOE": {
    confidence: "K1",
    category: "cardiovascular",
    impact: "high",
    clinicalImplication: "Elevated cardiovascular risk",
    protocolAction: "LDL management priority",
  },
  "BDNF": {
    confidence: "K1",
    category: "neurotransmitter",
    impact: "high",
    clinicalImplication: "Altered neuroplasticity",
    protocolAction: "Exercise non-negotiable",
  },
  "GPX1": {
    confidence: "K1",
    category: "detoxification",
    impact: "moderate",
    clinicalImplication: "Heterozygous",
    protocolAction: "Selenium 200mcg",
  },
  "SOD2": {
    confidence: "K1",
    category: "detoxification",
    impact: "moderate",
    clinicalImplication: "Moderate oxidative risk",
    protocolAction: "Antioxidant support",
  },
  "NAT2": {
    confidence: "K1",
    category: "detoxification",
    impact: "moderate",
    clinicalImplication: "Slow acetylator (3 SNPs)",
    protocolAction: "Slower drug/toxin clearance",
  },
  "IL-6": {
    confidence: "K1",
    category: "inflammation",
    impact: "moderate",
    clinicalImplication: "Moderate inflammatory signaling",
    protocolAction: "Anti-inflammatory protocol",
  },
  "MAOA": {
    confidence: "K1",
    category: "neurotransmitter",
    impact: "moderate",
    clinicalImplication: "Higher activity (faster breakdown)",
    protocolAction: "Normal monoamine clearance",
    notes: "SelfDecode 'lower activity' claim was incorrect",
  },
  "DRD2/ANKK1": {
    confidence: "K1",
    category: "neurotransmitter",
    impact: "moderate",
    clinicalImplication: "Taq1A heterozygous",
    protocolAction: "Reduced D2 receptor density",
  },
  "HFE H63D": {
    confidence: "K1",
    category: "nutritional",
    impact: "low",
    clinicalImplication: "Heterozygous carrier (30% clinical impact)",
    protocolAction: "Monitor iron - markers currently normal",
  },
  "BCMO1": {
    confidence: "K1",
    category: "nutritional",
    impact: "low",
    clinicalImplication: "Reduced beta-carotene conversion",
    protocolAction: "Consider preformed vitamin A",
  },
  "FUT2": {
    confidence: "K1",
    category: "nutritional",
    impact: "informational",
    clinicalImplication: "Non-secretor variant",
    protocolAction: "B12/gut microbiome implications",
  },
};
