# Data Model: Core Data Layer

**Feature**: 001-core-data-layer
**Date**: 2026-01-03

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         StoredMetrics                            │
│  ┌───────────────┬──────────────────┬─────────────────────────┐ │
│  │ metrics[]     │ lastUpdated      │ syncVersion             │ │
│  │ Metric[]      │ ISO 8601 string  │ number                  │ │
│  └───────┬───────┴──────────────────┴─────────────────────────┘ │
└──────────┼──────────────────────────────────────────────────────┘
           │ contains
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Metric                                 │
│  (Union of 9 category-specific types)                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ BaseMetric                                                   ││
│  │ ├── id: string (UUID v4)                                    ││
│  │ ├── name: string                                            ││
│  │ ├── value: number                                           ││
│  │ ├── unit: string                                            ││
│  │ ├── timestamp: string (ISO 8601)                            ││
│  │ ├── description?: string                                    ││
│  │ ├── improvement: 'higher is better' | 'lower is better'    ││
│  │ ├── referenceRange?: MetricRange                            ││
│  │ ├── optimalRange?: MetricRange                              ││
│  │ ├── source: DataSource                                      ││
│  │ ├── syncStatus: SyncStatus                                  ││
│  │ └── syncVersion: number                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│  + category: MetricCategory                                      │
│  + subcategory: CategorySubcategory                              │
└─────────────────────────────────────────────────────────────────┘
           │ produces
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MetricCalculationResult                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ status: MetricStatus                                        ││
│  │ trend: MetricTrend                                          ││
│  │ percentChange?: number                                      ││
│  │ significance?: number (0-1)                                 ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     WhoopAnalysisReport                          │
│  (External import format)                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ generated_at: string                                        ││
│  │ data_period: { start, end }                                 ││
│  │ key_metrics: WhoopKeyMetrics                                ││
│  │ recovery_analysis: WhoopRecoveryAnalysis                    ││
│  │ workout_analysis: WhoopWorkoutAnalysis                      ││
│  │ protocol_recommendations: string[]                          ││
│  │ errors: string[]                                            ││
│  │ warnings: string[]                                          ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────┬──────────────────────────────────┘
                               │ maps to
                               ▼
                    ┌──────────────────────┐
                    │   AutonomicMetric[]  │
                    │   (subset of Metric) │
                    └──────────────────────┘
```

---

## Entity Details

### 1. Metric (Base + Category Variants)

**Purpose**: Core entity representing a single health measurement.

**Fields**:

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| id | string | Yes | UUID v4 format | Generated on creation |
| name | string | Yes | Non-empty, max 100 chars | Display name |
| value | number | Yes | Finite number, not NaN | Measurement value |
| unit | string | Yes | Non-empty | e.g., "ng/mL", "ms", "%" |
| timestamp | string | Yes | ISO 8601 format | When measured |
| description | string | No | Max 500 chars | Optional notes |
| improvement | enum | Yes | 'higher is better' \| 'lower is better' | Trend interpretation |
| referenceRange | MetricRange | No | min < max | Lab reference range |
| optimalRange | MetricRange | No | min < max, within reference | Target range |
| source | DataSource | Yes | Enum value | Origin of data |
| syncStatus | SyncStatus | Yes | Enum value | Cloud sync state |
| syncVersion | number | Yes | Positive integer | Increments on update |
| category | MetricCategory | Yes | One of 9 categories | Metric classification |
| subcategory | string | Yes | Valid for category | Detailed classification |

**Category Variants**:
- VitaminMetric: category='vitamins', subcategory: 'b-vitamins' | 'fat-soluble'
- MineralMetric: category='minerals', subcategory: 'essential' | 'trace'
- InflammatoryMetric: category='inflammatory', subcategory: 'crp' | 'homocysteine' | 'cytokines' | 'oxidativeStress'
- MetabolicMetric: category='metabolic', subcategory: 'glucose' | 'kidney' | 'electrolytes' | 'acidBase'
- HormoneMetric: category='hormones', subcategory: 'thyroid' | 'sex' | 'cortisol' | 'growth'
- AutonomicMetric: category='autonomic', subcategory: 'hrv' | 'bloodPressure' | 'sleep' | 'recovery'
- BodyCompositionMetric: category='bodyComposition', subcategory: 'fat' | 'leanMass' | 'boneDensity' | 'regional'
- LipidMetric: category='lipids', subcategory: 'cholesterol' | 'triglycerides' | 'lipoproteins'
- HematologyMetric: category='hematology', subcategory: 'cbc' | 'hemoglobin' | 'wbc' | 'platelets'

---

### 2. MetricRange

**Purpose**: Represents a numeric range for reference or optimal thresholds.

**Fields**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| min | number | Yes | Finite, < max |
| max | number | Yes | Finite, > min |

---

### 3. MetricCalculationResult

**Purpose**: Output of status and trend calculations.

**Fields**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| status | MetricStatus | Yes | One of: optimal, borderline, deficient, excess |
| trend | MetricTrend | Yes | One of: improving, stable, declining |
| percentChange | number | No | Finite number |
| significance | number | No | 0-1 range |

---

### 4. StoredMetrics

**Purpose**: Wrapper for persisted data in LocalStorage.

**Fields**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| metrics | Metric[] | Yes | Valid metric array |
| lastUpdated | string | Yes | ISO 8601 format |
| syncVersion | number | Yes | Positive integer |

**Storage Key**: `wellness_tracker_metrics`

---

### 5. WhoopAnalysisReport

**Purpose**: External JSON import format from Whoop Analyzer.

**Fields** (key subset):

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| generated_at | string | Yes | Parseable datetime |
| key_metrics.avg_hrv_rmssd | number | Yes | Positive |
| key_metrics.avg_recovery_score | number | Yes | 0-100 |
| key_metrics.avg_resting_heart_rate | number | Yes | Positive |
| key_metrics.avg_asleep | number | Yes | Hours, positive |
| key_metrics.avg_day_strain | number | No | 0-21 scale |
| recovery_analysis | object | No | Optional analysis |
| errors | string[] | No | Import errors |
| warnings | string[] | No | Import warnings |

---

## Enumerations

### MetricCategory
```
vitamins | minerals | inflammatory | metabolic | hormones |
autonomic | bodyComposition | lipids | hematology
```

### MetricStatus
```
optimal | borderline | deficient | excess
```

### MetricTrend
```
improving | stable | declining
```

### DataSource
```
manual | whoop | dexa | bloodwork | csv
```

### SyncStatus
```
local | synced | pending
```

### ImprovementDirection
```
'higher is better' | 'lower is better'
```

---

## State Transitions

### SyncStatus State Machine

```
                   ┌─────────────┐
    Create/Import  │             │
   ───────────────►│    local    │
                   │             │
                   └──────┬──────┘
                          │ Cloud sync enabled
                          │ (future Phase 5)
                          ▼
                   ┌─────────────┐
                   │             │
                   │   pending   │◄─────┐
                   │             │      │ User modifies
                   └──────┬──────┘      │ synced metric
                          │ Sync        │
                          │ complete    │
                          ▼             │
                   ┌─────────────┐      │
                   │             │──────┘
                   │   synced    │
                   │             │
                   └─────────────┘
