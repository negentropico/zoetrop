import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/category";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "../../types/metrics";
import { getRealMetrics, getLatestRealMetrics, getMetricTargets } from "../../lib/real-data";
import { getMetricStatus } from "~/lib/metrics";
import { TrendSparkline, TrendChart } from "../../components/ui/TrendChart";
import { format, parseISO } from "date-fns";

// Validate category param
function isValidCategory(category: string): category is MetricCategory {
  return category in CATEGORY_INFO;
}

export function loader({ params }: Route.LoaderArgs) {
  const { category } = params;

  if (!category || !isValidCategory(category)) {
    throw new Response("Category not found", { status: 404 });
  }

  const categoryInfo = CATEGORY_INFO[category];

  // Get all real metrics for this category
  const allMetrics = getRealMetrics();
  const categoryMetrics = allMetrics.filter((m) => m.category === category);

  // Get latest value for each unique metric name
  const latestByName = new Map<string, Metric>();
  categoryMetrics.forEach((m) => {
    const existing = latestByName.get(m.name);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latestByName.set(m.name, m);
    }
  });
  const latestMetrics = Array.from(latestByName.values());

  // Build history for each metric (all data points with same name)
  const historyByName = new Map<string, Array<{ timestamp: string; value: number }>>();
  categoryMetrics.forEach((m) => {
    const history = historyByName.get(m.name) || [];
    history.push({ timestamp: m.timestamp, value: m.value });
    historyByName.set(m.name, history);
  });

  // Convert to array with history and projection info attached
  const metricsWithHistory = latestMetrics.map((m) => ({
    ...m,
    history: historyByName.get(m.name) || [],
    hasProjections: !!getMetricTargets(m.name),
  }));

  return {
    category,
    categoryInfo,
    metrics: metricsWithHistory,
    totalCount: metricsWithHistory.length,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Category Not Found - Zoetrop" }];
  }
  return [
    { title: `${data.categoryInfo.label} - Zoetrop` },
    { name: "description", content: data.categoryInfo.description },
  ];
}

// Status badge component
function StatusBadge({ status }: { status: MetricStatus }) {
  const styles: Record<MetricStatus, string> = {
    optimal: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    borderline: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    deficient: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    excess: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

// Filter controls
function FilterControls() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";

  const statuses: Array<{ value: string; label: string }> = [
    { value: "all", label: "All" },
    { value: "optimal", label: "Optimal" },
    { value: "borderline", label: "Borderline" },
    { value: "deficient", label: "Deficient" },
    { value: "excess", label: "Excess" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => {
            const newParams = new URLSearchParams(searchParams);
            if (value === "all") {
              newParams.delete("status");
            } else {
              newParams.set("status", value);
            }
            setSearchParams(newParams);
          }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            statusFilter === value || (value === "all" && !searchParams.has("status"))
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Calculate trend percentage
function getTrendInfo(history: Array<{ timestamp: string; value: number }>) {
  if (history.length < 2) return null;

  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const change = ((last - first) / first) * 100;

  return {
    change,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
}

type MetricWithHistory = Metric & { history: Array<{ timestamp: string; value: number }>; hasProjections: boolean };

export default function CategoryView({ loaderData }: Route.ComponentProps) {
  const { category, categoryInfo, metrics, totalCount } = loaderData;
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");

  // Filter metrics by status if filter is applied
  const filteredMetrics = statusFilter
    ? metrics.filter((m: MetricWithHistory) => getMetricStatus(m) === statusFilter)
    : metrics;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{categoryInfo.icon}</span>
          <h1 className="text-2xl font-bold tracking-tight">{categoryInfo.label}</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {categoryInfo.description} - {totalCount} metrics tracked
        </p>
      </div>

      <FilterControls />

      <div className="space-y-3">
        {filteredMetrics.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-500">
            No metrics found {statusFilter ? `with status "${statusFilter}"` : ""}
          </div>
        ) : (
          filteredMetrics.map((metric: MetricWithHistory) => {
            const status = getMetricStatus(metric);
            const trend = getTrendInfo(metric.history);

            return (
              <Link
                key={metric.id}
                to={`/metrics/${category}/${metric.id}`}
                className="block rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{metric.name}</h3>
                      <StatusBadge status={status} />
                      {(metric.history.length > 1 || metric.hasProjections) && (
                        <span
                          className="flex-shrink-0 text-blue-500 dark:text-blue-400"
                          title={`${metric.history.length} data points${metric.hasProjections ? " + projections" : ""}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {format(parseISO(metric.timestamp), "MMM d, yyyy")}
                      {metric.history.length > 1 && (
                        <span className="ml-2 text-gray-400">
                          ({metric.history.length} measurements)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Trend sparkline */}
                  {metric.history.length > 1 && (
                    <div className="flex-shrink-0">
                      <TrendSparkline data={metric.history} width={80} height={32} />
                    </div>
                  )}

                  {/* Current value and trend */}
                  <div className="text-right flex-shrink-0 w-28">
                    <div className="text-lg font-semibold">{metric.value.toFixed(1)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 flex items-center justify-end gap-1">
                      {metric.unit}
                      {trend && (
                        <span
                          className={`text-xs ${
                            trend.direction === "up"
                              ? "text-green-600"
                              : trend.direction === "down"
                              ? "text-red-600"
                              : "text-gray-400"
                          }`}
                        >
                          {trend.direction === "up" ? "+" : ""}
                          {trend.change.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
