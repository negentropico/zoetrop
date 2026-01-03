/**
 * CategoryPageView Component
 *
 * React island for category detail pages.
 * Fetches and displays metrics for a specific category.
 */

import { useMemo } from 'react';
import type { MetricCategory } from '@/types/metrics';
import { CATEGORY_INFO } from '@/types/metrics';
import { useDashboard } from '@/hooks/useDashboard';
import { CategoryDetail } from './CategoryDetail';
import { Loader2 } from 'lucide-react';

export interface CategoryPageViewProps {
  categoryId: MetricCategory;
}

export function CategoryPageView({ categoryId }: CategoryPageViewProps) {
  const { categories, isLoading, error } = useDashboard();

  const category = useMemo(() => {
    return categories.find((c) => c.category === categoryId) || {
      category: categoryId,
      info: CATEGORY_INFO[categoryId],
      metricCount: 0,
      overallStatus: 'empty' as const,
      metrics: [],
      lastUpdated: null,
    };
  }, [categories, categoryId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return <CategoryDetail category={category} />;
}

export default CategoryPageView;
