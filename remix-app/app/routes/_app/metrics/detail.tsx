import { Link } from "react-router";
import type { Route } from "./+types/detail";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "~/types/metrics";
import { getProjections, getMetricTargets, getMetricStatus } from "~/lib/metrics";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getMetrics } from "~/lib/data.server";
import { dbRowToMetric } from "~/lib/db-mappers.server";
import { TrendChart } from "~/components/ui/TrendChart";
import { format, parseISO } from "date-fns";
import { Card } from "~/components/ui/Card";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { RangeBar } from "~/components/ui/RangeBar";
import type { MetricWithRange } from "~/components/ui/RangeBar";
import { DataTable } from "~/components/ui/DataTable";
import { Crumb } from "~/components/ui/Crumb";
import { Badge } from "~/components/ui/Badge";

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
  const rows = await getMetrics(user.tenantId!, subject.id, category);
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

  // Get projections (Q1/Q2 targets) for this metric — non-PHI goal targets survivor
  const projections = getProjections(metric.name);
  const targets = getMetricTargets(metric.name);

  return {
    category,
    categoryInfo,
    metric,
    history,
    projections,
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

export default function MetricDetail({ loaderData }: Route.ComponentProps) {
  const { category, categoryInfo, metric, history, projections, targets } = loaderData;
  const status = getMetricStatus(metric);
  const rangeM = toRangeBarMetric(metric);

  // Ring percentage for the optional MetricRing (not rendered in detail view per spec — just big readout)
  const dirLabel = DIRECTION_LABELS[metric.improvement] ?? "Target range";

  return (
    <div>
      {/* Breadcrumb */}
      <Crumb
        items={[
          { label: "Metrics", to: "/metrics" },
          { label: categoryInfo.label, to: `/metrics/${category}` },
          { label: metric.name },
        ]}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: "var(--gap-2xl)",
        }}
      >
        <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap" }}>
              {metric.name}
            </h1>
            <StatusBadge status={status} />
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Last updated {format(parseISO(metric.timestamp), "MMM d, yyyy")}
            {metric.source ? ` · ${metric.source}` : ""}
          </p>
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span className="zt-readout" style={{ fontSize: "var(--text-3xl)" }}>
            {metric.value.toFixed(2)}
          </span>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              // No text-transform: clinical units are case-sensitive and
              // uppercasing the micro sign µ (U+00B5) maps it to Greek capital
              // mu Μ (U+039C), rendering "µmol/L" as "MMOL/L".
              letterSpacing: "0.08em",
              marginTop: 2,
            }}
          >
            {metric.unit}
          </div>
        </div>
      </div>

      {/* Range status */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
        <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-md)" }}>
          Range status
        </div>
        {rangeM ? (
          <div style={{ padding: "14px 4px 4px" }}>
            <RangeBar m={rangeM} height={14} showEndpoints />
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            No reference range available.
          </p>
        )}
        {/* Range legend */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
            <span style={{ width: 16, height: 9, background: "var(--vital-100)", border: "1px solid var(--vital-200, var(--vital-100))", borderRadius: 2 }} />
            Optimal band
          </span>
          <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
            <span style={{ width: 16, height: 9, background: "var(--n-150)", borderRadius: 2 }} />
            Reference
          </span>
          <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
            <span style={{ width: 3, height: 12, background: "var(--ink)", borderRadius: 2 }} />
            Value
          </span>
        </div>
      </Card>

      {/* Trend over time */}
      {history.length > 0 && (
        <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--gap-md)",
            }}
          >
            <div className="zt-eyebrow">Trend over time</div>
            {history.length >= 2 && projections.length > 0 && (
              <Badge tone="focus">With 2026 targets</Badge>
            )}
          </div>
          {/* A single reading is not a trend — plotting one actual point beside
              the target markers reads as a trajectory that does not exist. Show
              the line only once there are ≥2 real measurements. */}
          {history.length >= 2 ? (
          <>
          <TrendChart
            data={history}
            projections={projections}
            unit={metric.unit}
            optimalRange={metric.optimalRange}
            referenceRange={metric.referenceRange}
            height={280}
          />
          {/* Chart legend */}
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              marginTop: 12,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
            }}
          >
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
              <span style={{ width: 16, height: 2.5, background: "var(--ink)", borderRadius: 2 }} />
              Actual
            </span>
            {projections.length > 0 && (
              <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
                <span style={{ width: 16, height: 0, borderTop: "2.5px dashed var(--energy-400, var(--energy))" }} />
                Target
              </span>
            )}
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
              <span style={{ width: 16, height: 9, background: "var(--vital-50)", border: "1px solid var(--vital-200, var(--vital-100))", borderRadius: 2 }} />
              Optimal band
            </span>
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
              <span style={{ width: 16, height: 9, border: "1px dashed var(--n-200)", borderRadius: 2 }} />
              Reference
            </span>
          </div>
          </>
          ) : (
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
              Only one measurement logged so far. A trend line appears once you
              record a second reading.
            </p>
          )}
        </Card>
      )}

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
          <DataTable<HistoryEntry>
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
            ]}
            rows={history}
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
            {metric.referenceRange && (
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
                  Reference range
                </div>
                <div
                  className="zt-tnum"
                  style={{ fontFamily: "var(--font-mono)", fontWeight: 600, marginTop: 4 }}
                >
                  {metric.referenceRange.min}–{metric.referenceRange.max} {metric.unit}
                  {metric.optimalRange && (
                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                      {" · "}optimal {metric.optimalRange.min}–{metric.optimalRange.max}
                    </span>
                  )}
                </div>
              </div>
            )}
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
