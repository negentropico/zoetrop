// Real protocol data extracted from Bwell vault (602/)
// Sources: Nutrients_Evolution.md, Nutrients_M0.md, 08_Cessation_Protocol.md,
//          06_Supplement_Protocol.md, 11_Historical_Context.md, 06a_Daily_Guide.md

import type {
  ProtocolVersion,
  ProtocolChange,
  Supplement,
  CessationLog,
  Milestone,
  CessationPhase,
} from "../types/protocol";
import { CESSATION_PHASES } from "../types/protocol";
import { differenceInDays, parseISO } from "date-fns";

// =============================================================================
// CESSATION DATA
// =============================================================================

/**
 * Real cessation start date from vault: December 23, 2025
 * Source: 08_Cessation_Protocol.md - "Start Date: December 23, 2025"
 */
export const CESSATION_START_DATE = "2025-12-23T00:00:00.000Z";

/**
 * Calculate current cessation day from the real start date
 */
export function getCessationDay(now: Date = new Date()): number {
  return differenceInDays(now, parseISO(CESSATION_START_DATE));
}

/**
 * Get the current cessation phase based on day count
 */
export function getCurrentCessationPhase(day: number): typeof CESSATION_PHASES[0] {
  const phase = CESSATION_PHASES.find(
    (p) => day >= p.dayRange.start && day <= p.dayRange.end
  );
  if (phase) return phase;
  // No exact match: before the first phase begins (day 0 / the start date, or any
  // pre-start day) clamp to the first phase (acute); past the final range, clamp
  // to the last. Returning the last phase for day 0 was the inverse of correct.
  return day < CESSATION_PHASES[0].dayRange.start
    ? CESSATION_PHASES[0]
    : CESSATION_PHASES[CESSATION_PHASES.length - 1];
}

/**
 * Real cessation log entry
 */
export const realCessationLog: CessationLog[] = [
  {
    id: 1,
    startDate: CESSATION_START_DATE,
    currentPhase: "stabilization" as CessationPhase, // Day 29+ as of Jan 21, 2026
    notes:
      "FAAH lower activity variant requires 120+ day minimum. Previous 76-day attempt (May 5 - July 20, 2025) was insufficient for metabolic normalization.",
  },
];

// =============================================================================
// PROTOCOL VERSIONS (P0 -> P6)
// =============================================================================

/**
 * Real protocol versions from vault
 * Maps protocol codes (P0-P6) to protocol versions and dates
 * Source: 11_Historical_Context.md, Nutrients_Evolution.md
 */
export const realProtocolVersions: ProtocolVersion[] = [
  {
    id: 1,
    version: "P0",
    protocol: undefined,
    effectiveDate: "2024-12-01T00:00:00.000Z",
    notes:
      "Chaotic baseline: 1600mg ibuprofen daily, AG1, SAM-e 400mg, 400-500mg caffeine. No genetic-informed approach. Catalyst for protocol redesign.",
  },
  {
    id: 2,
    version: "P1",
    protocol: "v0",
    effectiveDate: "2025-01-15T00:00:00.000Z",
    notes:
      "Foundation: NSAID cessation, gut repair (L-Glutamine, Zinc Carnosine), sulfation repletion (Epsom baths, NAC). Core stack established.",
  },
  {
    id: 3,
    version: "P2",
    protocol: "v9.1",
    effectiveDate: "2025-03-01T00:00:00.000Z",
    notes:
      "Optimization: Strategic timing, melatonin reduced 6mg->0.5mg, KPU 30-day intervention (ACT AS IF protocol).",
  },
  {
    id: 4,
    version: "P3",
    protocol: "v9.1",
    effectiveDate: "2025-05-01T00:00:00.000Z",
    notes:
      "Analysis: AG1 eliminated (B6: 102.9 ug/L, Biotin: 7.78 ng/mL), KPU ruled out (3.65 mcg/dL). First cessation attempt 76 days.",
  },
  {
    id: 5,
    version: "P4",
    protocol: "v9.1",
    effectiveDate: "2025-07-01T00:00:00.000Z",
    notes:
      "Training: First cessation ended (76 days insufficient), VAT reduction focus. Training volume crashed 59->16 min/day.",
  },
  {
    id: 6,
    version: "P5",
    protocol: "P4P5-v2",
    effectiveDate: "2025-09-01T00:00:00.000Z",
    notes:
      "Consolidation: ASD+ADHD optimized protocol, 8-week sleep architecture recovery initiated. -4.53 lbs lean from training crash.",
  },
  {
    id: 7,
    version: "P6",
    protocol: "P4P5-v2",
    effectiveDate: "2025-12-23T00:00:00.000Z",
    notes:
      "Current: FAAH-informed 120+ day cessation started. Melatonin 0.3mg @ 8:30 PM (ADHD chronobiotic), Rhodiola, Glycine, Taurine added.",
  },
];

