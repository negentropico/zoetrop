/**
 * CategoryGrid Component
 *
 * Responsive grid of category cards for the dashboard.
 */

import type { CategoryGridProps } from '@/types/components';
import type { MetricCategory } from '@/types/metrics';
import { CategoryCard } from './CategoryCard';

export function CategoryGrid({
  categories,
  onCategoryClick,
  loading = false,
}: CategoryGridProps) {
  if (loading) {
    return (
      <div
        data-testid="category-grid-loading"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {/* Loading skeleton */}
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border-2 border-gray-200 bg-gray-100 animate-pulse"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <div className="h-6 bg-gray-300 rounded mb-2 w-24" />
            <div className="h-4 bg-gray-300 rounded mb-3 w-32" />
            <div className="h-4 bg-gray-300 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const handleCardClick = (category: MetricCategory) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    }
  };

  return (
    <div
      data-testid="category-grid"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {categories.map((summary) => (
        <CategoryCard
          key={summary.category}
          summary={summary}
          onClick={onCategoryClick ? () => handleCardClick(summary.category) : undefined}
        />
      ))}
    </div>
  );
}

export default CategoryGrid;
