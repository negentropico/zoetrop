import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/index";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "../../types/metrics";
import { getRealMetrics, getLatestRealMetrics, getMetricTargets } from "../../lib/real-data";
import { getMetricStatus } from "~/lib/metrics";
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
import { Card } from "../../components/ui/Card";
import { CatChip } from "../../components/ui/CatChip";
import { StatusDot } from "../../components/ui/StatusDot";
import { Sparkline } from "../../components/ui/Sparkline";
import { RangeBar } from "../../components/ui/RangeBar";
import type { MetricWithRange } from "../../components/ui/RangeBar";
import { PageHeader } from "../../components/ui/PageHeader";

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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Metrics - Zoetrop" },
    { name: "description", content: "View and manage wellness metrics" },
  ];
}

type MetricWithChartInfo = Metric & { historyCount: number; hasProjections: boolean };

export function loader() {
  // Use real tracked data from vault
  const allMetrics = getRealMetrics();
  const latestMetrics = getLatestRealMetrics();

  // Count history points per metric name
  const countByName = new Map<string, number>();
  allMetrics.forEach((m) => {
    countByName.set(m.name, (countByName.get(m.name) || 0) + 1);
  });

  // Attach chart info
  const metrics: MetricWithChartInfo[] = latestMetrics.map((m) => ({
    ...m,
    historyCount: countByName.get(m.name) || 1,
    hasProjections: !!getMetricTargets(m.name),
  }));

  // Group by category
  const byCategory = (Object.keys(CATEGORY_INFO) as MetricCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = metrics
        .filter((m) => m.category === cat)
        .sort((a, b) => a.name.localeCompare(b.name));
      return acc;
    },
    {} as Record<MetricCategory, MetricWithChartInfo[]>
  );

  return { metrics, byCategory };
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

// Derive simple sparkline from no history (single value gives no line — skip)
function getSparkData(m: MetricWithChartInfo): number[] | null {
  // We only have current value in the overview — return null to skip sparkline
  return null;
}

function FilterPill({
  active,
  label,
  count,
  status,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  status?: MetricStatus;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
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
        background: active ? "var(--ink)" : "var(--surface)",
        color: active ? "var(--n-50)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--ink)" : "var(--border)"}`,
        transition: "all var(--dur-fast) var(--ease-out)",
      }}
    >
      {status && <StatusDot status={status} size={8} />}
      {label}
      <span
        className="zt-tnum"
        style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", opacity: active ? 0.85 : 0.6 }}
      >
        {count}
      </span>
    </button>
  );
}

function MetricRow({ metric }: { metric: MetricWithChartInfo }) {
  const status = getMetricStatus(metric);
  const rangeM = toRangeBarMetric(metric);

  return (
    <Link
      to={`/metrics/${metric.category}/${metric.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        className="zt-mrow"
        style={{
          display: "grid",
          gridTemplateColumns: "18px minmax(120px,1.4fr) minmax(120px,1.6fr) 132px",
          alignItems: "center",
          gap: 16,
          padding: "12px 12px",
        }}
      >
        <StatusDot status={status} />
        <span
          style={{
            fontWeight: 600,
            fontSize: "var(--text-base)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--ink)",
          }}
        >
          {metric.name}
        </span>
        {rangeM ? <RangeBar m={rangeM} height={6} /> : <div />}
        <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
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
              marginLeft: 6,
              textTransform: "uppercase",
            }}
          >
            {metric.unit}
          </span>
        </span>
      </div>
    </Link>
  );
}

function CategorySection({
  category,
  metrics,
}: {
  category: MetricCategory;
  metrics: MetricWithChartInfo[];
}) {
  const info = CATEGORY_INFO[category];
  const icon = LUCIDE_MAP[info.icon];
  if (metrics.length === 0) return null;

  const statusCounts = metrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  return (
    <Card padding="md" style={{ marginBottom: "var(--gap-lg)" }}>
      {/* Category header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "4px 8px 16px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 8,
        }}
      >
        {icon && <CatChip icon={icon} family={info.family} size={34} />}
        <Link
          to={`/metrics/${category}`}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "var(--text-lg)",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          {info.label}
        </Link>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          {metrics.length}
        </span>
        {/* Status count dots */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {(["optimal", "borderline", "deficient", "excess"] as MetricStatus[]).map((s) =>
            (statusCounts[s] || 0) > 0 ? (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <StatusDot status={s} size={8} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
                  {statusCounts[s]}
                </span>
              </span>
            ) : null
          )}
        </div>
      </div>
      {/* Metric rows */}
      {metrics.map((metric) => (
        <MetricRow key={metric.id} metric={metric} />
      ))}
    </Card>
  );
}

export default function MetricsIndex({ loaderData }: Route.ComponentProps) {
  const { metrics, byCategory } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const filterStatus = searchParams.get("status") as MetricStatus | null;

  // Status counts for all metrics
  const statusCounts = metrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  // Filter by status if selected
  const filteredByCategory = filterStatus
    ? (Object.keys(byCategory) as MetricCategory[]).reduce(
        (acc, cat) => {
          acc[cat] = byCategory[cat].filter((m) => getMetricStatus(m) === filterStatus);
          return acc;
        },
        {} as Record<MetricCategory, MetricWithChartInfo[]>
      )
    : byCategory;

  const filteredCount = filterStatus
    ? Object.values(filteredByCategory).reduce((sum, arr) => sum + arr.length, 0)
    : metrics.length;

  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];
  const statusOrder: MetricStatus[] = ["optimal", "borderline", "deficient", "excess"];
  const STATUS_LABEL: Record<MetricStatus, string> = {
    optimal: "Optimal",
    borderline: "Borderline",
    deficient: "Deficient",
    excess: "Excess",
  };

  return (
    <div>
      <PageHeader
        eyebrow="YOUR LAST LAB FRAME"
        title="All metrics"
        sub={`${metrics.length} metrics across ${categories.length} categories.`}
      />

      {/* Status filter pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "var(--gap-xl)" }}>
        <FilterPill
          active={!filterStatus}
          label="All"
          count={metrics.length}
          onClick={() => {
            const p = new URLSearchParams(searchParams);
            p.delete("status");
            setSearchParams(p);
          }}
        />
        {statusOrder.map((s) => {
          const count = statusCounts[s] || 0;
          if (count === 0) return null;
          return (
            <FilterPill
              key={s}
              active={filterStatus === s}
              label={STATUS_LABEL[s]}
              status={s}
              count={count}
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                if (filterStatus === s) {
                  p.delete("status");
                } else {
                  p.set("status", s);
                }
                setSearchParams(p);
              }}
            />
          );
        })}
      </div>

      {/* Category sections */}
      <div>
        {categories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            metrics={filteredByCategory[category] || []}
          />
        ))}
      </div>

      {filteredCount === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--gap-3xl) 0",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
          }}
        >
          Nothing logged yet. Your first frame starts when you begin.
        </div>
      )}

      {/* Range legend */}
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: "var(--gap-lg)",
          padding: "0 8px",
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
    </div>
  );
}
