# Data Model: MVP Dashboard & UI Components

**Feature**: 002-mvp-dashboard
**Date**: 2026-01-03
**Extends**: Phase 1 types (`src/types/metrics.ts`, `src/types/whoop.ts`)

## Overview

This document defines view models and component props for the dashboard UI. All entities derive from or extend the Phase 1 `Metric` type system.

---

## Existing Types (Phase 1 Reference)

These types already exist and are reused:

| Type | Location | Purpose |
|------|----------|---------|
| `Metric` | `src/types/metrics.ts` | Base metric with value, ranges, status |
| `MetricStatus` | `src/types/metrics.ts` | 'optimal' \| 'borderline' \| 'deficient' \| 'excess' |
| `MetricTrend` | `src/types/metrics.ts` | 'improving' \| 'stable' \| 'declining' |
| `MetricCategory` | `src/types/metrics.ts` | 9 category identifiers |
| `CategoryInfo` | `src/types/metrics.ts` | Category metadata (label, icon, color) |
| `CATEGORY_INFO` | `src/types/metrics.ts` | Category lookup constant |
| `WhoopAnalysisReport` | `src/types/whoop.ts` | WHOOP JSON structure |

---

## New View Models

### CategorySummary

Aggregated view of a single category for the dashboard.

```typescript
interface CategorySummary {
  category: MetricCategory;
  info: CategoryInfo;
  metricCount: number;
  overallStatus: MetricStatus | 'empty';
  metrics: MetricWithCalculations[];
  lastUpdated: string | null;
}
```

**Fields**:
- `category`: Category identifier
- `info`: Display metadata (label, icon, color from CATEGORY_INFO)
- `metricCount`: Number of metrics in category
- `overallStatus`: Aggregate status (worst status or 'empty' if no metrics)
- `metrics`: Full metric list with calculations
- `lastUpdated`: Most recent metric timestamp or null

**Derivation**: Computed from `Metric[]` by grouping and aggregating

---

### MetricWithCalculations

Metric with pre-computed status and trend.

```typescript
interface MetricWithCalculations extends Metric {
  calculatedStatus: MetricStatus | null;
  calculatedTrend: MetricTrend;
  percentChange: number | null;
  historicalValues: Array<{ value: number; timestamp: string }>;
}
```

**Fields**:
- All fields from `Metric`
- `calculatedStatus`: Result of `classifyStatus()` or null if no ranges
- `calculatedTrend`: Result of `analyzeTrend()`
- `percentChange`: Percent change from previous reading
- `historicalValues`: All readings for this metric (for trends)

**Derivation**: Computed when loading metrics

---

### ImportPreview

Preview state before confirming WHOOP import.

```typescript
interface ImportPreview {
  source: 'whoop';
  filename: string;
  dataPeriod: { start: string; end: string };
  metrics: PreviewMetric[];
  warnings: string[];
  errors: string[];
}
```

**Fields**:
- `source`: Always 'whoop' for this feature
- `filename`: Uploaded file name
- `dataPeriod`: Date range from WHOOP report
- `metrics`: Metrics to be imported
- `warnings`: Non-blocking issues
- `errors`: Blocking issues (empty = can proceed)

---

### PreviewMetric

Single metric in import preview.

```typescript
interface PreviewMetric {
  name: string;
  value: number;
  unit: string;
  subcategory: AutonomicSubcategory;
  willReplace: boolean;
  existingValue?: number;
}
```

**Fields**:
- `name`: Display name (e.g., "HRV (RMSSD)")
- `value`: Value to import
- `unit`: Unit string
- `subcategory`: Target subcategory
- `willReplace`: True if existing metric with same timestamp exists
- `existingValue`: Current value if replacing

---

## Component Props

### StatusBadgeProps

```typescript
interface StatusBadgeProps {
  status: MetricStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
}
```

**Defaults**: `size='md'`, `showIcon=true`, `showLabel=true`

---

### TrendIndicatorProps

```typescript
interface TrendIndicatorProps {
  trend: MetricTrend;
  percentChange?: number;
  improvement: ImprovementDirection;
  showPercentage?: boolean;
}
```

**Defaults**: `showPercentage=true`

---

### MetricCardProps

```typescript
interface MetricCardProps {
  metric: MetricWithCalculations;
  showTrend?: boolean;
  showRanges?: boolean;
  compact?: boolean;
  onClick?: () => void;
}
```

**Defaults**: `showTrend=true`, `showRanges=true`, `compact=false`

---

### CategoryCardProps

```typescript
interface CategoryCardProps {
  summary: CategorySummary;
  onClick?: () => void;
  selected?: boolean;
}
```

**Defaults**: `selected=false`

---

### WhoopImportProps

```typescript
interface WhoopImportProps {
  onImportComplete?: (count: number) => void;
  onCancel?: () => void;
}
```

---

### CategoryGridProps

```typescript
interface CategoryGridProps {
  categories: CategorySummary[];
  onCategoryClick?: (category: MetricCategory) => void;
  loading?: boolean;
}
```

**Defaults**: `loading=false`

---

## State Types

### DashboardState

```typescript
interface DashboardState {
  categories: CategorySummary[];
  selectedCategory: MetricCategory | null;
  isLoading: boolean;
  error: string | null;
}
```

---

### ImportState

```typescript
interface ImportState {
  step: 'idle' | 'selecting' | 'preview' | 'importing' | 'complete' | 'error';
  preview: ImportPreview | null;
  error: string | null;
  importedCount: number;
}
```

---

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 1 (Existing)                       │
│  ┌─────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │ Metric  │───►│ MetricStatus │    │ WhoopAnalysisReport│  │
│  └─────────┘    └──────────────┘    └───────────────────┘  │
└───────┬─────────────────────────────────────┬───────────────┘
        │                                     │
        ▼                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Phase 2 (New)                            │
│  ┌─────────────────────┐    ┌──────────────────┐           │
│  │MetricWithCalculations│    │   ImportPreview   │           │
│  └──────────┬──────────┘    └────────┬─────────┘           │
│             │                        │                      │
│             ▼                        ▼                      │
│  ┌─────────────────────┐    ┌──────────────────┐           │
│  │  CategorySummary    │    │  PreviewMetric   │           │
│  └──────────┬──────────┘    └──────────────────┘           │
│             │                                               │
│             ▼                                               │
│  ┌─────────────────────────────────────────────┐           │
│  │           Dashboard UI Components            │           │
│  │  CategoryCard, MetricCard, StatusBadge, etc. │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

| Entity | Rule |
|--------|------|
| CategorySummary | `metricCount >= 0`, `overallStatus` valid or 'empty' |
| MetricWithCalculations | All `Metric` rules + `historicalValues` sorted by timestamp |
| ImportPreview | `metrics.length > 0` when no errors |
| PreviewMetric | `value` is finite number |

---

## File Location

New types will be added to: `src/types/components.ts`
