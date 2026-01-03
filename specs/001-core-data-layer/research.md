# Research: Core Data Layer

**Feature**: 001-core-data-layer
**Date**: 2026-01-03

## Overview

This document consolidates research findings for the Core Data Layer implementation. All technical decisions were informed by the project constitution, existing source code in Dash/Whoop projects, and industry best practices.

---

## Decision 1: Storage Architecture

### Decision
Use a **Storage Adapter pattern** with LocalStorage as the concrete implementation.

### Rationale
- Constitution mandates local-first storage with optional cloud sync
- Adapter pattern allows swapping LocalStorage for IndexedDB or Postgres without changing consumers
- Existing Dash implementation uses direct LocalStorage calls; refactoring to adapter improves testability

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| Direct LocalStorage calls | Hard to mock in tests, no abstraction for future cloud sync |
| IndexedDB only | More complex API, LocalStorage sufficient for typical metric counts (< 1000) |
| In-memory with periodic flush | Risk of data loss on crash, violates offline-first principle |

### Implementation Notes
```typescript
// Storage adapter interface
interface StorageAdapter {
  getMetrics(): Promise<Metric[]>;
  saveMetrics(metrics: Metric[]): Promise<void>;
  // ... CRUD methods
}

// LocalStorage implementation
class LocalStorageAdapter implements StorageAdapter { ... }
```

---

## Decision 2: Status Classification Algorithm

### Decision
Use **dual-range status classification** with both reference and optimal ranges.

### Rationale
- Medical lab results have reference ranges (normal population)
- Optimal ranges are narrower targets for wellness optimization
- Four-state classification (optimal/borderline/deficient/excess) matches constitution
- Dash implementation uses only reference ranges; enhancing with optimal provides more insight

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| Reference range only | Misses distinction between "normal" and "optimal" |
| Percentile-based | Requires population data not available |
| ML-based classification | Over-engineering for deterministic thresholds |

### Implementation Notes
```typescript
function calculateStatus(value: number, ranges: MetricRanges): MetricStatus {
  if (ranges.optimal && value >= ranges.optimal.min && value <= ranges.optimal.max) {
    return 'optimal';
  }
  if (value < ranges.reference.min) return 'deficient';
  if (value > ranges.reference.max) return 'excess';
  return 'borderline';
}
```

---

## Decision 3: Trend Analysis Method

### Decision
Use **linear regression slope** with improvement direction awareness.

### Rationale
- Simple moving average doesn't capture direction
- Linear regression provides clear trend direction and magnitude
- Improvement direction ("higher is better" vs "lower is better") determines whether increasing values are good or bad
- Dash implementation uses simple average change; regression is more robust to outliers

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| Simple average change | Sensitive to outliers, doesn't weight recent data |
| Exponential smoothing | More complex, benefits marginal for typical data volume |
| ARIMA forecasting | Over-engineering, requires time series expertise |

### Implementation Notes
```typescript
function analyzeTrend(metrics: Metric[]): MetricTrend {
  if (metrics.length < 2) return 'stable';

  const slope = calculateLinearRegressionSlope(metrics);
  const threshold = 0.05; // 5% variance threshold for stability

  if (Math.abs(slope) < threshold) return 'stable';

  const isIncreasing = slope > 0;
  const higherIsBetter = metrics[0].improvement === 'higher is better';

  return (isIncreasing === higherIsBetter) ? 'improving' : 'declining';
}
```

---

## Decision 4: WHOOP JSON Parsing Strategy

### Decision
Use **schema validation with graceful degradation** for unknown fields.

### Rationale
- WHOOP Analyzer JSON schema may evolve
- Strict validation would break on schema changes
- Validate required fields, ignore unknown fields
- Log warnings for missing optional fields

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| Strict schema validation | Fragile to upstream changes |
| No validation | Silent failures, type safety violations |
| Schema versioning | Over-engineering for single-source import |

