# Quickstart: MVP Dashboard & UI Components

**Feature**: 002-mvp-dashboard
**Date**: 2026-01-03

## Overview

This document provides test scenarios and integration examples for verifying the MVP Dashboard implementation.

---

## Test Data Setup

### Seed Metrics for Testing

```typescript
// src/tests/fixtures/dashboard-fixtures.ts

import type { Metric } from '@/types/metrics';

export const seedMetrics: Metric[] = [
  // Autonomic - from WHOOP
  {
    id: 'hrv-001',
    name: 'HRV (RMSSD)',
    value: 45,
    unit: 'ms',
    category: 'autonomic',
    subcategory: 'hrv',
    timestamp: '2026-01-03T08:00:00.000Z',
    improvement: 'higher is better',
    referenceRange: { min: 20, max: 100 },
    optimalRange: { min: 50, max: 100 },
    source: 'whoop',
    syncStatus: 'local',
    syncVersion: 1,
  },
  {
    id: 'recovery-001',
    name: 'Recovery Score',
    value: 72,
    unit: '%',
    category: 'autonomic',
    subcategory: 'recovery',
    timestamp: '2026-01-03T08:00:00.000Z',
    improvement: 'higher is better',
    referenceRange: { min: 0, max: 100 },
    optimalRange: { min: 67, max: 100 },
    source: 'whoop',
    syncStatus: 'local',
    syncVersion: 1,
  },
  // Vitamins - manual entry
  {
    id: 'vitd-001',
    name: 'Vitamin D',
    value: 55,
    unit: 'ng/mL',
    category: 'vitamins',
    subcategory: 'fat-soluble',
    timestamp: '2026-01-01T12:00:00.000Z',
    improvement: 'higher is better',
    referenceRange: { min: 30, max: 100 },
    optimalRange: { min: 50, max: 80 },
    source: 'bloodwork',
    syncStatus: 'local',
    syncVersion: 1,
  },
  // Inflammatory - with borderline status
  {
    id: 'crp-001',
    name: 'hs-CRP',
    value: 1.8,
    unit: 'mg/L',
    category: 'inflammatory',
    subcategory: 'crp',
    timestamp: '2026-01-01T12:00:00.000Z',
    improvement: 'lower is better',
    referenceRange: { min: 0, max: 3 },
    optimalRange: { min: 0, max: 1 },
    source: 'bloodwork',
    syncStatus: 'local',
    syncVersion: 1,
  },
];

export const emptyMetrics: Metric[] = [];

export const singleCategoryMetrics: Metric[] = seedMetrics.filter(
  m => m.category === 'autonomic'
);
```

---

## Integration Test Scenarios

### Scenario 1: Dashboard Load with Data

**User Story**: US1 - View Dashboard Overview

```typescript
// src/tests/integration/dashboard.test.tsx

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import Dashboard from '@/pages/index.astro';
import { seedMetrics } from '../fixtures/dashboard-fixtures';

describe('Dashboard Integration', () => {
  beforeEach(() => {
    // Seed localStorage with test data
    localStorage.setItem('wellness-metrics', JSON.stringify({
      metrics: seedMetrics,
      lastUpdated: new Date().toISOString(),
      syncVersion: 1,
    }));
  });

  it('displays all 9 category cards', async () => {
    render(<Dashboard />);

    const categories = [
      'Vitamins', 'Minerals', 'Inflammatory', 'Metabolic',
      'Hormones', 'Autonomic', 'Body Composition', 'Lipids', 'Hematology'
    ];

    for (const category of categories) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
  });

  it('shows metric count for populated categories', async () => {
    render(<Dashboard />);

    const autonomicCard = screen.getByText('Autonomic').closest('[data-testid="category-card"]');
    expect(within(autonomicCard!).getByText('2 metrics')).toBeInTheDocument();
  });

  it('shows status indicator based on metrics', async () => {
    render(<Dashboard />);

    // Autonomic has optimal recovery (72% in 67-100 range)
    const autonomicCard = screen.getByText('Autonomic').closest('[data-testid="category-card"]');
    expect(autonomicCard).toHaveAttribute('data-status', 'optimal');
  });
});
```

---

### Scenario 2: Empty Dashboard State

**User Story**: US1 - Edge Case

```typescript
describe('Dashboard Empty State', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows empty state for all categories', async () => {
    render(<Dashboard />);

    const cards = screen.getAllByTestId('category-card');
    expect(cards).toHaveLength(9);

    cards.forEach(card => {
      expect(within(card).getByText('No data')).toBeInTheDocument();
    });
  });

  it('shows import prompt', async () => {
    render(<Dashboard />);

    expect(screen.getByText(/Import WHOOP Data/i)).toBeInTheDocument();
  });
});
```