// =============================================================================
// PROTOCOL CHANGES (Transition rationale)
// =============================================================================

/**
 * Real protocol changes between milestones
 * Source: Nutrients_Evolution.md
 */
export const realProtocolChanges: ProtocolChange[] = [
  // P0 -> P1: NSAID Recovery
  {
    id: 1,
    versionId: 2,
    supplementName: "Ibuprofen",
    changeType: "removed",
    oldDosage: "1600mg/day",
    rationale: "Chronic hepatotoxin + gut damage - catalyst for protocol redesign",
  },
  {
    id: 2,
    versionId: 2,
    supplementName: "SAM-e",
    changeType: "removed",
    oldDosage: "400mg",
    rationale: "COMT methyl donor overload risk",
  },
  {
    id: 3,
    versionId: 2,
    supplementName: "Berberine",
    changeType: "removed",
    oldDosage: "500mg",
    rationale: "Unnecessary - HOMA-IR 1.16 is excellent",
  },
  {
    id: 4,
    versionId: 2,
    supplementName: "Genius Caffeine",
    changeType: "removed",
    oldDosage: "200mg",
    rationale: "CYP1A2 slow metabolizer - total caffeine was 400-500mg",
  },
  {
    id: 5,
    versionId: 2,
    supplementName: "Vitamin E",
    changeType: "added",
    newDosage: "800 IU",
    rationale: "NAFLD 98th percentile protection",
  },
  {
    id: 6,
    versionId: 2,
    supplementName: "L-Glutamine",
    changeType: "added",
    newDosage: "5-10g",
    rationale: "Gut repair protocol for NSAID damage",
  },
  {
    id: 7,
    versionId: 2,
    supplementName: "Zinc Carnosine",
    changeType: "added",
    newDosage: "75mg",
    rationale: "Gut repair protocol",
  },

  // P1 -> P2: KPU Testing
  {
    id: 8,
    versionId: 3,
    supplementName: "Zinc",
    changeType: "dosage_changed",
    oldDosage: "15mg",
    newDosage: "50mg+",
    rationale: "KPU hypothesis testing (ACT AS IF protocol)",
  },
  {
    id: 9,
    versionId: 3,
    supplementName: "Vitamin B6 (P-5-P)",
    changeType: "dosage_changed",
    oldDosage: "10mg",
    newDosage: "50mg",
    rationale: "KPU hypothesis testing",
  },
  {
    id: 10,
    versionId: 3,
    supplementName: "Methylfolate",
    changeType: "added",
    newDosage: "800mcg",
    rationale: "MTHFR A1298C support",
  },

  // P2 -> P3: AG1 Elimination
  {
    id: 11,
    versionId: 4,
    supplementName: "AG1",
    changeType: "removed",
    oldDosage: "1 scoop",
    rationale: "B6: 102.9 ug/L (toxic), Biotin: 7.78 ng/mL (2x limit)",
  },
  {
    id: 12,
    versionId: 4,
    supplementName: "High-dose Zinc",
    changeType: "dosage_changed",
    oldDosage: "50mg",
    newDosage: "15-25mg",
    rationale: "KPU ruled out (3.65 mcg/dL)",
  },
  {
    id: 13,
    versionId: 4,
    supplementName: "Vitamin B6",
    changeType: "dosage_changed",
    oldDosage: "50mg",
    newDosage: "<25mg",
    rationale: "KPU ruled out, B6 toxicity history",
  },
  {
    id: 14,
    versionId: 4,
    supplementName: "Vitamin C",
    changeType: "added",
    newDosage: "1000mg",
    rationale: "AG1 replacement",
  },
  {
    id: 15,
    versionId: 4,
    supplementName: "Selenium",
    changeType: "added",
    newDosage: "200mcg",
    rationale: "GPX1 A/G variant support",
  },
  {
    id: 16,
    versionId: 4,
    supplementName: "B12",
    changeType: "added",
    newDosage: "1000mcg sublingual",
    rationale: "Standalone B12 for MTRR support",
  },

  // P3 -> P5: ASD/ADHD Protocol Development
  {
    id: 17,
    versionId: 6,
    supplementName: "GABA supplements",
    changeType: "removed",
    rationale: "ASD GABAergic paradox risk (~50% of ASD population)",
  },
  {
    id: 18,
    versionId: 6,
    supplementName: "Melatonin",
    changeType: "dosage_changed",
    oldDosage: "3-6mg",
    newDosage: "0.3mg @ 8:30 PM",
    rationale: "ADHD chronobiotic protocol - physiological dose, not sedative",
  },

  // P5 -> P6: Current Protocol
  {
    id: 19,
    versionId: 7,
    supplementName: "Melatonin timing",
    changeType: "timing_changed",
    oldDosage: "Before bed",
    newDosage: "8:30 PM (3+ hrs before DLMO)",
    rationale: "ADHD circadian phase shift protocol",
  },
  {
    id: 20,
    versionId: 7,
    supplementName: "Rhodiola Rosea",
    changeType: "added",
    newDosage: "150mg AM",
    rationale: "Cessation support - adaptogen",
  },
  {
    id: 21,
    versionId: 7,
    supplementName: "Glycine",
    changeType: "added",
    newDosage: "3g @ 8 PM (Week 4+)",
    rationale: "Sleep support - no ASD paradox risk",
  },
  {
    id: 22,
    versionId: 7,
    supplementName: "Taurine",
    changeType: "added",
    newDosage: "500-1000mg dinner (Week 4+)",
    rationale: "Indirect GABA, safer profile than direct GABAergics",
  },
  {
    id: 23,
    versionId: 7,
    supplementName: "Choline/Alpha-GPC",
    changeType: "added",
    newDosage: "300mg AM",
    rationale: "NAFLD protection + cognitive support",
  },
  {
    id: 24,
    versionId: 7,
    supplementName: "Mind Lab Pro",
    changeType: "removed",
    rationale: "Protocol simplification",
  },
];

