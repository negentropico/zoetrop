import { Link } from "react-router";
import type { Route } from "./+types/detail";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "~/types/metrics";
import { getMetricTargets, getMetricStatus } from "~/lib/metrics";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getMetrics } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { dbRowToMetric } from "~/lib/db-mappers.server";
import { TrendChart } from "~/components/ui/TrendChart";
import { format, parseISO } from "date-fns";
import { Card } from "~/components/ui/Card";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { RangeBar } from "~/components/ui/RangeBar";
import type { MetricWithRange } from "~/components/ui/RangeBar";
import { DataTable } from "~/components/ui/DataTable";
import { PageHeader } from "~/components/ui/PageHeader";
import { Delta } from "~/components/ui/Delta";
import { statusOf } from "~/lib/status";

function isValidCategory(category: string): category is MetricCategory {
  return category in CATEGORY_INFO;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { category, metricId } = params;

  if (!category || !isValidCategory(category)) {
    throw new Response("Category not found", { status: 404 });
  }

  if (!metricId) {
    throw new Response("Metric not found", { status: 404 });
  }

  const categoryInfo = CATEGORY_INFO[category];

  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  const rows = await getMetrics(ctx, category);
  const allMetrics = rows.map(dbRowToMetric);

  const metric = allMetrics.find((m) => m.id === metricId);

  if (!metric) {
    throw new Response("Metric not found", { status: 404 });
  }

  // Get historical values for this metric (all entries with same name)
  const history = allMetrics
    .filter((m) => m.name === metric.name)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((m) => ({ timestamp: m.timestamp, value: m.value }));

  // 2026 targets for this metric — non-PHI goal targets survivor.
  // (Chart projections are now linear-fit trend projections computed inside
  // TrendChart per the round-3 chart language; targets render in their card.)
  const targets = getMetricTargets(metric.name);

  return {
    category,
    categoryInfo,
    metric,
    history,
    targets,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Metric Not Found - Zoetrop" }];
  }
  return [
    { title: `${data.metric.name} - Zoetrop` },
    { name: "description", content: `${data.metric.name} tracking data` },
  ];
}

// Build a MetricWithRange from a Metric for the RangeBar
function toRangeBarMetric(m: Metric): MetricWithRange | null {
  if (!m.referenceRange) return null;
  const ref = m.referenceRange;
  const opt = m.optimalRange ?? ref;
  const padding = (ref.max - ref.min) * 0.1;
  return {
    min: ref.min - padding,
    max: ref.max + padding,
    ref: [ref.min, ref.max],
    opt: [opt.min, opt.max],
    value: m.value,
    status: getMetricStatus(m),
    unit: m.unit,
  };
}

const DIRECTION_LABELS: Record<string, string> = {
  "higher is better": "Higher is better",
  "lower is better": "Lower is better",
  "target range": "Target range",
};

type HistoryEntry = { timestamp: string; value: number };
type HistoryRow = HistoryEntry & { status: ReturnType<typeof getMetricStatus> };

