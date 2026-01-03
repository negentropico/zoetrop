/**
 * CategoryCard Component
 *
 * Displays a single category in the dashboard grid with status indicator.
 */

import type { CategoryCardProps } from '@/types/components';
import { STATUS_STYLES } from '@/types/components';
import type { MetricStatus } from '@/types/metrics';
import {
  Pill,
  Gem,
  Flame,
  Zap,
  Activity,
  HeartPulse,
  User,
  Droplet,
  TestTube,
} from 'lucide-react';

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  pill: Pill,
  gem: Gem,
  flame: Flame,
  zap: Zap,
  activity: Activity,
  'heart-pulse': HeartPulse,
  user: User,
  droplet: Droplet,
  'test-tube': TestTube,
};

// Status border colors
const STATUS_BORDER_COLORS: Record<MetricStatus | 'empty', string> = {
  optimal: 'border-green-500',
  borderline: 'border-yellow-500',
  deficient: 'border-red-500',
  excess: 'border-orange-600',
  empty: 'border-gray-300',
};

// Status background colors (subtle)
const STATUS_BG_COLORS: Record<MetricStatus | 'empty', string> = {
  optimal: 'bg-green-50',
  borderline: 'bg-yellow-50',
  deficient: 'bg-red-50',
  excess: 'bg-orange-50',
  empty: 'bg-gray-50',
};

export function CategoryCard({
  summary,
  onClick,
  selected = false,
}: CategoryCardProps) {
  const { category, info, metricCount, overallStatus } = summary;
  const IconComponent = CATEGORY_ICONS[info.icon] || Activity;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      data-testid="category-card"
      data-status={overallStatus}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-selected={selected}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        ${STATUS_BORDER_COLORS[overallStatus]}
        ${STATUS_BG_COLORS[overallStatus]}
        ${onClick ? 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' : ''}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
    >
      {/* Category Icon */}
      <div className="flex items-start justify-between mb-3">
        <div
          data-testid="category-icon"
          className={`p-2 rounded-lg ${info.color} bg-white shadow-sm`}
        >
          <IconComponent className="w-6 h-6" aria-hidden="true" />
        </div>

        {/* Status indicator dot */}
        {overallStatus !== 'empty' && (
          <div
            className={`w-3 h-3 rounded-full ${STATUS_STYLES[overallStatus as MetricStatus].bg}`}
            aria-label={`Status: ${STATUS_STYLES[overallStatus as MetricStatus].label}`}
          />
        )}
      </div>

      {/* Category Name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {info.label}
      </h3>

      {/* Category Description */}
      <p className="text-sm text-gray-600 mb-3">
        {info.description}
      </p>

      {/* Metric Count or Empty State */}
      <div className="text-sm">
        {metricCount > 0 ? (
          <span className="text-gray-700 font-medium">
            {metricCount} {metricCount === 1 ? 'metric' : 'metrics'}
          </span>
        ) : (
          <span className="text-gray-400 italic">No data</span>
        )}
      </div>
    </div>
  );
}

export default CategoryCard;
