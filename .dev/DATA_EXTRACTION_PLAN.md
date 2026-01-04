# Data Extraction Plan - Wellness Tracker

**Generated**: January 3, 2026
**Status**: REVISED - Comprehensive Assessment

---

## Current State

### Already Ingested (2,909 metrics)
| Source | Records | Categories | Date Range |
|--------|---------|------------|------------|
| WHOOP `physiological_cycles.csv` | 2,807 | autonomic | Oct 2023 - Jan 2026 |
| Vault 602 Blood Work (M2) | 38 | metabolic, lipids, vitamins, minerals, hormones, hematology, inflammatory | May 2025 |
| Vault 602 Body Composition | 27 | bodyComposition | Feb-Sep 2025 (M1-M3) |
| Vault 601 Historical (M1) | 37 | all categories | Feb 2025 |

---

## NEWLY IDENTIFIED DATA SOURCES

### 1. Historical Blood Work (4 Time Points!)
**Path**: `/Users/mac/vaults/#Bwell/_archive/Well/Tests/`

| Time Point | Date | File | Panels |
|------------|------|------|--------|
| **2021 Baseline** | May 2021 | `Bloodwork - Feb 2025.md` | CMP, CBC, Lipid, HbA1c |
| **2025-A (M1)** | Jan-Feb 2025 | `Bloodwork - Feb 2025.md` | CMP, CBC, Lipid, Hormones |
| **2025-B (M1)** | Feb 2025 | `Bloodwork - Feb 2025.md` | CMP, CBC, Lipid (repeat) |
| **May 2025 (M2)** | May 2025 | `May25/*.pdf` (17 PDFs) | COMPREHENSIVE |

**May 2025 Panel Details** (17 tests):
- CMP, Lipid, Insulin, B12/Folate, B6, B7, Zinc, Copper, Selenium, Iron/Ferritin
- Magnesium, Vitamin D, Homocysteine, Cortisol, Hormone, Thyroid, Thyroid+FTI

### 2. Nutrient Intake Protocol (M0-M6 Evolution)
**Path**: `/Users/mac/vaults/#Bwell/602/Nutrients_*.md`

| Phase | Date | File | Products |
|-------|------|------|----------|
| M0 | Pre-Jan 2025 | `Nutrients_M0.md` | 17 (chaotic baseline) |
| M1 | Jan-Feb 2025 | `Nutrients_M1.md` | 15 (NSAID recovery) |
| M2 | Mar-Apr 2025 | `Nutrients_M2.md` | 14 (KPU testing) |
| M3 | May-Sep 2025 | `Nutrients_M3.md` | 12 (AG1 elimination) |
| M4/M5 | Oct-Dec 2025 | `Nutrients_M4M5.md` | 10 (ASD/ADHD) |
| M6 | Jan 2026+ | `Nutrients_M6.md` | 15 (current) |
| **Evolution** | All | `Nutrients_Evolution.md` | Consolidated |

**Categories tracked per phase**:
- Vitamins (A, C, D3, E, K2, B1-B12)
- Minerals (Mg, Zn, Se, Cu, Mo, Fe)
- Fatty Acids (EPA, DHA, GLA, MCT)
- Amino Acids (NAC, L-Glutamine, Alpha-GPC, ALCAR, Glycine, Taurine)
- Adaptogens (Rhodiola, Bacopa, Ginseng, Maca, Ashwagandha)
- Mushrooms (10 varieties)
- Timing (AM empty, breakfast, lunch, PM)
- Removed items with rationale

### 3. Lab Testing Log
**Path**: `/Users/mac/vaults/#Bwell/_archive/Well/Tests/Log - Labs.md`

| Category | Tests Tracked |
|----------|--------------|
| Hormone Panel | Testosterone, PSA |
| Blood Panel | CMP, CBC, Lipid, HbA1c |
| Nutrition Panel | D, B2, B3, B5, B6, B7, Mg, Zn |
| STI Screening | HIV, HCV, HSV, Chlamydia, etc. |

---

## REVISED EXTRACTION PHASES

### Phase 1A: Historical Blood Work (CRITICAL - 4 time points)

**Extract from**: `Bloodwork - Feb 2025.md`

| Time Point | Timestamp | Metrics |
|------------|-----------|---------|
| 2021 | 2021-05-29 | ~30 (CMP, CBC, Lipid) |
| 2025-A | 2025-01-31 | ~40 (CMP, CBC, Lipid, TSH) |
| 2025-B | 2025-02-01 | ~40 (repeat panels) |

**New parsing function**: `parseHistoricalBloodWork()`
- Parse space-separated lab format
- Extract reference ranges
- Map to categories

### Phase 1B: Nutrient Intake Tracking (HIGH PRIORITY)

**Extract from**: `Nutrients_M0.md` through `Nutrients_M6.md`

