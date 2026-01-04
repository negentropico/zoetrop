/**
 * AllMetricsView Component
 *
 * Main dashboard view showing all metrics with collapsible category sections.
 * Includes trend charts for metrics with historical data.
 */

import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, ChevronRight, Loader2, Search, Filter, TrendingUp, X } from 'lucide-react';
import type { MetricStatus, MetricCategory, Metric } from '@/types/metrics';
import { CATEGORY_INFO } from '@/types/metrics';
import { useDashboard } from '@/hooks/useDashboard';
import { useMetrics } from '@/hooks/useMetrics';
import { MetricCard } from '../metrics/MetricCard';
import { StatusBadge } from '../metrics/StatusBadge';
import { TrendChart } from '../charts/TrendChart';

type SortOption = 'category' | 'name' | 'status' | 'date';
type StatusFilter = 'all' | MetricStatus | 'empty';

interface MetricWithCategory extends Metric {
  categoryId: MetricCategory;
  categoryInfo: typeof CATEGORY_INFO[MetricCategory];
}

export function AllMetricsView() {
  const { categories, isLoading, error } = useDashboard();
  const { getMetricHistory } = useMetrics();
  const [expandedCategories, setExpandedCategories] = useState<Set<MetricCategory>>(
    new Set(['vitamins', 'minerals', 'inflammatory', 'metabolic', 'hormones', 'autonomic', 'bodyComposition', 'lipids', 'hematology'])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('category');
  const [selectedMetric, setSelectedMetric] = useState<MetricWithCategory | null>(null);

  // Collect all metrics with their categories
  const allMetrics = useMemo(() => {
    return categories.flatMap(cat =>
      cat.metrics.map(metric => ({
        ...metric,
        categoryId: cat.category,
        categoryInfo: cat.info,
      }))
    );
  }, [categories]);

  // Get unique metrics by name (latest value for each)
  const uniqueMetrics = useMemo(() => {
    const metricMap = new Map<string, MetricWithCategory>();

    // Sort by date descending to get latest first
    const sorted = [...allMetrics].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const metric of sorted) {
      const key = `${metric.categoryId}-${metric.name}`;
      if (!metricMap.has(key)) {
        metricMap.set(key, metric);
      }
    }

    return Array.from(metricMap.values());
  }, [allMetrics]);

  // Filter and sort metrics
  const filteredMetrics = useMemo(() => {
    let result = uniqueMetrics;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.categoryInfo.label.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(m => {
        if (statusFilter === 'empty') {
          return !m.calculatedStatus;
        }
        return m.calculatedStatus === statusFilter;
      });
    }

    // Sort
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'status') {
      const statusOrder: Record<string, number> = { deficient: 0, excess: 1, borderline: 2, optimal: 3 };
      result = [...result].sort((a, b) => {
        const aOrder = a.calculatedStatus ? statusOrder[a.calculatedStatus] ?? 4 : 4;
        const bOrder = b.calculatedStatus ? statusOrder[b.calculatedStatus] ?? 4 : 4;
        return aOrder - bOrder;
      });
    } else if (sortBy === 'date') {
      result = [...result].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    return result;
  }, [uniqueMetrics, searchQuery, statusFilter, sortBy]);

  // Group by category for display
  const metricsByCategory = useMemo(() => {
    if (sortBy !== 'category') return null;

    const grouped = new Map<MetricCategory, typeof filteredMetrics>();
    for (const metric of filteredMetrics) {
      const existing = grouped.get(metric.categoryId) || [];
      grouped.set(metric.categoryId, [...existing, metric]);
    }
    return grouped;
  }, [filteredMetrics, sortBy]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      optimal: uniqueMetrics.filter(m => m.calculatedStatus === 'optimal').length,
      borderline: uniqueMetrics.filter(m => m.calculatedStatus === 'borderline').length,
      deficient: uniqueMetrics.filter(m => m.calculatedStatus === 'deficient').length,
      excess: uniqueMetrics.filter(m => m.calculatedStatus === 'excess').length,
      empty: uniqueMetrics.filter(m => !m.calculatedStatus).length,
    };
  }, [uniqueMetrics]);

  // Get history for selected metric
  const metricHistory = useMemo(() => {
    if (!selectedMetric) return [];
    return getMetricHistory(selectedMetric.name);
  }, [selectedMetric, getMetricHistory]);

  const toggleCategory = (category: MetricCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(categories.map(c => c.category)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handleMetricClick = (metric: MetricWithCategory) => {
    setSelectedMetric(selectedMetric?.id === metric.id ? null : metric);
  };

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

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Health Metrics</h2>
            <p className="text-sm text-gray-600">
              {uniqueMetrics.length} unique metrics • {allMetrics.length} total readings
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1 text-sm">
              <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                {statusCounts.optimal} optimal
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">
                {statusCounts.borderline} borderline
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                {statusCounts.deficient + statusCounts.excess} attention
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart Panel (when metric selected) */}
      {selectedMetric && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">{selectedMetric.name}</h3>
                <p className="text-sm text-gray-500">
                  {metricHistory.length} readings • {selectedMetric.categoryInfo.label}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMetric(null)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {metricHistory.length > 1 ? (
            <TrendChart
              metrics={metricHistory}
              height={250}
              showOptimalRange={true}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              Only 1 data point available. Need more readings for trend.
            </div>
          )}

          {/* Data table */}
          {metricHistory.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">History</h4>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-500 text-left">
                    <tr>
                      <th className="pb-2">Date</th>
                      <th className="pb-2 text-right">Value</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...metricHistory].reverse().slice(0, 10).map((m, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-600">
                          {new Date(m.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {m.value} {m.unit}
                        </td>
                        <td className="py-2 text-right">
                          {m.calculatedStatus && (
                            <StatusBadge status={m.calculatedStatus} size="sm" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search metrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="optimal">Optimal</option>
            <option value="borderline">Borderline</option>
            <option value="deficient">Deficient</option>
            <option value="excess">Excess</option>
            <option value="empty">No status</option>
          </select>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="category">Sort by category</option>
          <option value="name">Sort by name</option>
          <option value="status">Sort by status</option>
          <option value="date">Sort by date</option>
        </select>

        {/* Expand/Collapse */}
        {sortBy === 'category' && (
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      {(searchQuery || statusFilter !== 'all') && (
        <p className="text-sm text-gray-600">
          Showing {filteredMetrics.length} of {uniqueMetrics.length} metrics
        </p>
      )}

      {/* Metrics Display */}
      {sortBy === 'category' && metricsByCategory ? (
        // Grouped by category
        <div className="space-y-4">
          {categories.map((cat) => {
            const categoryMetrics = metricsByCategory.get(cat.category) || [];
            if (categoryMetrics.length === 0 && (searchQuery || statusFilter !== 'all')) return null;
            if (categoryMetrics.length === 0) return null;

            const isExpanded = expandedCategories.has(cat.category);
            const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
              cat.info.icon
            ] || LucideIcons.Activity;

            return (
              <div key={cat.category} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-lg
                        ${cat.overallStatus === 'optimal' ? 'bg-green-100' : ''}
                        ${cat.overallStatus === 'borderline' ? 'bg-yellow-100' : ''}
                        ${cat.overallStatus === 'deficient' || cat.overallStatus === 'excess' ? 'bg-red-100' : ''}
                        ${cat.overallStatus === 'empty' ? 'bg-gray-100' : ''}
                      `}
                    >
                      <IconComponent
                        className={`
                          w-5 h-5
                          ${cat.overallStatus === 'optimal' ? 'text-green-600' : ''}
                          ${cat.overallStatus === 'borderline' ? 'text-yellow-600' : ''}
                          ${cat.overallStatus === 'deficient' || cat.overallStatus === 'excess' ? 'text-red-600' : ''}
                          ${cat.overallStatus === 'empty' ? 'text-gray-400' : ''}
                        `}
                      />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{cat.info.label}</h3>
                      <p className="text-sm text-gray-500">{categoryMetrics.length} metrics</p>
                    </div>
                  </div>
                  {cat.overallStatus !== 'empty' && (
                    <StatusBadge status={cat.overallStatus} size="sm" />
                  )}
                </button>

                {/* Metrics Grid */}
                {isExpanded && categoryMetrics.length > 0 && (
                  <div className="border-t border-gray-100 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryMetrics.map((metric) => (
                        <div
                          key={metric.id}
                          onClick={() => handleMetricClick(metric)}
                          className={`cursor-pointer transition-all ${
                            selectedMetric?.id === metric.id
                              ? 'ring-2 ring-blue-500 rounded-lg'
                              : 'hover:shadow-md'
                          }`}
                        >
                          <MetricCard metric={metric} compact showTrendIcon />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Flat list (sorted by name, status, or date)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMetrics.map((metric) => (
            <div
              key={metric.id}
              onClick={() => handleMetricClick(metric)}
              className={`cursor-pointer transition-all ${
                selectedMetric?.id === metric.id
                  ? 'ring-2 ring-blue-500 rounded-lg'
                  : 'hover:shadow-md'
              }`}
            >
              <MetricCard metric={metric} compact showTrendIcon />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredMetrics.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No metrics found</h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Import data to get started.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default AllMetricsView;