---

### Scenario 3: Metric Card Display

**User Story**: US2 - View Metric Details with Status

```typescript
// src/tests/components/MetricCard.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricCard } from '@/components/metrics/MetricCard';
import type { MetricWithCalculations } from '@/types/components';

const optimalMetric: MetricWithCalculations = {
  id: 'test-001',
  name: 'Test Metric',
  value: 75,
  unit: 'mg/dL',
  category: 'vitamins',
  subcategory: 'fat-soluble',
  timestamp: '2026-01-03T08:00:00.000Z',
  improvement: 'higher is better',
  referenceRange: { min: 50, max: 100 },
  optimalRange: { min: 70, max: 90 },
  source: 'manual',
  syncStatus: 'local',
  syncVersion: 1,
  calculatedStatus: 'optimal',
  calculatedTrend: 'stable',
  percentChange: 0,
  historicalValues: [{ value: 75, timestamp: '2026-01-03T08:00:00.000Z' }],
};

describe('MetricCard', () => {
  it('displays metric name, value, and unit', () => {
    render(<MetricCard metric={optimalMetric} />);

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('mg/dL')).toBeInTheDocument();
  });

  it('shows optimal status badge in green', () => {
    render(<MetricCard metric={optimalMetric} />);

    const badge = screen.getByText('Optimal');
    expect(badge).toHaveClass('bg-green-600');
  });

  it('displays reference range', () => {
    render(<MetricCard metric={optimalMetric} showRanges />);

    expect(screen.getByText('Reference: 50-100')).toBeInTheDocument();
    expect(screen.getByText('Optimal: 70-90')).toBeInTheDocument();
  });
});
```

---

### Scenario 4: WHOOP Import Flow

**User Story**: US4 - Import WHOOP Data

```typescript
// src/tests/integration/whoop-import.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { WhoopImport } from '@/components/data/WhoopImport';

const validWhoopJson = JSON.stringify({
  generated_at: '2026-01-03 08:00:00',
  data_period: { start: '2025-12-01', end: '2026-01-03' },
  key_metrics: {
    avg_hrv_rmssd: 45,
    avg_recovery_score: 72,
    avg_resting_heart_rate: 58,
    avg_asleep: 7.2,
    avg_day_strain: 12.5,
  },
});

describe('WHOOP Import', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows file upload interface', () => {
    render(<WhoopImport />);

    expect(screen.getByText(/Select WHOOP JSON/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload/i })).toBeInTheDocument();
  });

  it('shows preview after file selection', async () => {
    render(<WhoopImport />);

    const file = new File([validWhoopJson], 'whoop.json', { type: 'application/json' });
    const input = screen.getByTestId('file-input');

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
      expect(screen.getByText('HRV (RMSSD)')).toBeInTheDocument();
      expect(screen.getByText('45 ms')).toBeInTheDocument();
    });
  });

  it('imports metrics on confirm', async () => {
    const onComplete = vi.fn();
    render(<WhoopImport onImportComplete={onComplete} />);

    const file = new File([validWhoopJson], 'whoop.json', { type: 'application/json' });
    await userEvent.upload(screen.getByTestId('file-input'), file);

    await waitFor(() => screen.getByText('Import Preview'));

    const confirmButton = screen.getByRole('button', { name: /Confirm Import/i });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(5); // 5 metrics imported
    });
  });

  it('shows error for invalid JSON', async () => {
    render(<WhoopImport />);

    const file = new File(['not valid json'], 'bad.json', { type: 'application/json' });
    await userEvent.upload(screen.getByTestId('file-input'), file);

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
    });
  });
});
```

---

### Scenario 5: Trend Indicator

**User Story**: US3 - View Metric Trends