// =============================================================================
// SUPPLEMENTS (Current P6 Protocol)
// =============================================================================

/**
 * Real supplement list - Tier 1 (Essential/Permanent)
 * Source: 06_Supplement_Protocol.md, Nutrients_Evolution.md
 */
export const realSupplements: Supplement[] = [
  // TIER 1 - Essential (12 items)
  {
    id: 1,
    name: "Vitamin D3 + K2",
    dosage: 5000,
    unit: "IU + 120mcg",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "Standard - maintain 40-60 ng/mL",
    timing: "Morning with fat",
    isActive: true,
  },
  {
    id: 2,
    name: "Magnesium Glycinate",
    dosage: 300,
    unit: "mg",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "Common deficiency, RBC optimal target, COMT support",
    timing: "8:00 PM",
    notes: "Sleep + HRV support",
    isActive: true,
  },
  {
    id: 3,
    name: "Omega-3 EPA/DHA",
    dosage: 2,
    unit: "g",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "APOE E3/E4, IL-6 inflammation support",
    timing: "With meals (lunch + dinner)",
    isActive: true,
  },
  {
    id: 4,
    name: "Vitamin E (mixed tocopherols)",
    dosage: 800,
    unit: "IU",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "NAFLD 98th percentile - CRITICAL",
    timing: "With fat (lunch)",
    notes: "Hepatoprotective priority",
    isActive: true,
  },
  {
    id: 5,
    name: "Choline (Alpha-GPC)",
    dosage: 300,
    unit: "mg",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "NAFLD protection + cognitive",
    timing: "Morning",
    isActive: true,
  },
  {
    id: 6,
    name: "Methylfolate",
    dosage: 800,
    unit: "mcg",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "MTHFR A1298C (G/T)",
    timing: "Morning",
    isActive: true,
  },
  {
    id: 7,
    name: "Methylcobalamin (B12)",
    dosage: 1000,
    unit: "mcg",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "MTRR support, FUT2 non-secretor",
    timing: "Morning sublingual",
    isActive: true,
  },
  {
    id: 8,
    name: "Selenium",
    dosage: 200,
    unit: "mcg",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "GPX1 A/G heterozygous",
    timing: "With food",
    isActive: true,
  },
  {
    id: 9,
    name: "NAC",
    dosage: 600,
    unit: "mg x2",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "FAAH support, NAFLD, glutathione",
    timing: "Morning + 8 PM (away from protein)",
    notes: "1200mg total daily - permanent",
    isActive: true,
  },
  {
    id: 10,
    name: "Vitamin C",
    dosage: 1000,
    unit: "mg",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "Antioxidant, detox support",
    timing: "Split AM/PM (500mg each)",
    isActive: true,
  },
  {
    id: 11,
    name: "Creatine Monohydrate",
    dosage: 5,
    unit: "g",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "Typical responder - lean mass support",
    timing: "Any time",
    isActive: true,
  },
  {
    id: 12,
    name: "Protein Powder",
    dosage: 50,
    unit: "g",
    frequency: "daily",
    tier: "tier1",
    geneticBasis: "Lean mass recovery - 215g daily target",
    timing: "Post-workout/meals",
    isActive: true,
  },

  // TIER 2 - Cessation Support (5 items, 120+ days)
  {
    id: 13,
    name: "Melatonin",
    dosage: 0.3,
    unit: "mg",
    frequency: "daily",
    tier: "tier2",
    geneticBasis: "ADHD chronobiotic protocol",
    timing: "8:30 PM sharp (3+ hrs before DLMO)",
    notes: "Chronobiotic dose, NOT sedative. Extended through Day 120+ for FAAH variant.",
    isActive: true,
  },
  {
    id: 14,
    name: "Rhodiola Rosea",
    dosage: 150,
    unit: "mg",
    frequency: "daily",
    tier: "tier2",
    geneticBasis: "Adaptogen support",
    timing: "Morning",
    notes: "Days 1-120 cessation support. Cycle 5 weeks on, 1 week off.",
    isActive: true,
  },
  {
    id: 15,
    name: "Glycine",
    dosage: 3,
    unit: "g",
    frequency: "daily",
    tier: "tier2",
    geneticBasis: "Safe inhibitory - no ASD paradox risk",
    timing: "8:00 PM",
    notes: "Add Week 4+ (Jan 20, 2026). Sleep architecture support.",
    isActive: false, // Will activate Week 4
  },
  {
    id: 16,
    name: "Taurine",
    dosage: 500,
    unit: "mg",
    frequency: "daily",
    tier: "tier2",
    geneticBasis: "Indirect GABA, safer profile",
    timing: "Dinner (5:30-6:30 PM)",
    notes: "Add Week 4+ (Jan 20, 2026). 500-1000mg range.",
    isActive: false, // Will activate Week 4
  },
  {
    id: 17,
    name: "L-Theanine",
    dosage: 200,
    unit: "mg",
    frequency: "as_needed",
    tier: "as_needed",
    geneticBasis: "Monitor for activation",
    timing: "As needed",
    notes: "PRN for anxiety. Monitor for paradoxical activation.",
    isActive: true,
  },
];

