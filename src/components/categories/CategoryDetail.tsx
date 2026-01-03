/**
 * CategoryDetail Component
 *
 * Full detail view for a category showing all metrics with cards.
 */

import { ArrowLeft } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { CategorySummary } from '@/types/components';
import { StatusBadge } from '../metrics/StatusBadge';
import { MetricCard } from '../metrics/MetricCard';
import { formatDistanceToNow } from 'date-fns';

export interface CategoryDetailProps {
  category: CategorySummary;
  backLink?: string;
  backLabel?: string;
}

export function CategoryDetail({
  category,
  backLink = '/',
  backLabel = 'Back to Dashboard',
}: CategoryDetailProps) {
  const { info, metrics, overallStatus, metricCount, lastUpdated } = category;

  // Get the icon component
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
    info.icon
  ] || LucideIcons.Activity;

  const hasMetrics = metricCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            data-testid="category-icon"
            className={`
              flex items-center justify-center w-14 h-14 rounded-xl
              ${overallStatus === 'optimal' ? 'bg-green-100' : ''}
              ${overallStatus === 'borderline' ? 'bg-yellow-100' : ''}
              ${overallStatus === 'deficient' ? 'bg-red-100' : ''}
              ${overallStatus === 'excess' ? 'bg-orange-100' : ''}
              ${overallStatus === 'empty' ? 'bg-gray-100' : ''}
            `}
          >
            <IconComponent
              className={`
                w-7 h-7
                ${overallStatus === 'optimal' ? 'text-green-600' : ''}
                ${overallStatus === 'borderline' ? 'text-yellow-600' : ''}
                ${overallStatus === 'deficient' ? 'text-red-600' : ''}
                ${overallStatus === 'excess' ? 'text-orange-600' : ''}
                ${overallStatus === 'empty' ? 'text-gray-400' : ''}
              `}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{info.label}</h1>
            <p className="text-gray-600 mt-1">{info.description}</p>
          </div>
        </div>

        {hasMetrics && overallStatus !== 'empty' && (
          <StatusBadge status={overallStatus} size="lg" />
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <span>
          <span className="font-semibold text-gray-900">{metricCount}</span> metric
          {metricCount !== 1 ? 's' : ''}
        </span>
        {lastUpdated && (
          <span>
            Last updated{' '}
            <span className="font-medium text-gray-900">
              {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </span>
          </span>
        )}
      </div>

      {/* Metrics Grid or Empty State */}
      {hasMetrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <IconComponent className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No metrics recorded
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            No {info.label.toLowerCase()} metrics have been added yet.
            Import data or add metrics manually to get started.
          </p>
        </div>
      )}

      {/* Back Link */}
      <div className="pt-4 border-t border-gray-200">
        <a
          href={backLink}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {backLabel}
        </a>
      </div>
    </div>
  );
}

export default CategoryDetail;
