import { useState } from "react";
import type { Route } from "./+types/whoop";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { Dropzone } from "../../components/ui/Dropzone";
import { FileJson, Check, X } from "lucide-react";

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
  // Client-only state — no server upload in Phase 4.1 (T-04.1-12)
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedMetrics, setParsedMetrics] = useState<
    Array<{ id: string; name: string; value: number; unit: string }>
  >([]);

  const handleFile = (f: File) => {
    setFile(f);
    setParsed(false);
    setParseError(null);
    setParsedMetrics([]);
  };

  const handleRemove = () => {
    setFile(null);
    setParsed(false);
    setParseError(null);
    setParsedMetrics([]);
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as WhoopAnalysisReport;
      const metrics = parseWhoopReport(data);
      setParsedMetrics(metrics);
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
  };

  return (
    <div>
      <PageHeader
        eyebrow="IMPORT"
        title="Import data"
        sub="Bring in your signals from WHOOP, bloodwork, and vault files."
      />

      <div className="zt-grid-split">
        {/* Left: upload + results */}
        <div>
          <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
              WHOOP analyzer export
            </div>
            <p
              style={{
                marginTop: 0,
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                marginBottom: 20,
              }}
            >
              Upload your{" "}
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85em",
                  background: "var(--surface-sunken)",
                  padding: "2px 7px",
                  borderRadius: 6,
                  overflowWrap: "anywhere",
                  wordBreak: "break-all",
                }}
              >
                whoop_analysis_report.json
              </code>{" "}
              and we'll read the latest frame.
            </p>

            {/* Dropzone — client-only (T-04.1-12) */}
            {!file && (
              <Dropzone
                accept=".json,application/json"
                onFile={handleFile}
                label="Drag and drop your WHOOP JSON here"
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
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-md)",
                    background: "var(--focus-50)",
                    color: "var(--accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileJson size={22} strokeWidth={1.8} />
                </span>
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
                {parsing ? "Parsing…" : parsed ? "Parsed" : "Parse WHOOP data"}
              </Button>
            </div>
          </Card>

          {/* Parse error */}
          {parseError && (
            <Card padding="lg" accent="energy" style={{ marginBottom: "var(--gap-lg)" }}>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
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

              {/* Mini stats */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                {[
                  { v: parsedMetrics.length, l: "metrics" },
                  {
                    v: parsedMetrics.filter((m) =>
                      m.name.toLowerCase().includes("hrv") ||
                      m.name.toLowerCase().includes("recovery") ||
                      m.name.toLowerCase().includes("heart rate") ||
                      m.name.toLowerCase().includes("sleep")
                    ).length,
                    l: "autonomic",
                  },
                  { v: 0, l: "flagged" },
                ].map(({ v, l }) => (
                  <div
                    key={l}
                    style={{
                      flex: 1,
                      minWidth: 90,
                      padding: "12px 14px",
                      background: "var(--surface-2)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="zt-readout"
                      style={{ fontSize: "var(--text-xl)", display: "block" }}
                    >
                      {v}
                    </span>
                    <div
                      className="zt-eyebrow"
                      style={{ marginTop: 2 }}
                    >
                      {l}
                    </div>
                  </div>
                ))}
              </div>

              {/* Metric preview list */}
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
                      borderTop:
                        i > 0 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <span style={{ fontSize: "var(--text-sm)" }}>{m.name}</span>
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

        {/* Right: instructions + Phase 5 forward-look */}
        <div>
          <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
            <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
              How to export from WHOOP
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                lineHeight: "var(--leading-relaxed)",
              }}
            >
              <li>Run the WHOOP Analyzer on your data export.</li>
              <li>
                Locate the generated{" "}
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85em",
                    overflowWrap: "anywhere",
                    wordBreak: "break-all",
                  }}
                >
                  whoop_analysis_report.json
                </code>
                .
              </li>
              <li>Upload it using the form.</li>
              <li>Review the parsed metrics and save.</li>
            </ol>
            <div
              style={{
                marginTop: 16,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              Default path{" "}
              <span
                style={{
                  background: "var(--surface-sunken)",
                  padding: "3px 7px",
                  borderRadius: 6,
                  color: "var(--text-secondary)",
                  // Let the long mono path wrap instead of forcing the row
                  // wider than a 390px mobile viewport (04.1-09 R2 #3).
                  overflowWrap: "anywhere",
                  wordBreak: "break-all",
                }}
              >
                ~/Code/Whoop/results/
              </span>
            </div>
          </Card>

          {/* Phase 5 forward-look */}
          <Card padding="lg" tone="focus">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <Badge tone="focus" variant="solid">
                Phase 5
              </Badge>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                }}
              >
                Lab ingest review
              </span>
            </div>
            <p
              style={{
                margin: "0 0 16px",
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
              }}
            >
              The same upload → parse → review → commit flow, scaled to lab
              PDFs: source on the left, extracted fields to approve on the
              right.
            </p>
            {/* Faux skeleton */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
                gap: 12,
              }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: 12,
                  minHeight: 120,
                }}
              >
                <div
                  className="zt-eyebrow"
                  style={{ color: "var(--text-faint)", marginBottom: 8 }}
                >
                  labcorp_2026.pdf
                </div>
                {[70, 92, 60, 84].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      height: 6,
                      width: w + "%",
                      background: "var(--surface-sunken)",
                      borderRadius: 3,
                      margin: "7px 0",
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "4px 14px",
                }}
              >
                {[
                  { name: "hs-CRP", value: "0.8 mg/L" },
                  { name: "Homocysteine", value: "9.4 µmol/L" },
                ].map((f, i) => (
                  <div
                    key={f.name}
                    style={{
                      padding: "12px 0",
                      borderTop: i > 0 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div
                      className="zt-eyebrow"
                      style={{ color: "var(--text-muted)", marginBottom: 4 }}
                    >
                      {f.name}
                    </div>
                    <span
                      className="zt-tnum"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "var(--text-base)",
                      }}
                    >
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
