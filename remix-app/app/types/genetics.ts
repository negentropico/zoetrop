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

export interface ConfidenceLevelInfo {
  level: ConfidenceLevel;
  label: string;
  description: string;
  source: string;
  color: string;
}

export const CONFIDENCE_LEVELS: Record<ConfidenceLevel, ConfidenceLevelInfo> = {
  K1: {
    level: 'K1',
    label: 'Confirmed',
    description: 'Verified in 23andMe raw data',
    source: 'survey.md',
    color: 'text-green-600 dark:text-green-400',
  },
  K2: {
    level: 'K2',
    label: 'Likely',
    description: 'High confidence from clinical patterns',
    source: 'Clinical assessment',
    color: 'text-blue-600 dark:text-blue-400',
  },
  K3: {
    level: 'K3',
    label: 'Inferred',
    description: 'Third-party reanalysis (SelfDecode, StrateGene)',
    source: 'SelfDecode',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  K4: {
    level: 'K4',
    label: 'Requires Testing',
    description: 'Needs specialized panel for confirmation',
    source: 'Pending',
    color: 'text-gray-500 dark:text-gray-500',
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
