import { Link } from "react-router";
import type { Route } from "./+types/index";
import { CATEGORY_INFO, type MetricCategory } from "../../types/metrics";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Metrics - Wellness Tracker" },
    { name: "description", content: "View and manage wellness metrics" },
  ];
}

const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

// Mock data - will be replaced with loader data
const mockCategoryCounts: Record<MetricCategory, number> = {
  vitamins: 12,
  minerals: 8,
  inflammatory: 4,
  metabolic: 15,
  hormones: 10,
  autonomic: 4467,
  bodyComposition: 6,
  lipids: 5,
  hematology: 9,
};

export default function MetricsIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">All Metrics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          7,480 metrics across 9 categories
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category) => {
          const info = CATEGORY_INFO[category];
          const count = mockCategoryCounts[category];
          return (
            <Link
              key={category}
              to={`/metrics/${category}`}
              className="group rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xl ${info.color}`}>{info.icon}</span>
                  <h3 className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {info.label}
                  </h3>
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-500">
                  {count.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {info.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