// =============================================================================
// MILESTONES (DEXA + Key Events)
// =============================================================================

/**
 * Real milestones with biometric snapshots
 * Source: 11_Historical_Context.md, Nutrients_Evolution.md
 */
export const realMilestones: Milestone[] = [
  {
    id: 1,
    date: "2025-02-06T00:00:00.000Z",
    description: "M1 DEXA - Foundation baseline",
    protocolVersion: "P1",
    biometricSnapshot: {
      bodyFat: 27.3,
      leanMass: 153.13,
      vat: 993,
    },
  },
  {
    id: 2,
    date: "2025-04-15T00:00:00.000Z",
    description: "KPU ruled out - 3.65 mcg/dL (normal range)",
    protocolVersion: "P2",
  },
  {
    id: 3,
    date: "2025-05-01T00:00:00.000Z",
    description: "M2 DEXA - Best composition achieved",
    protocolVersion: "P2",
    biometricSnapshot: {
      bodyFat: 22.6,
      leanMass: 166.36,
      vat: 810,
    },
  },
  {
    id: 4,
    date: "2025-05-05T00:00:00.000Z",
    description: "Cessation Attempt 1 started",
    protocolVersion: "P3",
  },
  {
    id: 5,
    date: "2025-05-15T00:00:00.000Z",
    description: "AG1 eliminated - B6/Biotin toxicity confirmed",
    protocolVersion: "P3",
    biometricSnapshot: {
      b6: 102.9, // ug/L - toxic
      biotin: 7.78, // ng/mL - 2x limit
    },
  },
  {
    id: 6,
    date: "2025-07-20T00:00:00.000Z",
    description: "Cessation Attempt 1 ended (76 days - insufficient for FAAH)",
    protocolVersion: "P4",
  },
  {
    id: 7,
    date: "2025-09-04T00:00:00.000Z",
    description: "M3 DEXA - Training crash impact visible",
    protocolVersion: "P5",
    biometricSnapshot: {
      bodyFat: 22.5,
      leanMass: 161.83,
      vat: 702,
    },
  },
  {
    id: 8,
    date: "2025-12-23T00:00:00.000Z",
    description: "Cessation Attempt 2 started - FAAH-informed 120+ day target",
    protocolVersion: "P6",
  },
];

// =============================================================================
// DAILY SCHEDULE
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
// AVOID LIST
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