| Category | Metrics per Phase |
|----------|-------------------|
| Vitamins | 10-12 |
| Minerals | 6-8 |
| Fatty Acids | 4-5 |
| Amino Acids | 4-6 |
| Adaptogens | 4-6 |
| Mushrooms | 10 |
| **Total per phase** | ~40-50 |
| **Total across M0-M6** | ~240-300 |

**New category**: `intake` with subcategories:
- vitamins, minerals, fatty-acids, amino-acids, adaptogens, mushrooms

**Schema**:
```typescript
{
  name: 'Vitamin D3 Intake',
  value: 5000,
  unit: 'IU',
  category: 'intake',
  subcategory: 'vitamins',
  timestamp: '2025-01-15', // midpoint of phase
  source: 'protocol',
  metadata: { phase: 'M1', timing: 'morning' }
}
```

### Phase 1C: Additional WHOOP CSVs (HIGH PRIORITY)

### 1.1 Workouts CSV
**Path**: `/Users/mac/vaults/#Bwell/_archive/my_whoop_data_2026_01_01/workouts.csv`
**Records**: 328 workout sessions

**Metrics to Extract**:
| Metric | Category | Subcategory |
|--------|----------|-------------|
| Strain Score | autonomic | strain |
| Workout Duration | autonomic | activity |
| Avg HR | autonomic | heart-rate |
| Max HR | autonomic | heart-rate |
| Calories | autonomic | energy |
| Activity Type | autonomic | activity |

**Schema**:
```typescript
{
  name: 'Workout Strain',
  value: number,
  unit: 'score',
  category: 'autonomic',
  subcategory: 'strain',
  timestamp: string,
  source: 'whoop',
  metadata: { activityType: string, duration: number }
}
```

### 1.2 Sleeps CSV
**Path**: `/Users/mac/vaults/#Bwell/_archive/my_whoop_data_2026_01_01/sleeps.csv`
**Records**: 414 sleep sessions

**Metrics to Extract**:
| Metric | Category | Subcategory |
|--------|----------|-------------|
| Sleep Performance | autonomic | sleep |
| Sleep Duration | autonomic | sleep |
| Sleep Efficiency | autonomic | sleep |
| Light Sleep | autonomic | sleep-stages |
| Deep Sleep (SWS) | autonomic | sleep-stages |
| REM Sleep | autonomic | sleep-stages |
| Awake Time | autonomic | sleep-stages |
| Respiratory Rate | autonomic | respiratory |
| Sleep Latency | autonomic | sleep |
| Sleep Consistency | autonomic | sleep |

### 1.3 Journal Entries CSV
**Path**: `/Users/mac/vaults/#Bwell/_archive/my_whoop_data_2026_01_01/journal_entries.csv`
**Records**: Variable (behavioral tracking)

**Metrics to Extract**:
| Metric | Category | Subcategory |
|--------|----------|-------------|
| Stress Level | autonomic | subjective |
| Energy Level | autonomic | subjective |
| Mood | autonomic | subjective |
| Alcohol (Y/N) | autonomic | substances |
| Cannabis (Y/N) | autonomic | substances |
| Caffeine (Y/N) | autonomic | substances |

---

## Phase 2: Milestone Historical Data (Medium Priority)

### 2.1 M3 Milestone Analysis
**Path**: `/Users/mac/vaults/#Bwell/_archive/Well/Plan5/505/M3 MILESTONE ANALYSIS & RESULTS.md`

**Extract**: Final M3 values, trend calculations, success metrics

### 2.2 Historical DEXA Assessments
**Paths**:
- `/Users/mac/vaults/#Bwell/601/_plan5/504_analysis/assess_M1_dexa.md`
- `/Users/mac/vaults/#Bwell/601/_plan5/504_analysis/assess_M2_dexa.md`

**Extract**: Regional body composition (arms, legs, trunk fat %)

### 2.3 Nutrients Evolution by Milestone
**Paths**: `/Users/mac/vaults/#Bwell/602/Nutrients_M*.md`
- `Nutrients_M0.md` - Baseline (Jan 2025)
- `Nutrients_M1.md` - First milestone
- `Nutrients_M2.md` - Second milestone
- `Nutrients_M3.md` - Third milestone
- `Nutrients_M4M5.md` - Consolidation
- `Nutrients_M6.md` - Current phase

**Extract**: Supplement dosages, timing changes, rationale

---

## Phase 3: Protocol Tracking (Lower Priority)

### 3.1 Supplement Protocol Versions
**Paths**: `/Users/mac/vaults/#Bwell/_archive/Well/Plan*/` series

**Schema**:
```typescript
{
  id: string,
  name: 'Protocol Version',
  value: 4.0,
  category: 'protocol',
  subcategory: 'supplements',
  timestamp: string,
  metadata: {
    tier1: Supplement[],
    tier2: Supplement[],
    tier3: Supplement[]
  }
}
```

