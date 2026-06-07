import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/whoop";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Import WHOOP - Zoetrop" },
    { name: "description", content: "Import WHOOP analysis data" },
  ];
}

// Action to handle file upload and parsing
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const jsonData = formData.get("jsonData") as string | null;

  if (!file && !jsonData) {
    return { error: "No file or data provided", success: false };
  }

  try {
    let data: WhoopAnalysisReport;

    if (jsonData) {
      data = JSON.parse(jsonData);
    } else if (file) {
      const text = await file.text();
      data = JSON.parse(text);
    } else {
      return { error: "No valid data", success: false };
    }

    // Parse WHOOP data
    const metrics = parseWhoopReport(data);

    return {
      success: true,
      metrics,
      summary: {
        totalMetrics: metrics.length,
        dateRange: {
          start: metrics[metrics.length - 1]?.timestamp,
          end: metrics[0]?.timestamp,
        },
        categories: {
          hrv: metrics.filter((m) => m.name.includes("HRV")).length,
          recovery: metrics.filter((m) => m.name.includes("Recovery")).length,
          sleep: metrics.filter((m) => m.name.includes("Sleep")).length,
          rhr: metrics.filter((m) => m.name.includes("Heart Rate")).length,
        },
      },
    };
  } catch (error) {
    return {
      error: `Failed to parse WHOOP data: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

// WHOOP report type
interface WhoopAnalysisReport {
  metadata?: {
    analysis_date?: string;
    date_range?: { start: string; end: string };
  };
  recovery_summary?: {
    average_recovery?: number;
    average_hrv?: number;
    average_rhr?: number;
  };
  sleep_analysis?: {
    average_sleep_performance?: number;
    average_hours?: number;
  };
  strain_analysis?: {
    average_strain?: number;
    average_calories?: number;
  };
  daily_metrics?: Array<{
    date: string;
    recovery_score?: number;
    hrv_rmssd?: number;
    resting_heart_rate?: number;
    sleep_performance?: number;
    strain?: number;
    calories?: number;
  }>;
}

// Parse WHOOP report into metrics
function parseWhoopReport(data: WhoopAnalysisReport) {
  const metrics: Array<{
    id: string;
    name: string;
    value: number;
    unit: string;
    timestamp: string;
    category: string;
  }> = [];

  // Parse daily metrics if available
  if (data.daily_metrics) {
    data.daily_metrics.forEach((day, index) => {
      const timestamp = day.date || new Date().toISOString();

      if (day.hrv_rmssd !== undefined) {
        metrics.push({
          id: `whoop-hrv-${index}`,
          name: "HRV (RMSSD)",
          value: day.hrv_rmssd,
          unit: "ms",
          timestamp,
          category: "autonomic",
        });
      }

      if (day.recovery_score !== undefined) {
        metrics.push({
          id: `whoop-recovery-${index}`,
          name: "Recovery Score",
          value: day.recovery_score,
          unit: "%",
          timestamp,
          category: "autonomic",
        });
      }

      if (day.resting_heart_rate !== undefined) {
        metrics.push({
          id: `whoop-rhr-${index}`,
          name: "Resting Heart Rate",
          value: day.resting_heart_rate,
          unit: "bpm",
          timestamp,
          category: "autonomic",
        });
      }

      if (day.sleep_performance !== undefined) {
        metrics.push({
          id: `whoop-sleep-${index}`,
          name: "Sleep Performance",
          value: day.sleep_performance,
          unit: "%",
          timestamp,
          category: "autonomic",
        });
      }

      if (day.strain !== undefined) {
        metrics.push({
          id: `whoop-strain-${index}`,
          name: "Day Strain",
          value: day.strain,
          unit: "",
          timestamp,
          category: "autonomic",
        });
      }

      if (day.calories !== undefined) {
        metrics.push({
          id: `whoop-calories-${index}`,
          name: "TDEE",
          value: day.calories,
          unit: "kcal",
          timestamp,
          category: "autonomic",
        });
      }
    });
  }

  // If no daily metrics, use summary data
  if (metrics.length === 0) {
    const timestamp = data.metadata?.analysis_date || new Date().toISOString();

    if (data.recovery_summary?.average_hrv !== undefined) {
      metrics.push({
        id: "whoop-hrv-avg",
        name: "HRV (RMSSD) Average",
        value: data.recovery_summary.average_hrv,
        unit: "ms",
        timestamp,
        category: "autonomic",
      });
    }

    if (data.recovery_summary?.average_recovery !== undefined) {
      metrics.push({
        id: "whoop-recovery-avg",
        name: "Recovery Score Average",
        value: data.recovery_summary.average_recovery,
        unit: "%",
        timestamp,
        category: "autonomic",
      });
    }

    if (data.recovery_summary?.average_rhr !== undefined) {
      metrics.push({
        id: "whoop-rhr-avg",
        name: "Resting Heart Rate Average",
        value: data.recovery_summary.average_rhr,
        unit: "bpm",
        timestamp,
        category: "autonomic",
      });
    }

    if (data.sleep_analysis?.average_sleep_performance !== undefined) {
      metrics.push({
        id: "whoop-sleep-avg",
        name: "Sleep Performance Average",
        value: data.sleep_analysis.average_sleep_performance,
        unit: "%",
        timestamp,
        category: "autonomic",
      });
    }
  }

  return metrics;
}

export default function WhoopImport() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-medium mb-2">WHOOP Analyzer Export</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Upload your <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">whoop_analysis_report.json</code> file
          from the WHOOP Analyzer tool.
        </p>

        <Form method="post" encType="multipart/form-data">
          {/* Drag and drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-700"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop your WHOOP JSON file here, or
                </p>
                <label className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  Browse files
                  <input
                    type="file"
                    name="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedFile || isSubmitting}
            className="mt-4 w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Parsing..." : "Parse WHOOP Data"}
          </button>
        </Form>
      </div>

      {/* Error display */}
      {actionData?.error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      {/* Success display */}
      {actionData?.success && actionData.summary && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 p-4">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Successfully parsed {actionData.summary.totalMetrics} metrics
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h3 className="font-medium mb-3">Import Summary</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Total Metrics</dt>
                <dd className="font-medium">{actionData.summary.totalMetrics}</dd>
              </div>
              <div>
                <dt className="text-gray-500">HRV Readings</dt>
                <dd className="font-medium">{actionData.summary.categories.hrv}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Recovery Scores</dt>
                <dd className="font-medium">{actionData.summary.categories.recovery}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Sleep Performance</dt>
                <dd className="font-medium">{actionData.summary.categories.sleep}</dd>
              </div>
            </dl>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Save to Database
              </button>
            </div>
          </div>

          {/* Preview metrics */}
          {actionData.metrics && actionData.metrics.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h3 className="font-medium mb-3">Preview (First 10)</h3>
              <div className="space-y-2">
                {actionData.metrics.slice(0, 10).map((metric: any) => (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">{metric.name}</span>
                    <span className="font-medium">
                      {metric.value} {metric.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="font-medium mb-3">How to export from WHOOP</h3>
        <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
          <li>Run the WHOOP Analyzer tool on your WHOOP data export</li>
          <li>Locate the generated <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">whoop_analysis_report.json</code> file</li>
          <li>Upload the file using the form above</li>
          <li>Review the parsed metrics and save to your tracker</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">
          Default path: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">/Users/mac/Code/Whoop/results/</code>
        </p>
      </div>
    </div>
  );
}
