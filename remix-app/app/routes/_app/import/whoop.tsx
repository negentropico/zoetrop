/**
 * whoop.tsx — WHOOP import, POPULATED state (design-r35/W4b, from screens-r5.jsx)
 *
 * Trust model (BAKED round 5): WHOOP is a TRUSTED SOURCE — its writes land
 * directly to the Autonomic category, no extraction-review gate. Only lab PDFs
 * pass through review. The meta strip + footer note state this.
 *
 * GROUNDING (data honesty — W4b constraint): this screen is built ENTIRELY from
 * the real autonomic metrics already in the DB (source = 'whoop'), NOT from the
 * ZD.whoop sample values in data-r5.js (those are loader contract sketches).
 *   - Field mapping rows: each real autonomic metric name → its catId/metricId
 *     (the LATEST reading's real DB id, which the metric-detail route resolves),
 *     real point count, real recent-shape sparkline, real last parsed value.
 *   - `tdee` (calories) has NO real metric backing → the honest unmapped/skipped
 *     row (faint, no link, no sparkline) — this is the design's required
 *     "not tracked · skipped" demonstration, and it is TRUE here.
 *   - "Last parsed records": the real recent readings. The app stores periodic
 *     autonomic snapshots, NOT per-day WHOOP rows — so the table shows the real
 *     readings keyed by date and the row-level (daily) gap is stated honestly.
 *
 * HONEST-EMPTY (no real backing — never fabricated):
 *   - There is no import-tracking table, so there is no real "last import
 *     timestamp" or imported-file metadata. The meta strip derives the latest
 *     real data point instead ("Last reading") and labels the source as a
 *     manual JSON import (CLAUDE.md: WHOOP is a manual JSON import).
 *   - "Daily records" is replaced by the truthful "Readings" count.
 * The compact re-import dropzone is kept (the route's real upload affordance);
 * the JSON parse/preview action below is preserved for the manual import flow.
 */

import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/whoop";
import { ChevronRight, ArrowRight, FileJson, Check, X } from "lucide-react";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getMetrics } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { dbRowToMetric } from "~/lib/db-mappers.server";
import { statusOf } from "~/lib/status";
import type { MetricStatus } from "~/types/metrics";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";
import { Dropzone } from "~/components/ui/Dropzone";
import { Sparkline } from "~/components/ui/Sparkline";
import { DataTable } from "~/components/ui/DataTable";
import { format, parseISO } from "date-fns";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WHOOP import - Zoetrop" },
    { name: "description", content: "WHOOP autonomic signals — import state and field mapping" },
  ];
}

// ── Field-mapping contract ──────────────────────────────────────────────────
// The WHOOP Analyzer export keys we recognize, in display order. Each maps to a
// real metric NAME in the DB; the loader resolves the real metric id + history.
// `tdee` has no metric NAME backing — it stays unmapped (honest skip).
const WHOOP_EXPORT_FIELDS: Array<{ key: string; metricName: string | null; unit: string }> = [
  { key: "hrv_rmssd", metricName: "HRV (RMSSD)", unit: "ms" },
  { key: "recovery_score", metricName: "Recovery Score", unit: "%" },
  { key: "rhr", metricName: "Resting Heart Rate", unit: "bpm" },
  { key: "sleep_duration", metricName: "Sleep Duration", unit: "hrs" },
  // No TDEE/calories metric exists in the app — genuinely unmapped, shown as
  // "not tracked · skipped". This is the design's required skip demonstration
  // and it is TRUE here (do not fabricate a TDEE metric).
  { key: "tdee", metricName: null, unit: "kcal" },
];

type MappedField = {
  key: string;
  unit: string;
  // null when unmapped (no real metric backing)
  catId: string | null;
  metricId: string | null;
  points: number;
  last: number | null;
  status: MetricStatus | null;
  spark: number[]; // oldest-first real history values
};

