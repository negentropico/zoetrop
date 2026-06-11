import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/category";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "~/types/metrics";
import { getMetricTargets, getMetricStatus } from "~/lib/metrics";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getMetrics } from "~/lib/data.server";
import { dbRowToMetric } from "~/lib/db-mappers.server";
import { TrendSparkline } from "~/components/ui/TrendChart";
import { format, parseISO } from "date-fns";
import {
  Pill,
  Gem,
  Flame,
  Zap,
  FlaskConical,
  HeartPulse,
  Dumbbell,
  Droplet,
  Dna,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "~/components/ui/Card";
import { CatChip } from "~/components/ui/CatChip";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { StatusDot } from "~/components/ui/StatusDot";
import { RangeBar } from "~/components/ui/RangeBar";
import type { MetricWithRange } from "~/components/ui/RangeBar";
import { Crumb } from "~/components/ui/Crumb";

const LUCIDE_MAP: Record<string, LucideIcon> = {
  pill: Pill,
  gem: Gem,
  flame: Flame,
  zap: Zap,
  "flask-conical": FlaskConical,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  droplet: Droplet,
  dna: Dna,
};

// Validate category param
function isValidCategory(category: string): category is MetricCategory {
  return category in CATEGORY_INFO;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { category } = params;

  if (!category || !isValidCategory(category)) {
    throw new Response("Category not found", { status: 404 });
  }

  const categoryInfo = CATEGORY_INFO[category];

  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const rows = await getMetrics(user.tenantId!, subject.id, category);
  const categoryMetrics = rows.map(dbRowToMetric);

  // Get latest value for each unique metric name
  const latestByName = new Map<string, Metric>();
  categoryMetrics.forEach((m) => {
    const existing = latestByName.get(m.name);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latestByName.set(m.name, m);
    }
  });
  const latestMetrics = Array.from(latestByName.values());

  // Build history for each metric (all data points with same name)
  const historyByName = new Map<string, Array<{ timestamp: string; value: number }>>();
  categoryMetrics.forEach((m) => {
    const history = historyByName.get(m.name) || [];
    history.push({ timestamp: m.timestamp, value: m.value });
    historyByName.set(m.name, history);
  });

  // Convert to array with history and projection info attached
  const metricsWithHistory = latestMetrics.map((m) => ({
    ...m,
    history: historyByName.get(m.name) || [],
    hasProjections: !!getMetricTargets(m.name),
  }));

  return {
    category,
    categoryInfo,
    metrics: metricsWithHistory,
    totalCount: metricsWithHistory.length,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Category Not Found - Zoetrop" }];
  }
  return [
    { title: `${data.categoryInfo.label} - Zoetrop` },
    { name: "description", content: data.categoryInfo.description },
  ];
}