### 3.2 Training Protocol Evolution
**Paths**:
- `/Users/mac/vaults/#Bwell/602/07_Training_Protocol.md`
- `/Users/mac/vaults/#Bwell/_archive/Well/Plan4/401/program*.md`

---

## Phase 4: Extended Metrics (Future)

### 4.1 CGM Data (if available)
**Potential Path**: `Plan5/501/` - CGM analysis files

**Metrics**:
- Time in Range (TIR)
- Average Glucose
- Glucose Variability
- Post-meal spikes

### 4.2 Genetic Risk Scores
**Path**: `/Users/mac/vaults/#Bwell/602/02_Genetic_Profile.md`

**Metrics**:
- NAFLD Risk Score (98th percentile)
- Cardiovascular Risk (APOE status)
- Methylation Status (MTHFR/COMT)

---

## Implementation Plan

### Immediate (Today)
1. [ ] Parse `workouts.csv` - add workout strain, duration, calories
2. [ ] Parse `sleeps.csv` - add detailed sleep metrics
3. [ ] Parse `journal_entries.csv` - add behavioral data

### Short-term (This Week)
4. [ ] Extract M0 baseline data from `Nutrients_M0.md`
5. [ ] Extract regional DEXA data from M1/M2 assessments
6. [ ] Add M3 comprehensive milestone data

### Medium-term (This Month)
7. [ ] Build protocol tracking (supplement version history)
8. [ ] Add training volume tracking
9. [ ] Create cessation phase tracking (FAAH-informed)

---

## Seed Script Updates Required

### New Parsing Functions
```typescript
// Phase 1 additions
function parseWhoopWorkouts(csvPath: string): Metric[]
function parseWhoopSleeps(csvPath: string): Metric[]
function parseWhoopJournal(csvPath: string): Metric[]

// Phase 2 additions
function parseNutrientsEvolution(vaultPath: string): Metric[]
function parseRegionalDEXA(mdPath: string): Metric[]
function parseMilestoneAnalysis(mdPath: string): Metric[]

// Phase 3 additions
function parseProtocolVersions(archivePath: string): Protocol[]
function parseTrainingHistory(vaultPath: string): Metric[]
```

### New Categories/Subcategories

| Category | New Subcategories |
|----------|------------------|
| autonomic | strain, activity, sleep-stages, subjective, substances, respiratory |
| protocol | supplements, training, cessation |
| genetics | risk-scores |

---

## REVISED Expected Final State

| Source | Metrics | Categories | Priority | Status |
|--------|---------|------------|----------|--------|
| WHOOP Cycles | 2,807 | autonomic | HIGH | ✅ Done |
| Blood Work (2021+2025A+2025B+May25) | 179 | 7 categories | CRITICAL | ✅ Done |
| Nutrient Intake (M0-M6) | ~300 | intake | HIGH | 📋 Pending |
| WHOOP Workouts | 1,640 | autonomic | HIGH | ✅ Done |
| WHOOP Sleep (detailed) | 2,692 | autonomic | HIGH | ✅ Done |
| WHOOP Journal | 135 | autonomic | MEDIUM | ✅ Done |
| Body Composition | 27 | bodyComposition | HIGH | ✅ Done |
| Protocol Evolution | ~60 | protocol | LOW | 📋 Pending |
| **Current Total** | **7,480** | **9 categories** | | |

## Implementation Status (January 3, 2026)

### Phase 1A: Historical Blood Work ✅ COMPLETE
- 2021 baseline: 37 metrics
- 2025-A (Jan 2025): 35 metrics
- 2025-B (Feb 2025): 32 metrics
- M1 historical data: 37 metrics
- M2 blood work: 38 metrics
- **Total: 179 blood work metrics across 4 time points**

### Phase 1C: Additional WHOOP CSVs ✅ COMPLETE
- Workouts: 1,640 metrics (328 sessions × 5 metrics each)
- Sleeps: 2,692 metrics (385 nights × 7 metrics each)
- Journal: 135 metrics (behavioral tracking)
- **Total: 4,467 new WHOOP metrics**

### Remaining Work
- Phase 1B: Nutrient Intake (M0-M6) - 📋 Pending
- Phase 3: Protocol Evolution - 📋 Lower Priority

---

## Data Quality Considerations

### Deduplication
- Same metric from multiple sources → prefer most recent
- Same date different values → flag for review

### Validation
- Reference ranges for all blood work metrics
- Optimal ranges from clinical guidelines
- Trend calculations require 2+ data points

### Privacy
- All data stored locally (localStorage)
- No PII in metric names
- Profile ID anonymized

---

*Plan created: January 3, 2026*
