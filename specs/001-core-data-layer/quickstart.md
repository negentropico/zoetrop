# Quickstart: Core Data Layer

**Feature**: 001-core-data-layer
**Date**: 2026-01-03

## Overview

This guide covers how to use the Core Data Layer after implementation. The data layer provides:
- Metric storage and retrieval via LocalStorage
- Status classification (optimal/borderline/deficient/excess)
- Trend analysis (improving/stable/declining)
- WHOOP JSON import and mapping

---

## Installation

Dependencies are already included in the project. Verify they're installed:

```bash
npm install date-fns uuid
npm install -D vitest @testing-library/react jsdom
```

---

## Basic Usage

### 1. Using the useMetrics Hook

```tsx
import { useMetrics } from '@/hooks/useMetrics';

function MetricsDashboard() {
  const {
    metrics,
    loading,
    error,
    addMetric,
    updateMetric,
    removeMetric,
    getMetricsByCategory,
  } = useMetrics();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {metrics.map(metric => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
```

### 2. Adding a Metric

```tsx
import { useMetrics } from '@/hooks/useMetrics';

function AddMetricForm() {
  const { addMetric } = useMetrics();

  const handleSubmit = (data: FormData) => {
    addMetric({
      name: 'Vitamin D',
      value: 45,
      unit: 'ng/mL',
      category: 'vitamins',
      subcategory: 'fat-soluble',
      timestamp: new Date().toISOString(),
      improvement: 'higher is better',
      referenceRange: { min: 30, max: 100 },
      optimalRange: { min: 50, max: 80 },
      source: 'bloodwork',
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. Calculating Status

```tsx
import { calculateStatus } from '@/lib/calculations/status';

const status = calculateStatus({
  value: 45,
  referenceRange: { min: 30, max: 100 },
  optimalRange: { min: 50, max: 80 },
});

console.log(status); // 'borderline' (within reference but below optimal)
```

### 4. Analyzing Trends

```tsx
import { analyzeTrend } from '@/lib/calculations/trend';

const vitaminDHistory = [
  { value: 35, timestamp: '2025-10-01' },
  { value: 40, timestamp: '2025-11-01' },
  { value: 45, timestamp: '2025-12-01' },
];

const trend = analyzeTrend({
  metrics: vitaminDHistory,
  improvementDirection: 'higher is better',
});

console.log(trend); // 'improving'
```

### 5. Importing WHOOP Data

```tsx
import { parseWhoopJson, mapWhoopToMetrics } from '@/lib/whoop';
import { useMetrics } from '@/hooks/useMetrics';

function WhoopImporter() {
  const { importMetrics } = useMetrics();

  const handleFileUpload = async (file: File) => {
    const text = await file.text();

    // Parse JSON
    const parseResult = parseWhoopJson(text);
    if (!parseResult.success) {
      console.error('Parse errors:', parseResult.errors);
      return;
    }

    // Map to metrics
    const mapResult = mapWhoopToMetrics(parseResult.data!);
    if (mapResult.warnings.length > 0) {
      console.warn('Warnings:', mapResult.warnings);
    }

    // Import to storage
    await importMetrics(mapResult.metrics);
  };

  return <input type="file" onChange={e => handleFileUpload(e.target.files[0])} />;
}
```

---

## API Reference

### useMetrics Hook

| Property | Type | Description |
|----------|------|-------------|
| `metrics` | `Metric[]` | All stored metrics |
| `loading` | `boolean` | True during initial load |
| `error` | `Error \| null` | Last error, if any |
| `addMetric` | `(metric) => void` | Add new metric |
| `updateMetric` | `(metric) => void` | Update existing |
| `removeMetric` | `(id) => void` | Delete by ID |
| `getMetricsByCategory` | `(category) => Metric[]` | Filter by category |
| `getMetricsByTimeRange` | `(start, end) => Metric[]` | Filter by date |
| `getMetricHistory` | `(name) => Metric[]` | Get readings for metric |
| `clearMetrics` | `() => void` | Clear all (destructive) |
| `exportMetrics` | `() => string` | Export as JSON |
| `importMetrics` | `(json) => void` | Import from JSON |

### Calculation Functions

| Function | Input | Output |
|----------|-------|--------|
| `calculateStatus` | `{ value, referenceRange?, optimalRange? }` | `MetricStatus` |
| `analyzeTrend` | `{ metrics, improvementDirection }` | `MetricTrend` |
| `calculatePercentChange` | `(previous, current)` | `number` |
| `calculateSignificance` | `(deviation)` | `number (0-1)` |
| `normalizeValue` | `(value, range)` | `number (0-1)` |
| `detectOutliers` | `(metrics, threshold?)` | `Metric[]` |

### WHOOP Functions

| Function | Input | Output |
|----------|-------|--------|
| `parseWhoopJson` | `string \| unknown` | `WhoopParseResult` |
| `mapWhoopToMetrics` | `(report, config?)` | `WhoopMapResult` |
| `validateWhoopJson` | `unknown` | `{ valid, missingFields }` |

---

## Testing

Run tests:

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

Example test:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateStatus } from '@/lib/calculations/status';

describe('calculateStatus', () => {
  it('returns optimal when value is within optimal range', () => {
    const status = calculateStatus({
      value: 60,
      referenceRange: { min: 30, max: 100 },
      optimalRange: { min: 50, max: 80 },
    });
    expect(status).toBe('optimal');
  });

  it('returns borderline when no ranges defined', () => {
    const status = calculateStatus({ value: 50 });
    expect(status).toBe('borderline');
  });
});
```

---

## Common Patterns

### Filtering by Multiple Criteria

```tsx
const { metrics, getMetricsByCategory, getMetricsByTimeRange } = useMetrics();

// Get vitamins from last 30 days
const vitamins = getMetricsByCategory('vitamins');
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const recentVitamins = vitamins.filter(m =>
  new Date(m.timestamp) >= thirtyDaysAgo
);
```

### Calculating Full Result

```tsx
import { calculateMetricResult } from '@/lib/calculations';

const metric = metrics.find(m => m.name === 'Vitamin D');
const history = getMetricHistory('Vitamin D');

const result = calculateMetricResult(metric, history);
// { status: 'borderline', trend: 'improving', percentChange: 12.5, significance: 0.7 }
```

### Handling Storage Errors

```tsx
const { error, exportMetrics } = useMetrics();

useEffect(() => {
  if (error?.message.includes('quota')) {
    // Storage full - prompt user to export and clear old data
    const backup = exportMetrics();
    downloadFile(backup, 'metrics-backup.json');
  }
}, [error]);
```

---

## Troubleshooting

### "LocalStorage quota exceeded"

Export data, clear old metrics, re-import recent ones:

```tsx
const backup = exportMetrics();
clearMetrics();
// Re-import only last 6 months
```

### "Invalid WHOOP JSON"

Check the JSON matches expected schema:

```typescript
const { valid, missingFields } = validateWhoopJson(data);
if (!valid) {
  console.error('Missing fields:', missingFields);
}
```

### Metrics not persisting

Verify LocalStorage is available and not in private browsing mode:

```typescript
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  console.error('LocalStorage not available');
}
```
