import { useState } from "react";
import type { Route } from "./+types/vault";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";
import { Dropzone } from "~/components/ui/Dropzone";
import { Check, X } from "lucide-react";

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
  // Client-only state — no server upload in Phase 4.1 (T-04.1-12)
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedMetrics, setParsedMetrics] = useState<
    Array<{
      id: string;
      name: string;
      value: number;
      unit: string;
      category: string;
    }>
  >([]);
  const [categoryCount, setCategoryCount] = useState<Record<string, number>>({});

  const handleFile = (f: File) => {
    setFile(f);
    setParsed(false);
    setParseError(null);
    setParsedMetrics([]);
    setCategoryCount({});
  };

  const handleRemove = () => {
    setFile(null);
    setParsed(false);
    setParseError(null);
    setParsedMetrics([]);
    setCategoryCount({});
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const text = await file.text();
      const metrics = parseVaultMarkdown(text);
      setParsedMetrics(metrics);
      setCategoryCount(groupByCategory(metrics));
      setParsed(true);
    } catch {
      setParseError(
        "Something went wrong reading your file. Check the format and try again."
      );
    } finally {
      setParsing(false);
    }
  };

  const handleDiscard = () => {
    setFile(null);
    setParsed(false);
    setParseError(null);
    setParsedMetrics([]);
    setCategoryCount({});
  };

  return (
    <div>
      <PageHeader
        eyebrow="INGEST"
        title="Vault import"
        sub="Import from the Obsidian vault."
      />

      <div className="zt-grid-split">
        {/* Left: upload + results */}
        <div>
          <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
              Obsidian vault import
            </div>
            <p
              style={{
                marginTop: 0,
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                marginBottom: 20,
              }}
            >
              Import bloodwork and metric data from vault markdown files
              containing tables.
            </p>

            {/* Dropzone — client-only (T-04.1-12) */}
            {!file && (
              <Dropzone
                accept=".md,text/markdown,text/plain"
                onFile={handleFile}
                label="Drag and drop your vault markdown file here"
              />
            )}

            {/* File card */}
            {file && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {file.size
                      ? (file.size / 1024).toFixed(1) + " KB"
                      : "ready"}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={handleRemove}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    padding: 6,
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Parse button */}
            <div style={{ marginTop: 18 }}>
              <Button
                variant="primary"
                fullWidth
                disabled={!file || parsing || parsed}
                onClick={handleParse}
              >
                {parsing ? "Parsing…" : parsed ? "Parsed" : "Parse vault data"}
              </Button>
            </div>
          </Card>

          {/* Parse error */}
          {parseError && (
            <Card padding="lg" accent="energy" style={{ marginBottom: "var(--gap-lg)" }}>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                {parseError}
              </p>
            </Card>
          )}

          {/* Success card */}
          {parsed && parsedMetrics.length > 0 && (
            <Card accent="vital" padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--vital)",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Check size={16} strokeWidth={2.6} />
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "var(--text-lg)",
                  }}
                >
                  {parsedMetrics.length} metrics read from your frame
                </span>
              </div>
              <p
                style={{
                  margin: "0 0 18px",
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Review the preview below, then save to your tracker.
              </p>

              {/* Categories */}
              {Object.keys(categoryCount).length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: 8,
                    marginBottom: 18,
                  }}
                >
                  {Object.entries(categoryCount).map(([cat, count]) => (
                    <div
                      key={cat}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "var(--surface-2)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          textTransform: "capitalize",
                        }}
                      >
                        {cat}
                      </span>
                      <span
                        className="zt-tnum"
                        style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}
                      >
                        {count as number}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview */}
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  marginBottom: 18,
                }}
              >
                {parsedMetrics.slice(0, 10).map((m, i) => (
                  <div
                    key={m.id}
                    className="zt-trow"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 14px",
                      borderTop: i > 0 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "var(--text-sm)" }}>{m.name}</span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-2xs)",
                          color: "var(--text-muted)",
                          textTransform: "capitalize",
                        }}
                      >
                        ({m.category})
                      </span>
                    </div>
                    <span
                      className="zt-tnum"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      {m.value} {m.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="primary">Save to tracker</Button>
                <Button variant="ghost" onClick={handleDiscard}>
                  Discard import
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right: instructions */}
        <div>
          <Card padding="lg">
            <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
              Supported table formats
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                margin: "0 0 16px",
              }}
            >
              The parser looks for markdown tables with columns like:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Marker / Test / Name", "The metric name"],
                ["Value / Result", "The numeric value"],
                ["Unit", "The measurement unit (optional)"],
                ["Date", "The measurement date (optional)"],
              ].map(([col, desc]) => (
                <div
                  key={col}
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                    // Wrap the label/description pair instead of forcing the
                    // row wider than a 390px mobile viewport (04.1-09 R2 #4b).
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: "var(--text)",
                      flexShrink: 0,
                      minWidth: 140,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {col}
                  </span>
                  <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{desc}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 16,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              Default vault path{" "}
              <span
                style={{
                  background: "var(--surface-sunken)",
                  padding: "3px 7px",
                  borderRadius: 6,
                  color: "var(--text-secondary)",
                  // Let the long mono vault path wrap instead of forcing the
                  // row wider than a 390px mobile viewport (04.1-09 R2 #4a).
                  overflowWrap: "anywhere",
                  wordBreak: "break-all",
                }}
              >
                /Users/mac/vaults/#Bwell/602/
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
