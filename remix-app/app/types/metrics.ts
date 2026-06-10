// Metric types - ported from Astro project /Users/mac/Code/zoetrop/src/types/metrics.ts

export type MetricStatus = 'optimal' | 'borderline' | 'deficient' | 'excess';
export type MetricTrend = 'improving' | 'stable' | 'declining';
export type ImprovementDirection = 'higher is better' | 'lower is better' | 'target range';
export type DataSource = 'manual' | 'whoop' | 'dexa' | 'bloodwork' | 'csv' | 'vault' | 'lab'; // 'lab' added Plan 05-01 (D-16)

// 9 Metric Categories
export type MetricCategory =
  | 'vitamins'
  | 'minerals'
  | 'inflammatory'
  | 'metabolic'
  | 'hormones'
  | 'autonomic'
  | 'bodyComposition'
  | 'lipids'
  | 'hematology';

// Subcategories by category
export type VitaminSubcategory = 'b-vitamins' | 'fat-soluble';
export type MineralSubcategory = 'essential' | 'trace';
export type InflammatorySubcategory = 'crp' | 'homocysteine' | 'cytokines' | 'oxidativeStress';
export type MetabolicSubcategory = 'glucose' | 'kidney' | 'electrolytes' | 'acidBase';
export type HormoneSubcategory = 'thyroid' | 'sex' | 'cortisol' | 'growth';
export type AutonomicSubcategory = 'hrv' | 'bloodPressure' | 'sleep' | 'recovery';
export type BodyCompositionSubcategory = 'fat' | 'leanMass' | 'boneDensity' | 'regional';
export type LipidSubcategory = 'cholesterol' | 'triglycerides' | 'lipoproteins';
export type HematologySubcategory = 'cbc' | 'hemoglobin' | 'wbc' | 'platelets';

export type MetricSubcategory =
  | VitaminSubcategory
  | MineralSubcategory
  | InflammatorySubcategory
  | MetabolicSubcategory
  | HormoneSubcategory
  | AutonomicSubcategory
  | BodyCompositionSubcategory
  | LipidSubcategory
  | HematologySubcategory;

// Reference and optimal ranges
export interface MetricRange {
  min: number;
  max: number;
}

export interface MetricRanges {
  reference: MetricRange;
  optimal?: MetricRange;
}

// Base metric interface
export interface BaseMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string; // ISO 8601
  description?: string;
  improvement: ImprovementDirection;
  referenceRange?: MetricRange;
  optimalRange?: MetricRange;
  source: DataSource;
}

// Category-specific metrics
export interface VitaminMetric extends BaseMetric {
  category: 'vitamins';
  subcategory: VitaminSubcategory;
}

export interface MineralMetric extends BaseMetric {
  category: 'minerals';
  subcategory: MineralSubcategory;
}

export interface InflammatoryMetric extends BaseMetric {
  category: 'inflammatory';
  subcategory: InflammatorySubcategory;
}

export interface MetabolicMetric extends BaseMetric {
  category: 'metabolic';
  subcategory: MetabolicSubcategory;
}

export interface HormoneMetric extends BaseMetric {
  category: 'hormones';
  subcategory: HormoneSubcategory;
}

export interface AutonomicMetric extends BaseMetric {
  category: 'autonomic';
  subcategory: AutonomicSubcategory;
}

export interface BodyCompositionMetric extends BaseMetric {
  category: 'bodyComposition';
  subcategory: BodyCompositionSubcategory;
}

export interface LipidMetric extends BaseMetric {
  category: 'lipids';
  subcategory: LipidSubcategory;
}

export interface HematologyMetric extends BaseMetric {
  category: 'hematology';
  subcategory: HematologySubcategory;
}

// Union type for all metrics
export type Metric =
  | VitaminMetric
  | MineralMetric
  | InflammatoryMetric
  | MetabolicMetric
  | HormoneMetric
  | AutonomicMetric
  | BodyCompositionMetric
  | LipidMetric
  | HematologyMetric;

// Calculation results
export interface MetricCalculationResult {
  status: MetricStatus;
  trend: MetricTrend;
  percentChange?: number;
  significance?: number; // 0-1 statistical significance
}

// Storage types
export interface StoredMetrics {
  metrics: Metric[];
  lastUpdated: string;
}

// Category metadata
// icon: Lucide icon name (D-05) — replaces emoji; used with CatChip via dynamic icon lookup
// family: metric family for CatChip tint (D-04) — 'vital' | 'energy' | null
// color field removed: color is now status-driven via CatChip/StatusBadge
export interface CategoryInfo {
  id: MetricCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name (e.g. 'pill', 'heart-pulse', 'dna')
  family: 'vital' | 'energy' | null; // metric family for CatChip tint
}

export const CATEGORY_INFO: Record<MetricCategory, CategoryInfo> = {
  vitamins: {
    id: 'vitamins',
    label: 'Vitamins',
    description: 'B-vitamins and fat-soluble vitamins',
    icon: 'pill',
    family: null,
  },
  minerals: {
    id: 'minerals',
    label: 'Minerals',
    description: 'Essential and trace minerals',
    icon: 'gem',
    family: null,
  },
  inflammatory: {
    id: 'inflammatory',
    label: 'Inflammatory',
    description: 'Inflammation markers',
    icon: 'flame',
    family: null,
  },
  metabolic: {
    id: 'metabolic',
    label: 'Metabolic',
    description: 'Glucose, kidney, electrolytes',
    icon: 'zap',
    family: null,
  },
  hormones: {
    id: 'hormones',
    label: 'Hormones',
    description: 'Sex, thyroid, cortisol',
    icon: 'flask-conical',
    family: null,
  },
  autonomic: {
    id: 'autonomic',
    label: 'Autonomic',
    description: 'HRV, recovery, sleep (WHOOP)',
    icon: 'heart-pulse',
    family: 'vital',
  },
  bodyComposition: {
    id: 'bodyComposition',
    label: 'Body Composition',
    description: 'DEXA, lean mass, body fat',
    icon: 'dumbbell',
    family: 'energy',
  },
  lipids: {
    id: 'lipids',
    label: 'Lipids',
    description: 'Cholesterol, triglycerides',
    icon: 'droplet',
    family: null,
  },
  hematology: {
    id: 'hematology',
    label: 'Hematology',
    description: 'CBC, hemoglobin, WBC',
    icon: 'dna',
    family: null,
  },
};