```typescript
// src/tests/components/TrendIndicator.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrendIndicator } from '@/components/metrics/TrendIndicator';

describe('TrendIndicator', () => {
  it('shows green up arrow for improving higher-is-better', () => {
    render(
      <TrendIndicator
        trend="improving"
        percentChange={15}
        improvement="higher is better"
      />
    );

    const indicator = screen.getByTestId('trend-indicator');
    expect(indicator).toHaveClass('text-green-600');
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  it('shows green down arrow for improving lower-is-better', () => {
    render(
      <TrendIndicator
        trend="improving"
        percentChange={-10}
        improvement="lower is better"
      />
    );

    const indicator = screen.getByTestId('trend-indicator');
    expect(indicator).toHaveClass('text-green-600');
  });

  it('shows red arrow for declining trends', () => {
    render(
      <TrendIndicator
        trend="declining"
        percentChange={-20}
        improvement="higher is better"
      />
    );

    const indicator = screen.getByTestId('trend-indicator');
    expect(indicator).toHaveClass('text-red-600');
  });

  it('shows gray for stable trends', () => {
    render(
      <TrendIndicator
        trend="stable"
        percentChange={0}
        improvement="higher is better"
      />
    );

    const indicator = screen.getByTestId('trend-indicator');
    expect(indicator).toHaveClass('text-gray-500');
  });
});
```

---

### Scenario 6: Category Detail Page

**User Story**: US5 - Browse Category Detail Pages

```typescript
// src/tests/pages/category.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import CategoryPage from '@/pages/autonomic/index.astro';
import { seedMetrics } from '../fixtures/dashboard-fixtures';

describe('Category Detail Page', () => {
  beforeEach(() => {
    localStorage.setItem('wellness-metrics', JSON.stringify({
      metrics: seedMetrics,
      lastUpdated: new Date().toISOString(),
      syncVersion: 1,
    }));
  });

  it('displays category name and description', () => {
    render(<CategoryPage />);

    expect(screen.getByText('Autonomic')).toBeInTheDocument();
    expect(screen.getByText(/HRV, recovery, sleep/i)).toBeInTheDocument();
  });

  it('shows all metrics in category', () => {
    render(<CategoryPage />);

    expect(screen.getByText('HRV (RMSSD)')).toBeInTheDocument();
    expect(screen.getByText('Recovery Score')).toBeInTheDocument();
  });

  it('shows back navigation to dashboard', () => {
    render(<CategoryPage />);

    expect(screen.getByRole('link', { name: /Back to Dashboard/i })).toHaveAttribute('href', '/');
  });
});
```

---

## Accessibility Testing

### Screen Reader Test

```typescript
describe('Accessibility', () => {
  it('StatusBadge has accessible name', () => {
    render(<StatusBadge status="optimal" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveAccessibleName('Status: Optimal');
  });

  it('CategoryCard is keyboard navigable', async () => {
    const onClick = vi.fn();
    render(<CategoryCard summary={categorySummary} onClick={onClick} />);

    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalled();
  });

  it('TrendIndicator has aria-label', () => {
    render(
      <TrendIndicator trend="improving" percentChange={10} improvement="higher is better" />
    );

    expect(screen.getByLabelText(/Improving by 10%/i)).toBeInTheDocument();
  });
});
```

---

## Performance Test Scenarios

```typescript
describe('Performance', () => {
  it('dashboard renders in under 100ms', async () => {
    const start = performance.now();
    render(<Dashboard />);
    const end = performance.now();

    expect(end - start).toBeLessThan(100);
  });

  it('handles 100 metrics without lag', async () => {
    const manyMetrics = Array.from({ length: 100 }, (_, i) => ({
      ...seedMetrics[0],
      id: `metric-${i}`,
    }));

    localStorage.setItem('wellness-metrics', JSON.stringify({
      metrics: manyMetrics,
      lastUpdated: new Date().toISOString(),
      syncVersion: 1,
    }));

    const start = performance.now();
    render(<Dashboard />);
    const end = performance.now();

    expect(end - start).toBeLessThan(200);
  });
});
```

---

## Manual Testing Checklist

### Dashboard (US1)
- [ ] All 9 category cards visible
- [ ] Category icons display correctly
- [ ] Metric counts accurate
- [ ] Status colors match metric data
- [ ] Clicking card navigates to category page
- [ ] Grid responsive: 1 col mobile, 2 col tablet, 3 col desktop

### Metric Display (US2)
- [ ] Value and unit displayed
- [ ] Status badge shows correct color and label
- [ ] Reference range displayed when available
- [ ] Optimal range displayed when available

### Trends (US3)
- [ ] Arrow direction matches value change
- [ ] Green for improving, red for declining
- [ ] Percentage displayed accurately
- [ ] No trend shown for single reading

### WHOOP Import (US4)
- [ ] File picker accepts .json files
- [ ] Drag-and-drop works
- [ ] Preview shows all metrics
- [ ] Confirm saves to localStorage
- [ ] Cancel returns to idle state
- [ ] Error message for invalid files

### Category Pages (US5)
- [ ] All metrics in category displayed
- [ ] Category name and description shown
- [ ] Back link to dashboard works
- [ ] Empty state shown when no metrics