export default function MetricDetail({ loaderData }: Route.ComponentProps) {
  const { category, categoryInfo, metric, history, targets } = loaderData;
  const status = getMetricStatus(metric);
  const rangeM = toRangeBarMetric(metric);

  const dirLabel = DIRECTION_LABELS[metric.improvement] ?? "Target range";

  // History values oldest-first (loader sorts desc) — delta + statusOf rows
  const valuesAsc = [...history].reverse().map((h) => h.value);
  const statusRanges = {
    ref: metric.referenceRange ?? undefined,
    opt: metric.optimalRange ?? undefined,
  };
  // History statuses via the shared statusOf (chart-language rule 3)
  const historyRows: HistoryRow[] = history.map((h) => ({
    ...h,
    status: statusOf(h.value, statusRanges),
  }));

  return (
    <div>
      <PageHeader
        eyebrow={`Last updated ${format(parseISO(metric.timestamp), "MMM d, yyyy")}${metric.source ? ` · ${metric.source}` : ""}`}
        title={metric.name}
        titleAccessory={<StatusBadge status={status} />}
        crumbs={[
          { label: "Metrics", to: "/metrics" },
          { label: categoryInfo.label, to: `/metrics/${category}` },
          { label: metric.name },
        ]}
      />

      {/* Trend chart — leads the screen; the big readout moved here from the
          masthead right slot (round 3: chart card leads with readout + delta). */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--gap-lg)",
            marginBottom: "var(--gap-xl)",
          }}
        >
          <div>
            <div className="zt-readout" style={{ fontSize: "var(--text-3xl)", color: "var(--ink)" }}>
              {metric.value.toFixed(2)}{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 400,
                  color: "var(--text-muted)",
                  // No text-transform: clinical units are case-sensitive and
                  // uppercasing the micro sign µ (U+00B5) maps it to Greek
                  // capital mu Μ (U+039C), rendering "µmol/L" as "MMOL/L".
                  letterSpacing: "0.06em",
                }}
              >
                {metric.unit}
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Delta values={valuesAsc} />
            </div>
          </div>
          {/* Legend matches the band treatment (round 3) */}
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
            }}
          >
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
              <span style={{ width: 12, height: 8, borderRadius: 3, background: "var(--vital-100)", boxShadow: "inset 0 0 0 1px var(--vital-200, var(--vital-100))", display: "inline-block" }} />
              Optimal
            </span>
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
              <span style={{ width: 12, height: 0, borderTop: "1px dashed var(--n-300)", display: "inline-block" }} />
              Reference
            </span>
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.2px dashed var(--n-400)", display: "inline-block", boxSizing: "border-box" }} />
              Projected
            </span>
          </div>
        </div>
        {/* A single reading is not a trend — plotting one actual point beside
            the target markers reads as a trajectory that does not exist. Show
            the line only once there are ≥2 real measurements. */}
        {history.length >= 2 ? (
          <TrendChart
            data={history}
            unit={metric.unit}
            optimalRange={metric.optimalRange}
            referenceRange={metric.referenceRange}
            height={300}
          />
        ) : (
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            Only one measurement logged so far. A trend line appears once you
            record a second reading.
          </p>
        )}
      </Card>

      {/* Ranges — consolidated into ONE card (round 3): range bar with
          endpoints + optimal/reference figures. */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
        <div
          className="zt-ranges-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)",
            gap: "var(--gap-2xl)",
            alignItems: "center",
          }}
        >
          <div>
            <div className="zt-eyebrow" style={{ marginBottom: 14 }}>Where you sit</div>
            {rangeM ? (
              <RangeBar m={rangeM} height={8} showEndpoints />
            ) : (
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                No reference range available.
              </p>
            )}
          </div>
          <div>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Optimal</div>
            <div className="zt-tnum" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--vital-500, var(--vital))" }}>
              {metric.optimalRange ? (
                <>
                  {metric.optimalRange.min}–{metric.optimalRange.max}{" "}
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{metric.unit}</span>
                </>
              ) : (
                <span style={{ color: "var(--text-faint)" }}>—</span>
              )}
            </div>
          </div>
          <div>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Reference</div>
            <div className="zt-tnum" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text)" }}>
              {metric.referenceRange ? (
                <>
                  {metric.referenceRange.min}–{metric.referenceRange.max}{" "}
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 400, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{metric.unit}</span>
                </>
              ) : (
                <span style={{ color: "var(--text-faint)" }}>—</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 2026 Targets */}
      {targets && (
        <Card tone="focus" padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
          <div
            className="zt-eyebrow"
            style={{ color: "var(--focus-500, var(--focus))", marginBottom: 16 }}
          >
            2026 targets
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--focus-500, var(--focus))",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Q1 target · Apr
              </div>
              <div className="zt-readout" style={{ fontSize: "var(--text-2xl)", marginTop: 6 }}>
                {targets.q1Target}{" "}
                <span style={{ fontSize: "var(--text-md)", color: "var(--text-muted)" }}>{targets.unit}</span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--focus-500, var(--focus))",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Q2 stretch · Jul
              </div>
              <div className="zt-readout" style={{ fontSize: "var(--text-2xl)", marginTop: 6 }}>
                {targets.q2Stretch}{" "}
                <span style={{ fontSize: "var(--text-md)", color: "var(--text-muted)" }}>{targets.unit}</span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--focus-500, var(--focus))",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Direction
              </div>
              <div style={{ marginTop: 10, fontWeight: 600 }}>{targets.direction}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Measurements + Details */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
          gap: "var(--gap-lg)",
        }}
        className="measurements-grid"
      >
        {/* Measurements table */}
        <Card padding="md">
          <div style={{ padding: "4px 8px 14px" }}>
            <div className="zt-eyebrow">
              Measurements{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-faint)",
                  marginLeft: 6,
                }}
              >
                {history.length}
              </span>
            </div>
          </div>
          <DataTable<HistoryRow>
            columns={[
              {
                key: "timestamp",
                label: "Date",
                render: (r) => format(parseISO(r.timestamp), "MMM d, yyyy"),
              },
              {
                key: "value",
                label: "Value",
                align: "right",
                mono: true,
                render: (r) => `${r.value.toFixed(2)} ${metric.unit}`,
              },
              {
                key: "status",
                label: "Status",
                align: "right",
                render: (r) => <StatusBadge status={r.status} />,
              },
            ]}
            rows={historyRows}
            rowKey={(r) => r.timestamp}
          />
        </Card>

        {/* Details card */}
        <Card padding="lg">
          <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-lg)" }}>Details</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Source
              </div>
              <div style={{ fontWeight: 600, marginTop: 4, textTransform: "capitalize" }}>
                {metric.source}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Improvement direction
              </div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{dirLabel}</div>
            </div>
            {/* Reference + optimal figures live in the consolidated Ranges
                card above (round 3) — not repeated here. */}
          </div>
        </Card>
      </div>

      {/* Responsive: stack grid on mobile */}
      <style>{`
        /* min-width:0 on grid children lets the DataTable scroll container
           shrink instead of forcing the cell (and the page) wider than the
           viewport at mobile (04.1-09 R2). */
        .measurements-grid > * { min-width: 0; }
        @media (max-width: 760px) {
          .measurements-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
