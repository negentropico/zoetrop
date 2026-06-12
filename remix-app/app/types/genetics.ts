// Genetic variant types based on 01_Profile.md

export type ConfidenceLevel = 'K1' | 'K2' | 'K3' | 'K4';
export type VariantImpact = 'high' | 'moderate' | 'low' | 'informational';
export type VariantCategory =
  | 'methylation'
  | 'detoxification'
  | 'neurotransmitter'
  | 'nutritional'
  | 'cardiovascular'
  | 'inflammation'
  | 'metabolism';

export interface GeneticVariant {
  id: string;
  gene: string;
  rsid?: string; // e.g., rs4680
  genotype: string; // e.g., A/G, C/T
  confidence: ConfidenceLevel;
  category: VariantCategory;
  impact: VariantImpact;
  clinicalImplication: string;
  protocolAction: string;
  notes?: string;
}

// ConfidenceLevelInfo carries evidence-tier semantics (D-07).
// The detection-oriented `source` and `color` fields are removed:
//   - `source` was detection-confidence metadata (23andMe/SelfDecode) — now in
//     GradedRecommendation.sourceContext.detectionConfidence (engine.ts)
//   - `color` was Tailwind classes — KGradeBadge now uses CSS vars per UI-SPEC Pattern 1
export interface ConfidenceLevelInfo {
  level: ConfidenceLevel;
  /** Evidence tier label (D-07): Established / Probable / Emerging / Speculative */
  label: string;
  /** Evidence tier description — external/published evidence strength (not measurement certainty) */
  description: string;
}

// CONFIDENCE_LEVELS: relabeled from detection-confidence to evidence tiers (D-07, Phase 6).
// K values (K1–K4) and the ConfidenceLevel union type are UNCHANGED.
// Labels now reflect external evidence strength of the finding-to-action link:
//   K1 Established → multiple RCTs / systematic reviews
//   K2 Probable    → observational studies / consistent mechanistic evidence
//   K3 Emerging    → preliminary studies; limited human data
//   K4 Speculative → expert opinion / case reports / theoretical mechanistic reasoning
export const CONFIDENCE_LEVELS: Record<ConfidenceLevel, ConfidenceLevelInfo> = {
  K1: {
    level: 'K1',
    label: 'Established',
    description: 'Multiple RCTs or systematic reviews support this finding-to-action link',
  },
  K2: {
    level: 'K2',
    label: 'Probable',
    description: 'Observational studies or consistent mechanistic evidence',
  },
  K3: {
    level: 'K3',
    label: 'Emerging',
    description: 'Preliminary studies; consistent with mechanism but limited human data',
  },
  K4: {
    level: 'K4',
    label: 'Speculative',
    description: 'Expert opinion, case reports, or theoretical mechanistic reasoning only',
  },
};

export interface VariantCategoryInfo {
  category: VariantCategory;
  label: string;
  description: string;
  icon: string;
}

export const VARIANT_CATEGORIES: Record<VariantCategory, VariantCategoryInfo> = {
  methylation: {
    category: 'methylation',
    label: 'Methylation',
    description: 'MTHFR, COMT, and related methylation pathway genes',
    icon: 'dna',
  },
  detoxification: {
    category: 'detoxification',
    label: 'Detoxification',
    description: 'Phase I/II detox enzymes (CYP, NAT2, GPX)',
    icon: 'filter',
  },
  neurotransmitter: {
    category: 'neurotransmitter',
    label: 'Neurotransmitter',
    description: 'Dopamine, serotonin, and GABA pathways',
    icon: 'brain',
  },
  nutritional: {
    category: 'nutritional',
    label: 'Nutritional',
    description: 'Nutrient absorption and metabolism',
    icon: 'apple',
  },
  cardiovascular: {
    category: 'cardiovascular',
    label: 'Cardiovascular',
    description: 'Heart health and lipid metabolism',
    icon: 'heart',
  },
  inflammation: {
    category: 'inflammation',
    label: 'Inflammation',
    description: 'Inflammatory response genes',
    icon: 'flame',
  },
  metabolism: {
    category: 'metabolism',
    label: 'Metabolism',
    description: 'Drug and substance metabolism',
    icon: 'zap',
  },
};
