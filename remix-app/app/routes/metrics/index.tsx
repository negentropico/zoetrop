import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/index";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "../../types/metrics";
import { generateSeedMetrics } from "../../lib/seed-data";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Metrics - Wellness Tracker" },
    { name: "description", content: "View and manage wellness metrics" },
  ];
}

export function loader() {
  const allMetrics = generateSeedMetrics();

  // Get latest value for each unique metric name
  const latestByName = new Map<string, Metric>();
  allMetrics.forEach((m) => {
    const existing = latestByName.get(m.name);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latestByName.set(m.name, m);
    }
  });

  const metrics = Array.from(latestByName.values());

  // Group by category
  const byCategory = metrics.reduce((acc, m) => {
    if (!acc[m.category]) {
      acc[m.category] = [];
    }
    acc[m.category].push(m);
    return acc;
  }, {} as Record<MetricCategory, Metric[]>);

  return { metrics, byCategory };
}

function getMetricStatus(metric: Metric): MetricStatus {
  const { value, optimalRange, referenceRange } = metric;

  if (optimalRange) {
    if (value >= optimalRange.min && value <= optimalRange.max) {
      return "optimal";
    }
  }

  if (referenceRange) {
    if (value < referenceRange.min) {
      return "deficient";
    }
    if (value > referenceRange.max) {
      return "excess";
    }
    return "borderline";
  }

  return "optimal";
}

function StatusDot({ status }: { status: MetricStatus }) {
  const colors: Record<MetricStatus, string> = {
    optimal: "bg-green-500",
    borderline: "bg-yellow-500",
    deficient: "bg-red-500",
    excess: "bg-orange-500",
  };

  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}

function MiniRangeBar({ metric }: { metric: Metric }) {
  const { value, referenceRange, optimalRange } = metric;

  if (!referenceRange) return null;

  const range = referenceRange.max - referenceRange.min;
  const padding = range * 0.15;
  const minDisplay = referenceRange.min - padding;
  const maxDisplay = referenceRange.max + padding;
  const totalRange = maxDisplay - minDisplay;

  const valuePercent = ((value - minDisplay) / totalRange) * 100;
  const refMinPercent = ((referenceRange.min - minDisplay) / totalRange) * 100;
  const refMaxPercent = ((referenceRange.max - minDisplay) / totalRange) * 100;

  let optMinPercent = refMinPercent;
  let optMaxPercent = refMaxPercent;
  if (optimalRange) {
    optMinPercent = ((optimalRange.min - minDisplay) / totalRange) * 100;
    optMaxPercent = ((optimalRange.max - minDisplay) / totalRange) * 100;
  }

  return (
    <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      {/* Reference range */}
      <div
        className="absolute top-0 bottom-0 bg-yellow-300 dark:bg-yellow-700"
        style={{
          left: `${refMinPercent}%`,
          width: `${refMaxPercent - refMinPercent}%`,
        }}
      />
      {/* Optimal range */}
      {optimalRange && (
        <div
          className="absolute top-0 bottom-0 bg-green-400 dark:bg-green-600"
          style={{
            left: `${optMinPercent}%`,
            width: `${optMaxPercent - optMinPercent}%`,
          }}
        />
      )}
      {/* Value marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-gray-900 dark:bg-white"
        style={{ left: `${Math.max(0, Math.min(100, valuePercent))}%` }}
      />
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const status = getMetricStatus(metric);

  return (
    <Link
      to={`/metrics/${metric.category}/${metric.category}-${metric.id.split("-")[1]}`}
      className="block p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={status} />
          <span className="font-medium text-sm truncate">{metric.name}</span>
        </div>
        <div className="flex items-baseline gap-1 ml-2 flex-shrink-0">
          <span className="font-bold text-sm">{metric.value.toFixed(1)}</span>
          <span className="text-xs text-gray-500">{metric.unit}</span>
        </div>
      </div>
      <MiniRangeBar metric={metric} />
    </Link>
  );
}

export default function MetricsIndex({ loaderData }: Route.ComponentProps) {
  const { metrics, byCategory } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const filterCategory = searchParams.get("category") as MetricCategory | null;
  const filterStatus = searchParams.get("status") as MetricStatus | null;

  // Filter metrics
  let filtered = [...metrics];
  if (filterCategory) {
    filtered = filtered.filter((m) => m.category === filterCategory);
  }
  if (filterStatus) {
    filtered = filtered.filter((m) => getMetricStatus(m) === filterStatus);
  }

  // Sort by category then name
  filtered.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

  // Status counts
  const statusCounts = metrics.reduce((acc, m) => {
    const status = getMetricStatus(m);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<MetricStatus, number>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Metrics</h1>
          <p className="text-sm text-gray-500">
            {filtered.length} of {metrics.length} metrics
          </p>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status filters */}
        <div className="flex gap-1">
          {(["optimal", "borderline", "deficient", "excess"] as MetricStatus[]).map(
            (status) => {
              const count = statusCounts[status] || 0;
              if (count === 0) return null;
              const isActive = filterStatus === status;
              const colors: Record<MetricStatus, string> = {
                optimal: isActive
                  ? "bg-green-500 text-white"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                borderline: isActive
                  ? "bg-yellow-500 text-white"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                deficient: isActive
                  ? "bg-red-500 text-white"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                excess: isActive
                  ? "bg-orange-500 text-white"
                  : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
              };
              return (
                <button
                  key={status}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    if (isActive) {
                      newParams.delete("status");
                    } else {
                      newParams.set("status", status);
                    }
                    setSearchParams(newParams);
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}
                >
                  {count} {status}
                </button>
              );
            }
          )}
        </div>

        {/* Category filter */}
        <select
          value={filterCategory || ""}
          onChange={(e) => {
            const newParams = new URLSearchParams(searchParams);
            if (e.target.value) {
              newParams.set("category", e.target.value);
            } else {
              newParams.delete("category");
            }
            setSearchParams(newParams);
          }}
          className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_INFO[cat].icon} {CATEGORY_INFO[cat].label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {(filterCategory || filterStatus) && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {filtered.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No metrics match the current filters.
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-1.5 bg-green-400 dark:bg-green-600 rounded-full" />
          Optimal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-1.5 bg-yellow-300 dark:bg-yellow-700 rounded-full" />
          Reference
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1 h-3 bg-gray-900 dark:bg-white rounded-sm" />
          Current value
        </span>
      </div>
    </div>
  );
}
