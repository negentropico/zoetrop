import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/vault";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Import Vault - Zoetrop" },
    { name: "description", content: "Import data from Obsidian vault" },
  ];
}

// Action to handle vault markdown parsing
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const markdownContent = formData.get("markdownContent") as string | null;
  const file = formData.get("file") as File | null;

  if (!markdownContent && !file) {
    return { error: "No content provided", success: false };
  }

  try {
    let content: string;

    if (file) {
      content = await file.text();
    } else if (markdownContent) {
      content = markdownContent;
    } else {
      return { error: "No valid content", success: false };
    }

    // Parse markdown tables for bloodwork data
    const metrics = parseVaultMarkdown(content);

    return {
      success: true,
      metrics,
      summary: {
        totalMetrics: metrics.length,
        tables: countTables(content),
        categories: groupByCategory(metrics),
      },
    };
  } catch (error) {
    return {
      error: `Failed to parse vault content: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

// Parse markdown content for bloodwork tables
function parseVaultMarkdown(content: string) {
  const metrics: Array<{
    id: string;
    name: string;
    value: number;
    unit: string;
    timestamp: string;
    category: string;
    source: string;
  }> = [];

  // Look for markdown tables
  const tableRegex = /\|[^\n]+\|[\s\S]*?(?=\n\n|\n#|$)/g;
  const tables = content.match(tableRegex) || [];

  let metricIndex = 0;

  tables.forEach((table) => {
    const rows = table.split("\n").filter((row) => row.trim().startsWith("|"));
    if (rows.length < 2) return;

    // Skip header separator row
    const headerRow = rows[0];
    const dataRows = rows.slice(2); // Skip header and separator

    // Check if this looks like a bloodwork table
    const headers = headerRow
      .split("|")
      .map((h) => h.trim())
      .filter((h) => h);

    // Look for common bloodwork column patterns
    const nameIndex = headers.findIndex((h) =>
      /marker|test|metric|name/i.test(h)
    );
    const valueIndex = headers.findIndex((h) => /value|result|reading/i.test(h));
    const unitIndex = headers.findIndex((h) => /unit/i.test(h));
    const dateIndex = headers.findIndex((h) => /date/i.test(h));

    if (nameIndex === -1 || valueIndex === -1) return;

    dataRows.forEach((row) => {
      const cells = row
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c);

      if (cells.length <= Math.max(nameIndex, valueIndex)) return;

      const name = cells[nameIndex];
      const valueStr = cells[valueIndex];
      const value = parseFloat(valueStr.replace(/[^0-9.-]/g, ""));

      if (isNaN(value)) return;

      const unit = unitIndex >= 0 && cells[unitIndex] ? cells[unitIndex] : "";
      const date =
        dateIndex >= 0 && cells[dateIndex]
          ? cells[dateIndex]
          : new Date().toISOString().split("T")[0];

      metrics.push({
        id: `vault-${metricIndex++}`,
        name,
        value,
        unit,
        timestamp: new Date(date).toISOString(),
        category: categorizeMetric(name),
        source: "vault",
      });
    });
  });

  return metrics;
}

// Categorize metrics based on name
function categorizeMetric(name: string): string {
  const lower = name.toLowerCase();

  if (/vitamin|b12|folate|b6|biotin/i.test(lower)) return "vitamins";
  if (/zinc|magnesium|iron|selenium|copper|ferritin/i.test(lower)) return "minerals";
  if (/crp|homocysteine|esr|fibrinogen/i.test(lower)) return "inflammatory";
  if (/glucose|hba1c|insulin|egfr|bun|creatinine|uric/i.test(lower)) return "metabolic";
  if (/testosterone|tsh|cortisol|dhea|t3|t4|estrogen/i.test(lower)) return "hormones";
  if (/hrv|heart rate|recovery|sleep|strain/i.test(lower)) return "autonomic";
  if (/body fat|lean mass|bmi|visceral|bone/i.test(lower)) return "bodyComposition";
  if (/cholesterol|ldl|hdl|triglyceride|apob/i.test(lower)) return "lipids";
  if (/hemoglobin|hematocrit|wbc|platelet|rbc/i.test(lower)) return "hematology";

  return "metabolic"; // Default
}

function countTables(content: string): number {
  const tableRegex = /\|[^\n]+\|[\s\S]*?(?=\n\n|\n#|$)/g;
  return (content.match(tableRegex) || []).length;
}

function groupByCategory(
  metrics: Array<{ category: string }>
): Record<string, number> {
  const groups: Record<string, number> = {};
  metrics.forEach((m) => {
    groups[m.category] = (groups[m.category] || 0) + 1;
  });
  return groups;
}

export default function VaultImport() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [pastedContent, setPastedContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h2 className="font-medium mb-2">Obsidian Vault Import</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Import bloodwork and metric data from Obsidian vault markdown files containing tables.
        </p>

        {/* Input mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setInputMode("file")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              inputMode === "file"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setInputMode("paste")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              inputMode === "paste"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            Paste Content
          </button>
        </div>

        <Form method="post" encType="multipart/form-data">
          {inputMode === "file" ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Select markdown file
                </span>
                <input
                  type="file"
                  name="file"
                  accept=".md"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700"
                />
              </label>
              {selectedFile && (
                <p className="text-sm text-gray-500">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Paste markdown content with tables
                </span>
                <textarea
                  name="markdownContent"
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  rows={10}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono"
                  placeholder={`| Marker | Value | Unit | Date |
|--------|-------|------|------|
| Vitamin D | 65 | ng/mL | 2025-01-15 |
| B12 | 550 | pg/mL | 2025-01-15 |`}
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={
              (inputMode === "file" && !selectedFile) ||
              (inputMode === "paste" && !pastedContent.trim()) ||
              isSubmitting
            }
            className="mt-4 w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Parsing..." : "Parse Vault Data"}
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
              Successfully parsed {actionData.summary.totalMetrics} metrics from {actionData.summary.tables} tables
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h3 className="font-medium mb-3">Import Summary by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {Object.entries(actionData.summary.categories).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">{category}</span>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
            </div>

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
                    <div>
                      <span className="text-gray-900 dark:text-gray-100">{metric.name}</span>
                      <span className="ml-2 text-xs text-gray-500 capitalize">({metric.category})</span>
                    </div>
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
        <h3 className="font-medium mb-3">Supported Table Formats</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          The parser looks for markdown tables with columns like:
        </p>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
          <li><strong>Marker/Test/Name:</strong> The metric name</li>
          <li><strong>Value/Result:</strong> The numeric value</li>
          <li><strong>Unit:</strong> The measurement unit (optional)</li>
          <li><strong>Date:</strong> The measurement date (optional)</li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Default vault path: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">/Users/mac/vaults/#Bwell/602/</code>
        </p>
      </div>
    </div>
  );
}