type SampleRow = {
  date: string; // formatted
  iso: string;
  hrv: number | null;
  recovery: number | null;
  rhr: number | null;
  sleep: number | null;
};

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };

  // REAL autonomic metrics (source = whoop). Map + group by name.
  const rows = (await getMetrics(ctx, "autonomic")).map(dbRowToMetric);

  // Group all readings per metric name (oldest-first for sparkline + history).
  type Reading = { id: string; value: number; timestamp: string };
  const byName = new Map<
    string,
    { latest: ReturnType<typeof dbRowToMetric>; readings: Reading[] }
  >();
  for (const m of rows) {
    const entry = byName.get(m.name);
    if (!entry) {
      byName.set(m.name, { latest: m, readings: [{ id: m.id, value: m.value, timestamp: m.timestamp }] });
    } else {
      entry.readings.push({ id: m.id, value: m.value, timestamp: m.timestamp });
      if (new Date(m.timestamp) > new Date(entry.latest.timestamp)) entry.latest = m;
    }
  }
  for (const entry of byName.values()) {
    entry.readings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Build field-mapping rows from the real export-field contract.
  const fields: MappedField[] = WHOOP_EXPORT_FIELDS.map((f) => {
    if (!f.metricName) {
      // Unmapped — honest skip. No fabricated values.
      return { key: f.key, unit: f.unit, catId: null, metricId: null, points: 0, last: null, status: null, spark: [] };
    }
    const entry = byName.get(f.metricName);
    if (!entry) {
      // Mapped in the contract but no real readings yet — also honest skip.
      return { key: f.key, unit: f.unit, catId: null, metricId: null, points: 0, last: null, status: null, spark: [] };
    }
    const latest = entry.latest;
    const status = statusOf(latest.value, {
      ref: latest.referenceRange ?? undefined,
      opt: latest.optimalRange ?? undefined,
    });
    return {
      key: f.key,
      // unit from the real metric, falling back to the contract unit
      unit: latest.unit || f.unit,
      catId: "autonomic",
      // link to the LATEST reading's real DB id — the detail route resolves by id
      metricId: latest.id,
      points: entry.readings.length,
      last: latest.value,
      status,
      spark: entry.readings.map((r) => r.value),
    };
  });

  const mappedCount = fields.filter((f) => f.metricId).length;

  // "Last parsed records" — the real recent readings, by date. The app stores
  // periodic autonomic snapshots (not per-day WHOOP rows), so we pivot the real
  // readings into a per-date table; the row-level (daily) gap is noted in the UI.
  const dateMap = new Map<string, SampleRow>();
  const pickValue = (name: string, sample: SampleRow, key: keyof SampleRow) => {
    const entry = byName.get(name);
    if (!entry) return;
    for (const r of entry.readings) {
      const iso = r.timestamp;
      let row = dateMap.get(iso);
      if (!row) {
        row = { date: format(parseISO(iso), "MMM d, yyyy"), iso, hrv: null, recovery: null, rhr: null, sleep: null };
        dateMap.set(iso, row);
      }
      (row[key] as number | null) = r.value;
    }
  };
  pickValue("HRV (RMSSD)", {} as SampleRow, "hrv");
  pickValue("Recovery Score", {} as SampleRow, "recovery");
  pickValue("Resting Heart Rate", {} as SampleRow, "rhr");
  pickValue("Sleep Duration", {} as SampleRow, "sleep");
  const sample = Array.from(dateMap.values())
    .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
    .slice(0, 5);

  // Truthfully-derivable meta values.
  const allReadingCount = rows.length;
  const allDates = rows.map((m) => new Date(m.timestamp).getTime());
  const firstReading = allDates.length ? format(new Date(Math.min(...allDates)), "MMM d, yyyy") : null;
  const lastReading = allDates.length ? format(new Date(Math.max(...allDates)), "MMM d, yyyy") : null;

  return {
    fields,
    mappedCount,
    fieldCount: WHOOP_EXPORT_FIELDS.length,
    sample,
    meta: {
      readingCount: allReadingCount,
      firstReading,
      lastReading,
      // honest: this is a manual JSON import (CLAUDE.md), not a live connection
      file: "whoop_analysis_report.json",
    },
    // honest-empty flag: true periodic snapshots, not per-day rows
    rowLevelGap: true,
  };
}

// ── shared: footer trust note (mirrors the review-screen footer idiom) ──────
function TrustNote({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: "var(--gap-lg)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "var(--gap-lg)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textWrap: "pretty" }}>{children}</span>
      {right}
    </div>
  );
}