```

### MetricStatus Classification

```
Value Position              → Status
─────────────────────────────────────
Within optimal range        → optimal (green)
Between optimal and ref     → borderline (yellow)
Below reference min         → deficient (red)
Above reference max         → excess (orange)
No ranges defined           → borderline (default)
```

---

## Validation Rules

### On Metric Creation
1. `id` must be valid UUID v4 or generated
2. `name` must be non-empty, trimmed
3. `value` must be finite number
4. `timestamp` must be valid ISO 8601 or defaulted to now
5. `category` must be valid enum value
6. `subcategory` must be valid for the category
7. If `referenceRange` provided, min < max
8. If `optimalRange` provided, must be within referenceRange

### On Metric Update
1. `id` must match existing metric
2. `syncVersion` must increment
3. All creation rules apply to new values

### On WHOOP Import
1. `generated_at` must be parseable
2. `key_metrics` must contain required fields
3. Unknown fields are ignored (graceful degradation)
4. Missing optional fields generate warnings, not errors

---

## Indexes / Query Patterns

### Primary Queries
| Query | Fields Used | Expected Volume |
|-------|-------------|-----------------|
| All metrics | - | 50-200 |
| By category | category | 5-30 per category |
| By time range | timestamp | Variable |
| By name (metric history) | name + timestamp | 2-20 per metric |
| Sync pending | syncStatus='pending' | 0-50 |

### LocalStorage Structure (Phases 1-4)
```json
{
  "wellness_tracker_metrics": {
    "metrics": [...],
    "lastUpdated": "2026-01-03T12:00:00Z",
    "syncVersion": 42
  }
}
```

Single JSON blob approach for atomic reads/writes. No indexing needed at current scale (< 1000 metrics).

---

## Postgres Schema (Phase 5+)

### Database Configuration
- **Provider**: Neon Postgres (via Netlify extension)
- **ORM**: Drizzle ORM
- **Config**: `drizzle.config.ts`
- **Schema**: `db/schema.ts`
- **Migrations**: `migrations/`

### Drizzle Schema (Future)

```typescript
// db/schema.ts - Phase 5+ implementation
import { pgTable, uuid, varchar, text, real, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

export const metricCategoryEnum = pgEnum('metric_category', [
  'vitamins', 'minerals', 'inflammatory', 'metabolic',
  'hormones', 'autonomic', 'bodyComposition', 'lipids', 'hematology'
]);

export const metricStatusEnum = pgEnum('metric_status', [
  'optimal', 'borderline', 'deficient', 'excess'
]);

export const syncStatusEnum = pgEnum('sync_status', [
  'local', 'synced', 'pending'
]);

export const dataSourceEnum = pgEnum('data_source', [
  'manual', 'whoop', 'dexa', 'bloodwork', 'csv'
]);

export const metrics = pgTable('metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  value: real('value').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  category: metricCategoryEnum('category').notNull(),
  subcategory: varchar('subcategory', { length: 50 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  description: text('description'),
  improvement: varchar('improvement', { length: 20 }).notNull(),
  referenceMin: real('reference_min'),
  referenceMax: real('reference_max'),
  optimalMin: real('optimal_min'),
  optimalMax: real('optimal_max'),
  source: dataSourceEnum('source').notNull().default('manual'),
  syncStatus: syncStatusEnum('sync_status').notNull().default('local'),
  syncVersion: integer('sync_version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});
```

### Database Commands
```bash
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations to Neon
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

### Migration Strategy
1. **Phase 1-4**: LocalStorage only, schema ready but unused
2. **Phase 5**: Enable Postgres adapter, migrate existing LocalStorage data
3. **Ongoing**: LocalStorage as offline cache, Postgres as source of truth
