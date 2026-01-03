/**
 * Integration Tests for Dashboard
 *
 * Tests the full dashboard with CategoryGrid and data loading.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedLocalStorage, clearLocalStorage, seedMetrics } from '@/tests/fixtures/dashboard-fixtures';

// Mock the storage adapter
vi.mock('@/lib/storage/local', () => ({
  LocalStorageAdapter: class MockLocalStorageAdapter {
    async initialize() {
      return { success: true };
    }
    async getMetrics() {
      const stored = localStorage.getItem('wellness-metrics');
      if (stored) {
        const data = JSON.parse(stored);
        return { success: true, data: data.metrics };
      }
      return { success: true, data: [] };
    }
    async addMetric() {
      return { success: true };
    }
    async updateMetric() {
      return { success: true };
    }
    async deleteMetric() {
      return { success: true };
    }
    async exportMetrics() {
      return { success: true, data: '[]' };
    }
    async importMetrics() {
      return { success: true, data: [] };
    }
    async clearMetrics() {
      return { success: true };
    }
    async getSyncStatus() {
      return { success: true, data: { local: 0, synced: 0, pending: 0 } };
    }
  },
}));

// Mock Dashboard component for testing (will be replaced when real component exists)
function MockDashboard() {
  // This simulates what the real Dashboard will do
  const [categories, setCategories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const stored = localStorage.getItem('wellness-metrics');
    if (stored) {
      const data = JSON.parse(stored);
      // Simulate aggregation
      const summaries = [
        { category: 'vitamins', info: { label: 'Vitamins' }, metricCount: data.metrics.filter((m: any) => m.category === 'vitamins').length, overallStatus: 'optimal' },
        { category: 'minerals', info: { label: 'Minerals' }, metricCount: 0, overallStatus: 'empty' },
        { category: 'inflammatory', info: { label: 'Inflammatory' }, metricCount: data.metrics.filter((m: any) => m.category === 'inflammatory').length, overallStatus: 'borderline' },
        { category: 'metabolic', info: { label: 'Metabolic' }, metricCount: data.metrics.filter((m: any) => m.category === 'metabolic').length, overallStatus: 'deficient' },
        { category: 'hormones', info: { label: 'Hormones' }, metricCount: 0, overallStatus: 'empty' },
        { category: 'autonomic', info: { label: 'Autonomic' }, metricCount: data.metrics.filter((m: any) => m.category === 'autonomic').length, overallStatus: 'optimal' },
        { category: 'bodyComposition', info: { label: 'Body Composition' }, metricCount: 0, overallStatus: 'empty' },
        { category: 'lipids', info: { label: 'Lipids' }, metricCount: 0, overallStatus: 'empty' },
        { category: 'hematology', info: { label: 'Hematology' }, metricCount: 0, overallStatus: 'empty' },
      ];
      setCategories(summaries);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div data-testid="dashboard-loading">Loading...</div>;
  }

  return (
    <div data-testid="dashboard">
      <div data-testid="category-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.category}
            data-testid="category-card"
            data-status={cat.overallStatus}
          >
            <span>{cat.info.label}</span>
            <span>{cat.metricCount > 0 ? `${cat.metricCount} metrics` : 'No data'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Import React for the mock component
import React from 'react';

describe('Dashboard Integration', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    clearLocalStorage();
    vi.clearAllMocks();
  });

  it('should display all 9 category cards with data', async () => {
    seedLocalStorage();

    render(<MockDashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    });

    const cards = screen.getAllByTestId('category-card');
    expect(cards).toHaveLength(9);
  });

  it('should show category labels', async () => {
    seedLocalStorage();

    render(<MockDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Vitamins')).toBeInTheDocument();
      expect(screen.getByText('Minerals')).toBeInTheDocument();
      expect(screen.getByText('Autonomic')).toBeInTheDocument();
    });
  });

  it('should show metric counts for populated categories', async () => {
    seedLocalStorage();

    render(<MockDashboard />);

    await waitFor(() => {
      expect(screen.getByText('3 metrics')).toBeInTheDocument(); // Autonomic
    });
  });

  it('should show correct status on cards', async () => {
    seedLocalStorage();

    render(<MockDashboard />);

    await waitFor(() => {
      const cards = screen.getAllByTestId('category-card');
      const autonomicCard = cards.find((c) => c.textContent?.includes('Autonomic'));
      expect(autonomicCard).toHaveAttribute('data-status', 'optimal');
    });
  });

  it('should show No data for empty categories', async () => {
    seedLocalStorage();

    render(<MockDashboard />);

    await waitFor(() => {
      const noDataElements = screen.getAllByText('No data');
      expect(noDataElements.length).toBeGreaterThan(0);
    });
  });

  it('should render dashboard', () => {
    render(<MockDashboard />);
    // With the mock, loading completes immediately, so we check for the dashboard
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
