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
  const byCategory = (Object.keys(CATEGORY_INFO) as MetricCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = metrics
        .filter((m) => m.category === cat)
        .sort((a, b) => a.name.localeCompare(b.name));
      return acc;
    },
    {} as Record<MetricCategory, Metric[]>
  );

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

  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`} />;
}

function MiniRangeBar({ metric }: { metric: Metric }) {
  const { value, referenceRange, optimalRange } = metric;

  if (!referenceRange) return null;

  // Normalize to 0-100% scale where reference range spans ~70% of bar
  // This ensures consistent visual representation across different metrics
  const refRange = referenceRange.max - referenceRange.min;
  const padding = refRange * 0.2;
  const displayMin = referenceRange.min - padding;
  const displayMax = referenceRange.max + padding;
  const displayRange = displayMax - displayMin;

  // Clamp value to display range for positioning
  const clampedValue = Math.max(displayMin, Math.min(displayMax, value));

  const toPercent = (v: number) => ((v - displayMin) / displayRange) * 100;

  const refMinPct = toPercent(referenceRange.min);
  const refMaxPct = toPercent(referenceRange.max);
  const valuePct = toPercent(clampedValue);

  let optMinPct = refMinPct;
  let optMaxPct = refMaxPct;
  if (optimalRange) {
    optMinPct = toPercent(optimalRange.min);
    optMaxPct = toPercent(optimalRange.max);
  }

  // Determine if value is outside display range
  const isOutOfRange = value < displayMin || value > displayMax;

  return (
    <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      {/* Reference range (yellow) */}
      <div
        className="absolute top-0 bottom-0 bg-yellow-300/60 dark:bg-yellow-600/40"
        style={{
          left: `${refMinPct}%`,
          width: `${refMaxPct - refMinPct}%`,
        }}
      />
      {/* Optimal range (green) */}
      {optimalRange && (
        <div
          className="absolute top-0 bottom-0 bg-green-400 dark:bg-green-500"
          style={{
            left: `${optMinPct}%`,
            width: `${optMaxPct - optMinPct}%`,
          }}
        />
      )}
      {/* Value marker */}
      <div
        className={`absolute top-0 bottom-0 w-0.5 ${
          isOutOfRange ? "bg-red-500" : "bg-gray-800 dark:bg-white"
        }`}
        style={{ left: `${valuePct}%` }}
      />
    </div>
  );
}

function MetricRow({ metric }: { metric: Metric }) {
  const status = getMetricStatus(metric);

  return (
    <Link
      to={`/metrics/${metric.category}/${metric.category}-${metric.id.split("-")[1]}`}
      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
    >
      <StatusDot status={status} />
      <span className="font-medium text-sm flex-1 min-w-0 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
        {metric.name}
      </span>
      <div className="w-24 flex-shrink-0">
        <MiniRangeBar metric={metric} />
      </div>
      <div className="w-20 text-right flex-shrink-0">
        <span className="font-mono text-sm font-medium">{metric.value.toFixed(1)}</span>
        <span className="text-xs text-gray-500 ml-1">{metric.unit}</span>
      </div>
    </Link>
  );
}

function CategorySection({
  category,
  metrics,
}: {
  category: MetricCategory;
  metrics: Metric[];
}) {
  const info = CATEGORY_INFO[category];

  if (metrics.length === 0) return null;

  // Calculate status summary
  const statusCounts = metrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Category header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.icon}</span>
          <h2 className="font-semibold">{info.label}</h2>
          <span className="text-sm text-gray-500">({metrics.length})</span>
        </div>
        <div className="flex gap-1">
          {statusCounts.optimal > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {statusCounts.optimal}
            </span>
          )}
          {statusCounts.borderline > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              {statusCounts.borderline}
            </span>
          )}
          {statusCounts.deficient > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {statusCounts.deficient}
            </span>
          )}
          {statusCounts.excess > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {statusCounts.excess}
            </span>
          )}
        </div>
      </div>
      {/* Metrics list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {metrics.map((metric) => (
          <MetricRow key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}

export default function MetricsIndex({ loaderData }: Route.ComponentProps) {
  const { metrics, byCategory } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const filterStatus = searchParams.get("status") as MetricStatus | null;

  // Status counts for all metrics
  const statusCounts = metrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  // Filter by status if selected
  const filteredByCategory = filterStatus
    ? (Object.keys(byCategory) as MetricCategory[]).reduce(
        (acc, cat) => {
          acc[cat] = byCategory[cat].filter((m) => getMetricStatus(m) === filterStatus);
          return acc;
        },
        {} as Record<MetricCategory, Metric[]>
      )
    : byCategory;

  const filteredCount = filterStatus
    ? Object.values(filteredByCategory).reduce((sum, arr) => sum + arr.length, 0)
    : metrics.length;

  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Metrics</h1>
          <p className="text-sm text-gray-500">
            {filterStatus ? `${filteredCount} ${filterStatus}` : `${metrics.length} metrics`} across{" "}
            {categories.length} categories
          </p>
        </div>
      </div>

      {/* Status filter bar */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
        <span className="text-sm text-gray-500">Filter:</span>
        <button
          onClick={() => {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("status");
            setSearchParams(newParams);
          }}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
            !filterStatus
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          All ({metrics.length})
        </button>
        {(["optimal", "borderline", "deficient", "excess"] as MetricStatus[]).map((status) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const isActive = filterStatus === status;
          const baseColors: Record<MetricStatus, string> = {
            optimal: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            borderline: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            deficient: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            excess: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
          };
          const activeColors: Record<MetricStatus, string> = {
            optimal: "bg-green-500 text-white",
            borderline: "bg-yellow-500 text-white",
            deficient: "bg-red-500 text-white",
            excess: "bg-orange-500 text-white",
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
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                isActive ? activeColors[status] : baseColors[status]
              }`}
            >
              {count} {status}
            </button>
          );
        })}
      </div>

      {/* Category sections */}
      <div className="space-y-4">
        {categories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            metrics={filteredByCategory[category] || []}
          />
        ))}
      </div>

      {filteredCount === 0 && (
        <div className="text-center py-12 text-gray-500">
          No metrics match the current filter.
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
        <span className="font-medium">Range bar:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-1.5 bg-green-400 dark:bg-green-500 rounded-full" />
          Optimal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-1.5 bg-yellow-300/60 dark:bg-yellow-600/40 rounded-full" />
          Reference
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-gray-800 dark:bg-white rounded-sm" />
          Value
        </span>
      </div>
    </div>
  );
}
