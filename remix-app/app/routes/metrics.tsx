import type { Route } from "./+types/metrics";
import { CATEGORY_INFO, type MetricCategory } from "../types/metrics";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Metrics - Wellness Tracker" },
    { name: "description", content: "View and manage wellness metrics" },
  ];
}

export default function Metrics() {
  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Metrics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse metrics by category
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const info = CATEGORY_INFO[category];
          return (
            <div
              key={category}
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${info.color}`}>{info.icon}</span>
                  <div>
                    <h3 className="font-medium">{info.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {info.description}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  0 metrics
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