// Build a MetricWithRange from a Metric for the RangeBar
function toRangeBarMetric(m: Metric): MetricWithRange | null {
  if (!m.referenceRange) return null;
  const ref = m.referenceRange;
  const opt = m.optimalRange ?? ref;
  const padding = (ref.max - ref.min) * 0.2;
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

// Filter controls using brand FilterPill style
function FilterControls() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";

  const statuses: Array<{ value: string; label: string; status?: MetricStatus }> = [
    { value: "all", label: "All" },
    { value: "optimal", label: "Optimal", status: "optimal" },
    { value: "borderline", label: "Borderline", status: "borderline" },
    { value: "deficient", label: "Deficient", status: "deficient" },
    { value: "excess", label: "Excess", status: "excess" },
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "var(--gap-lg)" }}>
      {statuses.map(({ value, label, status }) => {
        const isActive = statusFilter === value || (value === "all" && !searchParams.has("status"));
        return (
          <button
            key={value}
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              if (value === "all") {
                newParams.delete("status");
              } else {
                newParams.set("status", value);
              }
              setSearchParams(newParams);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              background: isActive ? "var(--ink)" : "var(--surface)",
              color: isActive ? "var(--n-50)" : "var(--text-secondary)",
              border: `1px solid ${isActive ? "var(--ink)" : "var(--border)"}`,
              transition: "all var(--dur-fast) var(--ease-out)",
            }}
          >
            {status && (
              <StatusDot status={status} size={8} />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Calculate trend percentage
function getTrendInfo(history: Array<{ timestamp: string; value: number }>) {
  if (history.length < 2) return null;

  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const change = ((last - first) / first) * 100;

  return {
    change,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
}

type MetricWithHistory = Metric & { history: Array<{ timestamp: string; value: number }>; hasProjections: boolean };

export default function CategoryView({ loaderData }: Route.ComponentProps) {
  const { category, categoryInfo, metrics, totalCount } = loaderData;
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");

  const icon = LUCIDE_MAP[categoryInfo.icon];

  // Filter metrics by status if filter is applied
  const filteredMetrics = statusFilter
    ? metrics.filter((m: MetricWithHistory) => getMetricStatus(m) === statusFilter)
    : metrics;

  return (
    <div>
      {/* Breadcrumb — right-aligned meta row (matches PageHeader crumbs-only treatment) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <Crumb items={[{ label: "Metrics", to: "/metrics" }, { label: categoryInfo.label }]} />
      </div>

      {/* Category header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "var(--gap-xl)" }}>
        {icon && <CatChip icon={icon} family={categoryInfo.family} size={52} />}
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 600 }}>{categoryInfo.label}</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>{categoryInfo.description}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {totalCount} tracked
          </span>
        </div>
      </div>

      <FilterControls />

      {/* Metric list */}
      <Card padding="md">
        {filteredMetrics.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--gap-3xl) 0",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
            }}
          >
            Nothing logged yet.
            {statusFilter ? ` No ${statusFilter} metrics in this category.` : ""}
          </div>
        ) : (
          filteredMetrics.map((metric: MetricWithHistory) => {
            const status = getMetricStatus(metric);
            const rangeM = toRangeBarMetric(metric);
            const sparkData = metric.history.map((h) => h.value);

            return (
              <Link
                key={metric.id}
                to={`/metrics/${category}/${metric.id}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div
                  className="zt-mrow"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18px minmax(0,1.4fr) 80px minmax(0,1.6fr) 140px",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 12px",
                  }}
                >
                  <StatusDot status={status} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {metric.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {format(parseISO(metric.timestamp), "MMM d, yyyy")}
                    </div>
                  </div>
                  {/* Sparkline */}
                  {metric.history.length > 1 ? (
                    <TrendSparkline data={metric.history} width={80} height={32} />
                  ) : (
                    <div />
                  )}
                  {/* RangeBar */}
                  {rangeM ? <RangeBar m={rangeM} height={6} /> : <div />}
                  {/* Value + status badge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span
                        className="zt-tnum"
                        style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-base)" }}
                      >
                        {metric.value.toFixed(1)}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-2xs)",
                          color: "var(--text-muted)",
                          // No uppercase: preserves case-sensitive units and the
                          // micro sign µ (uppercasing maps µ→Μ → "µmol/L"→"MMOL/L").
                        }}
                      >
                        {metric.unit}
                      </span>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </Card>

      {/* Range legend */}
      <div
        style={{
          marginTop: "var(--gap-lg)",
          padding: "0 8px",
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 16, height: 8, background: "var(--vital-100)", borderRadius: "var(--radius-xs)" }} />
          Optimal
        </span>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 16, height: 8, background: "var(--n-150)", borderRadius: "var(--radius-xs)" }} />
          Reference
        </span>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 3, height: 12, background: "var(--ink)", borderRadius: 2 }} />
          Value
        </span>
      </div>

      {/* Sparse-category guidance — keeps a 1–3 metric category from reading as
          an empty page; turns the whitespace into a next action. */}
      {totalCount > 0 && totalCount <= 3 && (
        <p
          style={{
            marginTop: "var(--gap-2xl)",
            textAlign: "center",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.04em",
          }}
        >
          {totalCount} tracked metric{totalCount === 1 ? "" : "s"} in{" "}
          {categoryInfo.label.toLowerCase()}.{" "}
          <Link to="/import" style={{ color: "var(--accent)" }}>
            Import more →
          </Link>
        </p>
      )}
    </div>
  );
}
