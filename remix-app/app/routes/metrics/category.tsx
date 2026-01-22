import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/category";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "../../types/metrics";
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

  // TODO: Replace with actual database query
  // For now, return mock data based on category
  const mockMetrics: Metric[] = generateMockMetrics(category, 10);

  return {
    category,
    categoryInfo,
    metrics: mockMetrics,
    totalCount: mockMetrics.length,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Category Not Found - Wellness Tracker" }];
  }
  return [
    { title: `${data.categoryInfo.label} - Wellness Tracker` },
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

export default function CategoryView({ loaderData }: Route.ComponentProps) {
  const { category, categoryInfo, metrics, totalCount } = loaderData;
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");

  // Filter metrics by status if filter is applied
  const filteredMetrics = statusFilter
    ? metrics.filter((m) => getMetricStatus(m) === statusFilter)
    : metrics;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-2xl ${categoryInfo.color}`}>{categoryInfo.icon}</span>
          <h1 className="text-2xl font-bold tracking-tight">{categoryInfo.label}</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {categoryInfo.description} - {totalCount} metrics
        </p>
      </div>

      <FilterControls />

      <div className="space-y-2">
        {filteredMetrics.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-500">
            No metrics found {statusFilter ? `with status "${statusFilter}"` : ""}
          </div>
        ) : (
          filteredMetrics.map((metric) => {
            const status = getMetricStatus(metric);
            return (
              <Link
                key={metric.id}
                to={`/metrics/${category}/${metric.id}`}
                className="block rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{metric.name}</h3>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {format(parseISO(metric.timestamp), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-semibold">
                      {metric.value.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500">
                      {metric.unit}
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

// Helper to determine metric status
function getMetricStatus(metric: Metric): MetricStatus {
  const { value, optimalRange, referenceRange, improvement } = metric;

  // Check optimal range first
  if (optimalRange) {
    if (value >= optimalRange.min && value <= optimalRange.max) {
      return "optimal";
    }
  }

  // Check reference range
  if (referenceRange) {
    if (value < referenceRange.min) {
      return "deficient";
    }
    if (value > referenceRange.max) {
      return "excess";
    }
    // Within reference but outside optimal
    return "borderline";
  }

  // No ranges defined - default based on improvement direction
  return "optimal";
}

// Mock data generator
function generateMockMetrics(category: MetricCategory, count: number): Metric[] {
  const categoryMetrics: Record<MetricCategory, Array<{ name: string; unit: string; min: number; max: number }>> = {
    vitamins: [
      { name: "Vitamin D", unit: "ng/mL", min: 30, max: 100 },
      { name: "Vitamin B12", unit: "pg/mL", min: 200, max: 900 },
      { name: "Folate", unit: "ng/mL", min: 3, max: 20 },
      { name: "Vitamin B6", unit: "μg/L", min: 5, max: 50 },
    ],
    minerals: [
      { name: "Zinc", unit: "μg/dL", min: 60, max: 120 },
      { name: "Magnesium", unit: "mg/dL", min: 1.7, max: 2.2 },
      { name: "Iron", unit: "μg/dL", min: 60, max: 170 },
      { name: "Selenium", unit: "μg/L", min: 70, max: 150 },
    ],
    inflammatory: [
      { name: "hs-CRP", unit: "mg/L", min: 0, max: 3 },
      { name: "Homocysteine", unit: "μmol/L", min: 5, max: 15 },
      { name: "Ferritin", unit: "ng/mL", min: 30, max: 400 },
    ],
    metabolic: [
      { name: "Fasting Glucose", unit: "mg/dL", min: 70, max: 100 },
      { name: "HbA1c", unit: "%", min: 4, max: 5.7 },
      { name: "eGFR", unit: "mL/min", min: 90, max: 120 },
      { name: "BUN", unit: "mg/dL", min: 7, max: 20 },
    ],
    hormones: [
      { name: "Free Testosterone", unit: "pg/mL", min: 5, max: 21 },
      { name: "TSH", unit: "mIU/L", min: 0.5, max: 4.5 },
      { name: "Cortisol (AM)", unit: "μg/dL", min: 6, max: 23 },
      { name: "DHEA-S", unit: "μg/dL", min: 100, max: 500 },
    ],
    autonomic: [
      { name: "HRV (RMSSD)", unit: "ms", min: 20, max: 100 },
      { name: "Resting Heart Rate", unit: "bpm", min: 50, max: 70 },
      { name: "Recovery Score", unit: "%", min: 0, max: 100 },
      { name: "Sleep Score", unit: "%", min: 0, max: 100 },
    ],
    bodyComposition: [
      { name: "Body Fat", unit: "%", min: 10, max: 25 },
      { name: "Lean Mass", unit: "kg", min: 50, max: 80 },
      { name: "BMI", unit: "kg/m²", min: 18.5, max: 25 },
      { name: "Visceral Fat", unit: "cm²", min: 0, max: 100 },
    ],
    lipids: [
      { name: "Total Cholesterol", unit: "mg/dL", min: 125, max: 200 },
      { name: "LDL-C", unit: "mg/dL", min: 0, max: 100 },
      { name: "HDL-C", unit: "mg/dL", min: 40, max: 60 },
      { name: "Triglycerides", unit: "mg/dL", min: 0, max: 150 },
    ],
    hematology: [
      { name: "Hemoglobin", unit: "g/dL", min: 13.5, max: 17.5 },
      { name: "Hematocrit", unit: "%", min: 38, max: 50 },
      { name: "WBC", unit: "K/uL", min: 4.5, max: 11 },
      { name: "Platelets", unit: "K/uL", min: 150, max: 400 },
    ],
  };

  const templates = categoryMetrics[category] || [];
  const metrics: Metric[] = [];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const template = templates[i];
    const value = template.min + Math.random() * (template.max - template.min);

    metrics.push({
      id: `${category}-${i}`,
      name: template.name,
      value: Number(value.toFixed(2)),
      unit: template.unit,
      category: category as any,
      subcategory: "default" as any,
      timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      improvement: "target range",
      referenceRange: { min: template.min, max: template.max },
      optimalRange: { min: template.min * 1.1, max: template.max * 0.9 },
      source: "manual",
      syncStatus: "local",
      syncVersion: 1,
    });
  }

  return metrics;
}
