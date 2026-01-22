import type { Route } from "./+types/home";
import { CATEGORY_INFO, type MetricCategory } from "../types/metrics";
import { CESSATION_PHASES } from "../types/protocol";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Wellness Tracker" },
    { name: "description", content: "Comprehensive wellness tracking dashboard" },
  ];
}

function CategoryCard({ category }: { category: MetricCategory }) {
  const info = CATEGORY_INFO[category];
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-lg ${info.color}`}>{info.icon}</span>
        <h3 className="font-medium">{info.label}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {info.description}
      </p>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
        No data yet
      </div>
    </div>
  );
}

function CessationProgress() {
  // Placeholder - will calculate from cessation log
  const currentDay = 0;
  const targetDay = 150;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <h3 className="font-medium mb-3">Cessation Protocol</h3>
      <div className="space-y-2">
        {CESSATION_PHASES.map((phase) => (
          <div key={phase.phase} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {phase.label}
            </span>
            <span className="text-gray-500 dark:text-gray-500">
              Days {phase.dayRange.start}-{phase.dayRange.end}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Day {currentDay}</span>
          <span>Target: {targetDay} days</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${(currentDay / targetDay) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive wellness tracking across 9 metric categories
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <CategoryCard key={category} category={category} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CessationProgress />
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="font-medium mb-3">Protocol Status</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Protocol version tracking not configured
          </p>
          <div className="mt-3 text-xs text-gray-500">
            Add protocol data to track 601 → 602 → 603 evolution
          </div>
        </div>
      </div>
    </div>
  );
}
