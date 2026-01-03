// WHOOP types - based on /Users/mac/Code/Whoop/results/whoop_analysis_report.json

export interface WhoopKeyMetrics {
  avg_hrv_rmssd: number;
  avg_resting_heart_rate: number;
  avg_recovery_score: number;
  avg_day_strain: number;
  avg_calories_burned: number;
  avg_asleep: number;
  avg_in_bed: number;
  avg_light_sleep: number;
  avg_deep_sws: number;
  avg_rem: number;
  avg_workout_strain: number;
  avg_workout_calories: number;
  avg_workout_heart_rate: number;
  avg_workout_duration: number;
}

export interface WhoopMacros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  total_calories: number;
}

export interface WhoopRecoveryAnalysis {
  recent_recovery_avg: number;
  previous_recovery_avg: number;
  recovery_trend: string;
  recovery_change_pct: number;
  recent_hrv_avg: number;
  previous_hrv_avg: number;
  hrv_trend: string;
  hrv_change_pct: number;
  actual_tdee: number;
  adjusted_macros: WhoopMacros;
}

export interface WhoopWorkoutAnalysis {
  peak_performance_hours: number[];
  optimal_pre_workout_windows: number[][];
  workout_days: Record<string, number>;
}

export interface WhoopAnalysisReport {
  generated_at: string;
  data_period: {
    start: string;
    end: string;
  };
  key_metrics: WhoopKeyMetrics;
  recovery_analysis: WhoopRecoveryAnalysis;
  workout_analysis: WhoopWorkoutAnalysis;
  protocol_recommendations: string[];
  errors: string[];
  warnings: string[];
}

// Cessation protocol phases - from /Users/mac/Code/Whoop/src/constants.py
export interface CessationPhase {
  name: string;
  startDay: number;
  endDay: number;
  focus: string;
}

export const CESSATION_PHASES: CessationPhase[] = [
  {
    name: 'Acute',
    startDay: 1,
    endDay: 21,
    focus: 'Sleep support, light training',
  },
  {
    name: 'Stabilization',
    startDay: 22,
    endDay: 60,
    focus: 'Reduce melatonin, progressive overload',
  },
  {
    name: 'Clearing',
    startDay: 61,
    endDay: 120,
    focus: 'FAAH metabolic clearing',
  },
  {
    name: 'Optimization',
    startDay: 121,
    endDay: 150,
    focus: 'Tier 1 supplements only',
  },
];

export interface CessationStatus {
  phase: CessationPhase;
  currentDay: number;
  daysRemaining: number;
  totalDays: number;
  percentComplete: number;
}

/**
 * Calculate current cessation phase based on start date
 */
export function getCessationStatus(startDate: Date): CessationStatus {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const currentDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Find current phase
  let phase = CESSATION_PHASES[CESSATION_PHASES.length - 1];
  for (const p of CESSATION_PHASES) {
    if (currentDay >= p.startDay && currentDay <= p.endDay) {
      phase = p;
      break;
    }
  }

  const totalDays = 150; // Full protocol
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const percentComplete = Math.min(100, (currentDay / totalDays) * 100);

  return {
    phase,
    currentDay,
    daysRemaining,
    totalDays,
    percentComplete,
  };
}
