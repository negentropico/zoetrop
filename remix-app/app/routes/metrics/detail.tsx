import { Link } from "react-router";
import type { Route } from "./+types/detail";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "../../types/metrics";
import { getRealMetrics, getProjections, getMetricTargets, MILESTONES } from "../../lib/real-data";
import { getMetricStatus } from "~/lib/metrics";
import { TrendChart } from "../../components/TrendChart";
import { format, parseISO } from "date-fns";

function isValidCategory(category: string): category is MetricCategory {
  return category in CATEGORY_INFO;
}

export function loader({ params }: Route.LoaderArgs) {
  const { category, metricId } = params;

  if (!category || !isValidCategory(category)) {
    throw new Response("Category not found", { status: 404 });
  }

  if (!metricId) {
    throw new Response("Metric not found", { status: 404 });
  }

  const categoryInfo = CATEGORY_INFO[category];

  // Get all real metrics and find by ID
  const allMetrics = getRealMetrics();
  const metric = allMetrics.find((m) => m.id === metricId);

  if (!metric) {
    throw new Response("Metric not found", { status: 404 });
  }

  // Get historical values for this metric (all entries with same name)
  const history = allMetrics
    .filter((m) => m.name === metric.name)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((m) => ({ timestamp: m.timestamp, value: m.value }));

  // Get projections (Q1/Q2 targets) for this metric
  const projections = getProjections(metric.name);
  const targets = getMetricTargets(metric.name);

  return {
    category,
    categoryInfo,
    metric,
    history,
    projections,
    targets,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Metric Not Found - Zoetrop" }];
  }
  return [
    { title: `${data.metric.name} - Zoetrop` },
    { name: "description", content: `${data.metric.name} tracking data` },
  ];
}

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

function RangeIndicator({ metric }: { metric: Metric }) {
  const { value, referenceRange, optimalRange } = metric;

  if (!referenceRange) return null;

  const range = referenceRange.max - referenceRange.min;
  const padding = range * 0.1;
  const minDisplay = referenceRange.min - padding;
  const maxDisplay = referenceRange.max + padding;
  const totalRange = maxDisplay - minDisplay;

  const valuePercent = ((value - minDisplay) / totalRange) * 100;
  const refMinPercent = ((referenceRange.min - minDisplay) / totalRange) * 100;
  const refMaxPercent = ((referenceRange.max - minDisplay) / totalRange) * 100;

  let optMinPercent = 0;
  let optMaxPercent = 100;
  if (optimalRange) {
    optMinPercent = ((optimalRange.min - minDisplay) / totalRange) * 100;
    optMaxPercent = ((optimalRange.max - minDisplay) / totalRange) * 100;
  }

  return (
    <div className="space-y-2">
      <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        {/* Reference range */}
        <div
          className="absolute top-0 bottom-0 bg-yellow-200 dark:bg-yellow-900/30"
          style={{
            left: `${refMinPercent}%`,
            width: `${refMaxPercent - refMinPercent}%`,
          }}
        />
        {/* Optimal range */}
        {optimalRange && (
          <div
            className="absolute top-0 bottom-0 bg-green-200 dark:bg-green-900/30"
            style={{
              left: `${optMinPercent}%`,
              width: `${optMaxPercent - optMinPercent}%`,
            }}
          />
        )}
        {/* Value marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-gray-900 dark:bg-white"
          style={{ left: `${Math.max(0, Math.min(100, valuePercent))}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{referenceRange.min} {metric.unit}</span>
        <span>{referenceRange.max} {metric.unit}</span>
      </div>
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-200 dark:bg-green-900/30 rounded" />
          Optimal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-200 dark:bg-yellow-900/30 rounded" />
          Reference
        </span>
      </div>
    </div>
  );
}

export default function MetricDetail({ loaderData }: Route.ComponentProps) {
  const { category, categoryInfo, metric, history, projections, targets } = loaderData;
  const status = getMetricStatus(metric);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/metrics" className="hover:text-gray-900 dark:hover:text-gray-100">
          Metrics
        </Link>
        <span>/</span>
        <Link
          to={`/metrics/${category}`}
          className="hover:text-gray-900 dark:hover:text-gray-100"
        >
          {categoryInfo.label}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{metric.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">{metric.name}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Last updated: {format(parseISO(metric.timestamp), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{metric.value.toFixed(2)}</div>
          <div className="text-gray-500 dark:text-gray-500">{metric.unit}</div>
        </div>
      </div>

      {/* Range visualization */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-medium mb-4">Range Status</h2>
        <RangeIndicator metric={metric} />
      </div>

      {/* Trend Chart with Projections */}
      {history.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">
              {history.length > 1 ? "Trend Over Time" : "Current vs Target"}
            </h2>
            {projections.length > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                With 2026 Targets
              </span>
            )}
          </div>
          <TrendChart
            data={history}
            projections={projections}
            unit={metric.unit}
            optimalRange={metric.optimalRange}
            referenceRange={metric.referenceRange}
            height={280}
          />
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-blue-500" />
              Actual
            </span>
            {projections.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-purple-500" style={{ borderTop: "2px dashed #a855f7" }} />
                Target
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-green-500 opacity-50" />
              Optimal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-yellow-500 opacity-50" />
              Reference
            </span>
          </div>
        </div>
      )}

      {/* 2026 Targets */}
      {targets && (
        <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
          <h2 className="font-medium mb-3 text-purple-900 dark:text-purple-100">2026 Targets</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-purple-600 dark:text-purple-400 text-xs mb-1">Q1 Target (Apr)</div>
              <div className="font-semibold text-purple-900 dark:text-purple-100">
                {targets.q1Target} {targets.unit}
              </div>
            </div>
            <div>
              <div className="text-purple-600 dark:text-purple-400 text-xs mb-1">Q2 Stretch (Jul)</div>
              <div className="font-semibold text-purple-900 dark:text-purple-100">
                {targets.q2Stretch} {targets.unit}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
            Direction: {targets.direction === "higher" ? "Higher is better" : targets.direction === "lower" ? "Lower is better" : "Target range"}
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-medium mb-4">Measurements ({history.length})</h2>
        <div className="space-y-2">
          {history.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {format(parseISO(entry.timestamp), "MMM d, yyyy")}
              </span>
              <span className="font-medium">
                {entry.value.toFixed(2)} {metric.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-medium mb-4">Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-500">Source</dt>
            <dd className="font-medium capitalize">{metric.source}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-500">Improvement Direction</dt>
            <dd className="font-medium capitalize">{metric.improvement}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-500">Sync Status</dt>
            <dd className="font-medium capitalize">{metric.syncStatus}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-500">Version</dt>
            <dd className="font-medium">{metric.syncVersion}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

