/**
 * DashboardView Component
 *
 * React island component for the main dashboard.
 * Uses useDashboard hook and CategoryGrid.
 */

import { useDashboard } from '@/hooks/useDashboard';
import { CategoryGrid } from './CategoryGrid';
import { EmptyState } from '@/components/layout/EmptyState';
import type { MetricCategory } from '@/types/metrics';

interface DashboardViewProps {
  onCategoryClick?: (category: MetricCategory) => void;
}

export function DashboardView({ onCategoryClick }: DashboardViewProps) {
  const { categories, isLoading, error } = useDashboard();

  // Handle navigation
  const handleCategoryClick = (category: MetricCategory) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    } else {
      // Default navigation
      const path = category === 'bodyComposition' ? 'body-composition' : category;
      window.location.href = `/${path}/`;
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-medium">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Check if all categories are empty
  const hasAnyData = categories.some((c) => c.metricCount > 0);

  return (
    <div data-testid="dashboard-view">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="Optimal"
          count={categories.filter((c) => c.overallStatus === 'optimal' && c.metricCount > 0).length}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <SummaryCard
          label="Borderline"
          count={categories.filter((c) => c.overallStatus === 'borderline').length}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <SummaryCard
          label="Needs Attention"
          count={categories.filter((c) => c.overallStatus === 'deficient' || c.overallStatus === 'excess').length}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <SummaryCard
          label="No Data"
          count={categories.filter((c) => c.overallStatus === 'empty').length}
          color="text-gray-600"
          bgColor="bg-gray-50"
        />
      </div>

      {/* Category Grid */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
      <CategoryGrid
        categories={categories}
        onCategoryClick={handleCategoryClick}
        loading={isLoading}
      />

      {/* Import Prompt when no data */}
      {!isLoading && !hasAnyData && (
        <div className="mt-8">
          <EmptyState
            title="No metrics yet"
            description="Import your WHOOP data or add blood work results to get started."
            actionLabel="Import WHOOP Data"
            onAction={() => (window.location.href = '/import/')}
            icon="upload"
          />
        </div>
      )}
    </div>
  );
}

// Summary card sub-component
function SummaryCard({
  label,
  count,
  color,
  bgColor,
}: {
  label: string;
  count: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-4 text-center`}>
      <div className={`text-3xl font-bold ${color}`}>{count}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

export default DashboardView;
