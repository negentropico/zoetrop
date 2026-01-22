import { Link } from "react-router";
import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Import Data - Wellness Tracker" },
    { name: "description", content: "Import wellness data from various sources" },
  ];
}

const importSources = [
  {
    id: "whoop",
    name: "WHOOP",
    description: "Import HRV, recovery, sleep, and strain data from WHOOP Analyzer JSON exports",
    icon: "heart-pulse",
    color: "text-pink-500",
    href: "/import/whoop",
    formats: ["JSON (whoop_analysis_report.json)"],
    metrics: ["HRV (RMSSD)", "Recovery Score", "Resting Heart Rate", "Sleep Performance", "TDEE"],
  },
  {
    id: "vault",
    name: "Obsidian Vault",
    description: "Import bloodwork and protocol data from vault markdown files",
    icon: "file-text",
    color: "text-purple-500",
    href: "/import/vault",
    formats: ["Markdown (.md)", "Tables"],
    metrics: ["Bloodwork results", "Supplement protocols", "Historical data"],
  },
  {
    id: "csv",
    name: "CSV Import",
    description: "Import data from CSV files with custom column mapping",
    icon: "table",
    color: "text-blue-500",
    href: "/import/csv",
    formats: ["CSV", "TSV"],
    metrics: ["Custom metrics"],
    disabled: true,
  },
];

export default function ImportIndex() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {importSources.map((source) => (
          <div
            key={source.id}
            className={`rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 ${
              source.disabled ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`text-2xl ${source.color}`}>{source.icon}</span>
                <div>
                  <h3 className="font-medium">{source.name}</h3>
                  {source.disabled && (
                    <span className="text-xs text-gray-500">Coming soon</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {source.description}
            </p>
            <div className="space-y-2 mb-4">
              <div className="text-xs text-gray-500">
                <span className="font-medium">Formats:</span> {source.formats.join(", ")}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium">Metrics:</span> {source.metrics.join(", ")}
              </div>
            </div>
            {!source.disabled && (
              <Link
                to={source.href}
                className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Import from {source.name}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Recent imports */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-medium mb-4">Recent Imports</h2>
        <div className="text-sm text-gray-500 text-center py-8">
          No imports yet. Choose a data source above to get started.
        </div>
      </div>
    </div>
  );
}