### Implementation Notes
```typescript
interface WhoopParseResult {
  success: boolean;
  data?: WhoopAnalysisReport;
  errors: string[];
  warnings: string[];
}

function parseWhoopJSON(json: unknown): WhoopParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!hasRequiredFields(json)) {
    return { success: false, errors: ['Missing required fields'], warnings };
  }

  // Parse with type guards
  const data = extractWhoopData(json);

  // Warn about missing optional fields
  if (!data.sleep_analysis) {
    warnings.push('Sleep analysis data missing');
  }

  return { success: true, data, errors, warnings };
}
```

---

## Decision 5: Sync Status Tracking

### Decision
Use **optimistic local writes** with version-based sync tracking.

### Rationale
- Constitution requires offline-first operation
- Each metric tracks: `syncStatus` (local/synced/pending) and `syncVersion` (integer)
- New/updated metrics start as 'local', become 'pending' when cloud sync available
- Last-write-wins conflict resolution per constitution

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| No sync tracking | Cannot implement cloud sync in Phase 5 |
| CRDT-based | Over-engineering for single-user application |
| Event sourcing | Complexity not justified for simple CRUD |

### Implementation Notes
```typescript
interface SyncMetadata {
  syncStatus: 'local' | 'synced' | 'pending';
  syncVersion: number;
  lastModified: string; // ISO 8601
}

// On local write
function markAsLocal(metric: Metric): Metric {
  return {
    ...metric,
    syncStatus: 'local',
    syncVersion: metric.syncVersion + 1,
    lastModified: new Date().toISOString()
  };
}
```

---

## Decision 6: Testing Strategy

### Decision
Use **Vitest** with React Testing Library for hooks, pure function unit tests for utilities.

### Rationale
- Vitest is Astro's recommended test runner
- Fast execution with native ESM support
- React Testing Library for hook testing (renderHook)
- LocalStorage mocking via jsdom environment

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| Jest | Slower, ESM configuration more complex |
| Playwright only | E2E too slow for unit testing utilities |
| No tests | Violates constitution (Test-First Development) |

### Implementation Notes
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts']
  }
});

// src/tests/setup.ts
beforeEach(() => {
  localStorage.clear();
});
```

---

## Best Practices Applied

### TypeScript Strict Mode
- All functions have explicit return types
- No `any` types (use `unknown` with type guards for external data)
- Discriminated unions for metric categories

### Error Handling
- Storage operations wrapped in try-catch
- Errors surface to UI via hook state (`error: Error | null`)
- Validation errors are typed and descriptive

### Performance
- Batch LocalStorage writes (single JSON blob vs per-metric)
- Memoize calculation results in hooks
- Lazy initialization of storage on first access

---

## Dependencies Confirmed

| Dependency | Version | Purpose |
|------------|---------|---------|
| date-fns | ^3.0.0 | Date manipulation, ISO parsing |
| uuid | ^9.0.0 | UUID v4 generation |
| vitest | ^2.0.0 | Testing framework |
| @testing-library/react | ^15.0.0 | Hook testing |
| @netlify/neon | ^0.1.0 | Neon Postgres client (Phase 5+) |
| drizzle-orm | installed | TypeScript ORM (Phase 5+) |

---

## Infrastructure Ready (Phase 5+)

### Neon Postgres via Netlify

The database infrastructure is pre-configured for Phase 5 cloud sync:

| Component | Location | Status |
|-----------|----------|--------|
| Drizzle config | `drizzle.config.ts` | Ready |
| DB connection | `db/index.ts` | Ready |
| Schema | `db/schema.ts` | Placeholder (needs metrics table) |
| Netlify Site | zoetrop (`0abb12f6-...`) | Deployed |
| Environment | `NETLIFY_DATABASE_URL` | Auto-injected |

### Phase 5 Migration Plan

1. Update `db/schema.ts` with metrics table from data-model.md
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply to Neon
4. Implement `PostgresAdapter` in `src/lib/storage/postgres.ts`
5. Add sync logic to reconcile LocalStorage ↔ Postgres

**Note**: Phases 1-4 use LocalStorage only. Postgres adapter is deferred.

---

## Open Questions (None)

All technical decisions resolved. Ready for Phase 1 design artifacts.
