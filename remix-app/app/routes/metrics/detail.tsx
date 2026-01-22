import { Link } from "react-router";
import type { Route } from "./+types/detail";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "../../types/metrics";
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

  // TODO: Replace with actual database query
  const metric = getMockMetric(category, metricId);

  if (!metric) {
    throw new Response("Metric not found", { status: 404 });
  }

  // TODO: Get historical values for trend chart
  const history = generateMockHistory(metric, 10);

  return {
    category,
    categoryInfo,
    metric,
    history,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Metric Not Found - Wellness Tracker" }];
  }
  return [
    { title: `${data.metric.name} - Wellness Tracker` },
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
  const { category, categoryInfo, metric, history } = loaderData;
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

      {/* History */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-medium mb-4">History</h2>
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

function getMockMetric(category: MetricCategory, metricId: string): Metric | null {
  const parts = metricId.split("-");
  if (parts.length < 2) return null;

  const index = parseInt(parts[1], 10);
  if (isNaN(index)) return null;

  const names: Record<MetricCategory, string[]> = {
    vitamins: ["Vitamin D", "Vitamin B12", "Folate", "Vitamin B6"],
    minerals: ["Zinc", "Magnesium", "Iron", "Selenium"],
    inflammatory: ["hs-CRP", "Homocysteine", "Ferritin"],
    metabolic: ["Fasting Glucose", "HbA1c", "eGFR", "BUN"],
    hormones: ["Free Testosterone", "TSH", "Cortisol (AM)", "DHEA-S"],
    autonomic: ["HRV (RMSSD)", "Resting Heart Rate", "Recovery Score", "Sleep Score"],
    bodyComposition: ["Body Fat", "Lean Mass", "BMI", "Visceral Fat"],
    lipids: ["Total Cholesterol", "LDL-C", "HDL-C", "Triglycerides"],
    hematology: ["Hemoglobin", "Hematocrit", "WBC", "Platelets"],
  };

  const units: Record<MetricCategory, string[]> = {
    vitamins: ["ng/mL", "pg/mL", "ng/mL", "μg/L"],
    minerals: ["μg/dL", "mg/dL", "μg/dL", "μg/L"],
    inflammatory: ["mg/L", "μmol/L", "ng/mL"],
    metabolic: ["mg/dL", "%", "mL/min", "mg/dL"],
    hormones: ["pg/mL", "mIU/L", "μg/dL", "μg/dL"],
    autonomic: ["ms", "bpm", "%", "%"],
    bodyComposition: ["%", "kg", "kg/m²", "cm²"],
    lipids: ["mg/dL", "mg/dL", "mg/dL", "mg/dL"],
    hematology: ["g/dL", "%", "K/uL", "K/uL"],
  };

  const categoryNames = names[category] || [];
  const categoryUnits = units[category] || [];

  if (index >= categoryNames.length) return null;

  return {
    id: metricId,
    name: categoryNames[index],
    value: 50 + Math.random() * 50,
    unit: categoryUnits[index],
    category: category as any,
    subcategory: "default" as any,
    timestamp: new Date().toISOString(),
    improvement: "target range",
    referenceRange: { min: 30, max: 100 },
    optimalRange: { min: 40, max: 80 },
    source: "manual",
    syncStatus: "local",
    syncVersion: 1,
  };
}

function generateMockHistory(metric: Metric, count: number): Array<{ timestamp: string; value: number }> {
  const history = [];
  const baseValue = metric.value;

  for (let i = 0; i < count; i++) {
    const daysAgo = i * 30;
    const variance = (Math.random() - 0.5) * 20;
    history.push({
      timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      value: Number((baseValue + variance).toFixed(2)),
    });
  }

  return history;
}
