// Protocol and supplement types

export type SupplementTier = 'tier1' | 'tier2' | 'tier3' | 'as_needed';
export type ProtocolChangeType = 'added' | 'removed' | 'dosage_changed' | 'timing_changed' | 'frequency_changed';
export type CessationPhase = 'acute' | 'stabilization' | 'clearing' | 'optimization';

// Protocol version (601 → 602 → 603)
export interface ProtocolVersion {
  id: number;
  version: string;
  effectiveDate: string;
  notes?: string;
}

// Changes between protocol versions
export interface ProtocolChange {
  id: number;
  versionId: number;
  supplementName: string;
  changeType: ProtocolChangeType;
  oldDosage?: string;
  newDosage?: string;
  rationale?: string;
}

// Supplement definition
export interface Supplement {
  id: number;
  name: string;
  dosage: number;
  unit: string;
  frequency: string;
  tier: SupplementTier;
  geneticBasis?: string;
  timing?: string;
  notes?: string;
  isActive: boolean;
}

// Supplement log entry
export interface SupplementLogEntry {
  id: number;
  supplementId: number;
  takenAt: string;
  dosage?: number;
  notes?: string;
}

// Correlation between supplement and metric
export interface Correlation {
  id: number;
  supplementId: number;
  metricName: string;
  correlation: number; // -1 to 1
  lagDays: number;
  sampleSize: number;
  pValue?: number;
  calculatedAt: string;
}

// Milestone with biometric snapshot
export interface Milestone {
  id: number;
  date: string;
  description: string;
  protocolVersion?: string;
  biometricSnapshot?: Record<string, number>;
}

// Cessation tracking
export interface CessationLog {
  id: number;
  startDate: string;
  currentPhase: CessationPhase;
  endDate?: string;
  notes?: string;
}

// Phase information for cessation
export interface CessationPhaseInfo {
  phase: CessationPhase;
  label: string;
  dayRange: { start: number; end: number };
  focus: string;
  description: string;
}

export const CESSATION_PHASES: CessationPhaseInfo[] = [
  {
    phase: 'acute',
    label: 'Acute',
    dayRange: { start: 1, end: 21 },
    focus: 'Sleep support, light training',
    description: 'Initial withdrawal phase with focus on sleep quality and gentle recovery',
  },
  {
    phase: 'stabilization',
    label: 'Stabilization',
    dayRange: { start: 22, end: 60 },
    focus: 'Progressive overload',
    description: 'Gradual return to normal training intensity with physiological adaptation',
  },
  {
    phase: 'clearing',
    label: 'Clearing',
    dayRange: { start: 61, end: 120 },
    focus: 'FAAH metabolic clearing',
    description: 'Extended clearing phase for complete metabolic normalization (FAAH variant)',
  },
  {
    phase: 'optimization',
    label: 'Optimization',
    dayRange: { start: 121, end: 150 },
    focus: 'Tier 1 supplements only',
    description: 'Final optimization phase with minimal supplementation',
  },
];

// Tier information
export interface SupplementTierInfo {
  tier: SupplementTier;
  label: string;
  description: string;
  color: string;
}

export const SUPPLEMENT_TIERS: Record<SupplementTier, SupplementTierInfo> = {
  tier1: {
    tier: 'tier1',
    label: 'Tier 1',
    description: 'Essential supplements based on genetic/lab evidence',
    color: 'text-green-500',
  },
  tier2: {
    tier: 'tier2',
    label: 'Tier 2',
    description: 'Supporting supplements with moderate evidence',
    color: 'text-blue-500',
  },
  tier3: {
    tier: 'tier3',
    label: 'Tier 3',
    description: 'Experimental or situational supplements',
    color: 'text-yellow-500',
  },
  as_needed: {
    tier: 'as_needed',
    label: 'As Needed',
    description: 'Used situationally based on symptoms or conditions',
    color: 'text-gray-500',
  },
};
