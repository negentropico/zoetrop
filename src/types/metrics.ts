// Metric types - ported and enhanced from /Users/mac/Code/Dash/src/types/metrics/types.ts

export type MetricStatus = 'optimal' | 'borderline' | 'deficient' | 'excess';
export type MetricTrend = 'improving' | 'stable' | 'declining';
export type ImprovementDirection = 'higher is better' | 'lower is better' | 'target range';
export type DataSource = 'manual' | 'whoop' | 'dexa' | 'bloodwork' | 'csv' | 'vault';
export type SyncStatus = 'local' | 'synced' | 'pending';

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
  syncStatus: SyncStatus;
  syncVersion: number;
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
  syncVersion: number;
}

// Category metadata
export interface CategoryInfo {
  id: MetricCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
}

export const CATEGORY_INFO: Record<MetricCategory, CategoryInfo> = {
  vitamins: {
    id: 'vitamins',
    label: 'Vitamins',
    description: 'B-vitamins and fat-soluble vitamins',
    icon: 'pill',
    color: 'text-amber-500',
  },
  minerals: {
    id: 'minerals',
    label: 'Minerals',
    description: 'Essential and trace minerals',
    icon: 'gem',
    color: 'text-slate-500',
  },
  inflammatory: {
    id: 'inflammatory',
    label: 'Inflammatory',
    description: 'Inflammation markers',
    icon: 'flame',
    color: 'text-red-500',
  },
  metabolic: {
    id: 'metabolic',
    label: 'Metabolic',
    description: 'Glucose, kidney, electrolytes',
    icon: 'zap',
    color: 'text-yellow-500',
  },
  hormones: {
    id: 'hormones',
    label: 'Hormones',
    description: 'Sex, thyroid, cortisol',
    icon: 'activity',
    color: 'text-purple-500',
  },
  autonomic: {
    id: 'autonomic',
    label: 'Autonomic',
    description: 'HRV, recovery, sleep (WHOOP)',
    icon: 'heart-pulse',
    color: 'text-pink-500',
  },
  bodyComposition: {
    id: 'bodyComposition',
    label: 'Body Composition',
    description: 'DEXA, lean mass, body fat',
    icon: 'user',
    color: 'text-blue-500',
  },
  lipids: {
    id: 'lipids',
    label: 'Lipids',
    description: 'Cholesterol, triglycerides',
    icon: 'droplet',
    color: 'text-orange-500',
  },
  hematology: {
    id: 'hematology',
    label: 'Hematology',
    description: 'CBC, hemoglobin, WBC',
    icon: 'test-tube',
    color: 'text-rose-500',
  },
};