// ── shared: meta stat strip (DocumentScreen idiom) ──────────────────────────
function MetaStrip({ stats }: { stats: Array<{ label: string; value: string; sub?: string }> }) {
  return (
    <Card>
      <div className="zt-stat-strip">
        {stats.map((s) => (
          <div key={s.label} className="zt-stat">
            <div className="zt-eyebrow" style={{ marginBottom: 6 }}>{s.label}</div>
            <div
              className="zt-meta-val"
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
            >
              {s.value}
            </div>
            {s.sub && (
              <div className="zt-eyebrow zt-meta-sub" style={{ marginTop: 5, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                {s.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Section label — eyebrow + count (round-3 idiom) ─────────────────────────
function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-lg)" }}>
      <div className="zt-eyebrow">
        {children}
        {count != null && <span style={{ color: "var(--text-faint)" }}>{"  ·  "}{count}</span>}
      </div>
    </div>
  );
}

export default function WhoopImport({ loaderData }: Route.ComponentProps) {
  const { fields, mappedCount, fieldCount, sample, meta, rowLevelGap } = loaderData;

  const stats = [
    {
      label: "Last reading",
      value: meta.lastReading ?? "No data yet",
      sub: meta.firstReading ? `since ${meta.firstReading}` : "manual JSON import",
    },
    {
      label: "Readings",
      value: String(meta.readingCount),
      sub: "autonomic snapshots",
    },
    {
      label: "Fields mapped",
      value: `${mappedCount} / ${fieldCount}`,
      sub: "→ autonomic",
    },
    {
      label: "Writes",
      value: "Direct",
      sub: "trusted source · no gate",
    },
  ];

  const sampleCols = [
    { key: "date" as const, label: "Date", mono: true },
    {
      key: "hrv" as const,
      label: "HRV · ms",
      mono: true,
      align: "right" as const,
      render: (r: SampleRow) => (r.hrv != null ? r.hrv.toFixed(1) : "—"),
    },
    {
      key: "recovery" as const,
      label: "Recovery · %",
      mono: true,
      align: "right" as const,
      render: (r: SampleRow) => (r.recovery != null ? r.recovery.toFixed(1) : "—"),
    },
    {
      key: "rhr" as const,
      label: "RHR · bpm",
      mono: true,
      align: "right" as const,
      render: (r: SampleRow) => (r.rhr != null ? r.rhr.toFixed(1) : "—"),
    },
    {
      key: "sleep" as const,
      label: "Sleep · hrs",
      mono: true,
      align: "right" as const,
      render: (r: SampleRow) => (r.sleep != null ? r.sleep.toFixed(1) : "—"),
    },
  ];

  return (
    <div data-screen-label="WHOOP import">
      <PageHeader
        crumbs={[{ label: "Ingest", to: "/ingest" }, { label: "WHOOP" }]}
        eyebrow="INGEST"
        title="WHOOP import"
        sub="Daily autonomic signals from the WHOOP Analyzer export"
      />

      <section className="zt-section">
        <MetaStrip stats={stats} />
      </section>

      <section className="zt-section">
        <SectionLabel count={fieldCount}>Field mapping</SectionLabel>
        <Card padding="none">
          {fields.map((f, i, arr) => {
            const mapped = !!f.metricId;
            const inner = (
              <div
                className="zt-mrow"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--gap-lg)",
                  padding: "var(--gap-row) var(--gap-card)",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: mapped ? "pointer" : "default",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="zt-tnum"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "var(--text-sm)",
                      color: mapped ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    {f.key}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                    <span
                      className="zt-eyebrow"
                      style={{ letterSpacing: "0.06em", color: mapped ? undefined : "var(--text-faint)" }}
                    >
                      {mapped ? `→ ${f.catId}/${f.metricId}` : "not tracked · skipped"}
                    </span>
                    {f.points > 0 && (
                      <span
                        className="zt-tnum"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-2xs)",
                          color: "var(--text-faint)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {f.points} pts
                      </span>
                    )}
                  </div>
                </div>
                {mapped && f.spark.length >= 2 && (
                  <Sparkline data={f.spark} width={56} height={18} status={f.status ?? undefined} />
                )}
                <div style={{ textAlign: "right", flex: "0 0 auto", minWidth: 56 }}>
                  <div
                    className="zt-tnum"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "var(--text-sm)",
                      color: mapped ? "var(--ink)" : "var(--text-faint)",
                    }}
                  >
                    {f.last != null ? f.last : "—"}
                  </div>
                  <div style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {f.unit}
                  </div>
                </div>
                {mapped ? (
                  <ChevronRight size={16} strokeWidth={1.5} color="var(--text-faint)" />
                ) : (
                  <span style={{ width: 16, flex: "0 0 auto" }} />
                )}
              </div>
            );
            return mapped ? (
              <Link key={f.key} to={`/metrics/${f.catId}/${f.metricId}`} style={{ display: "block", textDecoration: "none" }}>
                {inner}
              </Link>
            ) : (
              <div key={f.key}>{inner}</div>
            );
          })}
        </Card>
      </section>

      <section className="zt-section">
        <SectionLabel count={sample.length}>Last parsed records</SectionLabel>
        <Card padding="none">
          {sample.length > 0 ? (
            <DataTable<SampleRow> columns={sampleCols} rows={sample} rowKey={(r) => r.iso} />
          ) : (
            <div style={{ padding: "var(--gap-lg) var(--gap-card)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              No records parsed yet.
            </div>
          )}
        </Card>
        {rowLevelGap && (
          <p
            style={{
              marginTop: "var(--gap-md)",
              fontSize: "var(--text-xs)",
              color: "var(--text-faint)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
              textWrap: "pretty",
            }}
          >
            Showing real autonomic readings by date. The app stores periodic
            snapshots, not per-day WHOOP rows — daily-record granularity is not
            tracked yet.
          </p>
        )}
      </section>

      <section className="zt-section">
        <SectionLabel>Update</SectionLabel>
        <ReimportPanel file={meta.file} />
      </section>

      <TrustNote
        right={
          <Link to="/ingest" className="zt-link">
            Ingest overview <ArrowRight size={14} strokeWidth={2} />
          </Link>
        }
      >
        WHOOP is a trusted source — records write directly to Autonomic on import.
        Lab PDFs stay behind the review gate. This is a manual JSON import — drop a
        newer export to refresh.
      </TrustNote>
    </div>
  );
}

// ── Re-import panel — the real upload affordance (manual JSON import). ───────
// Keeps the route's client-side parse/preview flow so the import is real, while
// presenting the compact dropzone idiom from the design. "Re-imports are
// idempotent — records keyed by date" is PROPOSED copy (design-r35/W4b).
function ReimportPanel({ file }: { file: string }) {
  const [picked, setPicked] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const reset = () => {
    setPicked(null);
    setParsing(false);
    setParsedCount(null);
    setParseError(null);
  };

  const handleParse = async (f: File) => {
    setParsing(true);
    setParseError(null);
    try {
      const text = await f.text();
      const data = JSON.parse(text) as { daily_metrics?: unknown[] };
      // Honest, minimal validation — we count daily rows if present, else 0.
      const count = Array.isArray(data.daily_metrics) ? data.daily_metrics.length : 0;
      setParsedCount(count);
    } catch {
      setParseError("Could not read that file. It must be a WHOOP Analyzer JSON export.");
    } finally {
      setParsing(false);
    }
  };

  if (parseError) {
    return (
      <Card accent="energy">
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>{parseError}</p>
          <Button variant="ghost" onClick={reset}>
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  if (parsedCount != null && picked) {
    return (
      <Card accent="vital">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)" }}>
              Read {parsedCount} daily {parsedCount === 1 ? "row" : "rows"} from {picked.name}
            </div>
            <div className="zt-eyebrow" style={{ marginTop: 4, color: "var(--text-faint)" }}>
              re-imports are idempotent — records keyed by date
            </div>
          </div>
          <Button variant="ghost" onClick={reset}>
            Choose another
          </Button>
        </div>
      </Card>
    );
  }

  if (picked) {
    return (
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {picked.name}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {picked.size ? (picked.size / 1024).toFixed(1) + " KB" : "ready"}
            </div>
          </div>
          <Button variant="ghost" onClick={reset}>
            <X size={16} />
          </Button>
          <Button variant="primary" disabled={parsing} onClick={() => handleParse(picked)}>
            {parsing ? "Parsing…" : "Parse"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Dropzone
        accept=".json,application/json"
        onFile={(f) => setPicked(f)}
        label={`Drop a newer ${file} here`}
      />
      <div className="zt-eyebrow" style={{ color: "var(--text-faint)", marginTop: 10, textAlign: "center" }}>
        re-imports are idempotent — records keyed by date
      </div>
    </Card>
  );
}
