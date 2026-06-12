// Protocol engine functions and display constants (non-PHI survivors after Phase 4 D-09)
// Sources: 08_Cessation_Protocol.md, 06a_Daily_Guide.md, 06_Supplement_Protocol.md
//
// PHI data arrays (realCessationLog, realProtocolVersions, realProtocolChanges,
// realSupplements, realMilestones) were seeded to Neon in Plan 03 and deleted
// here in Plan 05 (D-09 cut-over complete; gated on owner approval 2026-06-10).
//
// Non-PHI survivors kept in this file:
//   - CESSATION_START_DATE (constant, not a measurement)
//   - getCessationDay / getCurrentCessationPhase (engine fns)
//   - dailySchedule / avoidList (display constants — generic schedule/avoid rules)

// =============================================================================
// CESSATION ENGINE FUNCTIONS (non-PHI — ENG-01 Phase 6)
// getCessationDay / getCessationPhase now live in engine.server.ts (D-01).
// Re-exported here for backward compatibility — call sites (cessation.ts,
// protocol-data.test.ts) continue to resolve these names without changes.
// =============================================================================

/**
 * Real cessation start date from vault: December 23, 2025
 * Source: 08_Cessation_Protocol.md - "Start Date: December 23, 2025"
 *
 * NOTE: This constant is retained as seed documentation and as the empty-cessation
 * default in route loaders. It is NOT a runtime input to getCessationDay — the day
 * calculation reads the startDateIso parameter passed from the DB cessation_log row.
 */
export const CESSATION_START_DATE = "2025-12-23T00:00:00.000Z";

// Re-exports from engine.server.ts (ENG-01, D-01)
export { getCessationDay } from "./engine.server";
export { getCessationPhase as getCurrentCessationPhase } from "./engine.server";

// =============================================================================
// DAILY SCHEDULE (non-PHI display constant — kept per D-06)
// =============================================================================

export interface DailyScheduleSlot {
  time: string;
  label: string;
  supplements: string[];
  notes?: string;
}

/**
 * Real daily supplement schedule
 * Source: 06a_Daily_Guide.md
 */
export const dailySchedule: DailyScheduleSlot[] = [
  {
    time: "6:30 AM",
    label: "Wake",
    supplements: [],
    notes: "Fixed wake time + immediate light exposure",
  },
  {
    time: "6:45-7:45 AM",
    label: "Training",
    supplements: [],
    notes: "Complete by 10 AM in acute phase, RPE 6-7 max",
  },
  {
    time: "8:00 AM",
    label: "Morning (with breakfast)",
    supplements: [
      "D3+K2 5000 IU",
      "Methylfolate 800mcg",
      "B12 1000mcg",
      "Choline 300mg",
      "Selenium 200mcg",
      "Vitamin C 500mg",
      "NAC 600mg",
      "Rhodiola 150mg",
      "Creatine 5g",
    ],
    notes: "Take with protein breakfast",
  },
  {
    time: "10:00 AM",
    label: "Caffeine cutoff",
    supplements: [],
    notes: "CYP1A2 slow metabolizer - <200mg before 10 AM only",
  },
  {
    time: "12:00-2:00 PM",
    label: "Lunch",
    supplements: ["Omega-3 1g", "Vitamin E 800 IU"],
    notes: "Take with fat-containing meal",
  },
  {
    time: "5:30-6:30 PM",
    label: "Dinner",
    supplements: ["Omega-3 1-2g", "Taurine 500-1000mg (Week 4+)"],
  },
  {
    time: "6:30 PM",
    label: "Wind-down begins",
    supplements: [],
    notes: "2-3 hrs for COMT intermediate",
  },
  {
    time: "8:00 PM",
    label: "Evening",
    supplements: ["Magnesium Glycinate 300-400mg", "Glycine 3g (Week 4+)", "NAC 600mg", "Vitamin C 500mg"],
    notes: "NAC away from protein meals",
  },
  {
    time: "8:30 PM",
    label: "Melatonin",
    supplements: ["Melatonin 0.3mg"],
    notes: "ADHD chronobiotic timing - 3+ hrs before DLMO",
  },
  {
    time: "9:00-9:30 PM",
    label: "Bedtime target",
    supplements: [],
    notes: "7.5+ hour sleep target",
  },
];

// =============================================================================
// AVOID LIST (non-PHI display constant — kept per D-06)
// =============================================================================

export interface AvoidItem {
  category: string;
  item: string;
  reason: string;
  phaseAdded: string;
}

/**
 * Permanent avoid list accumulated across all phases
 * Source: 06_Supplement_Protocol.md, Nutrients_Evolution.md
 */
export const avoidList: AvoidItem[] = [
  { category: "NSAIDs", item: "Ibuprofen (chronic)", reason: "Hepatotoxic + gut damage", phaseAdded: "P1" },
  { category: "Methyl donors", item: "SAM-e, TMG, Betaine", reason: "COMT methyl overload", phaseAdded: "P1" },
  { category: "Unnecessary", item: "Berberine", reason: "HOMA-IR 1.16 is excellent", phaseAdded: "P2" },
  { category: "B-vitamins", item: "AG1, mega-dose B-complex", reason: "B6/Biotin toxicity history", phaseAdded: "P3" },
  { category: "B-vitamins", item: "B6 >25mg, Biotin >1000mcg", reason: "Previous elevation (102.9 ug/L B6)", phaseAdded: "P3" },
  { category: "GABAergics (high)", item: "Benzos, Z-drugs, phenibut, alcohol", reason: "ASD paradox risk (~50%)", phaseAdded: "P5" },
  { category: "GABAergics (moderate)", item: "Valerian, hops, passionflower, kava, GABA", reason: "ASD paradox risk", phaseAdded: "P5" },
  { category: "Catecholamines", item: "L-tyrosine, L-DOPA, Mucuna", reason: "COMT intermediate catecholamine load", phaseAdded: "P5" },
  { category: "Melatonin", item: "Melatonin >0.5mg", reason: "ADHD - use 0.3mg chronobiotic only", phaseAdded: "P6" },
  { category: "Hepatotoxins", item: "Acetaminophen, high-dose niacin", reason: "NAFLD 98th percentile", phaseAdded: "All" },
  { category: "Caffeine", item: ">200mg or after 10 AM", reason: "CYP1A2 slow metabolizer", phaseAdded: "P2" },
];
