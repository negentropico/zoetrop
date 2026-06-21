import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/index";
import {
  CATEGORY_INFO,
  type MetricCategory,
  type MetricStatus,
  type Metric,
} from "~/types/metrics";
import { getMetricTargets, getMetricStatus } from "~/lib/metrics";
import { requireSubjectCtx } from "~/lib/authz.server";
import { getMetrics } from "~/lib/data.server";
import { dbRowToMetric } from "~/lib/db-mappers.server";
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
import { StatusDot } from "~/components/ui/StatusDot";
import { Sparkline } from "~/components/ui/Sparkline";
import { RangeBar } from "~/components/ui/RangeBar";
import type { MetricWithRange } from "~/components/ui/RangeBar";
import { PageHeader } from "~/components/ui/PageHeader";
import { goldenRanks, sigDelay } from "~/components/ui/Signature";

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

export async function loader({ request }: Route.LoaderArgs) {
  const { ctx } = await requireSubjectCtx(request);
  const rows = await getMetrics(ctx);
  const allMetrics = rows.map(dbRowToMetric);

  // Get latest value for each unique metric name
  const latestByName = new Map<string, Metric>();
  allMetrics.forEach((m) => {
    const existing = latestByName.get(m.name);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latestByName.set(m.name, m);
    }
  });
  const latestMetrics = Array.from(latestByName.values());

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

// Round-5 mobile fix (spirit): the old fixed grid
// (18px/1.4fr/1.6fr/132px) starved the name column at 390px. Columns are
// now flexible (value column sizes to content) and the range bar drops to
// its own row under the name at ≤480px (see the style block in the page).
function MetricRow({ metric }: { metric: MetricWithChartInfo }) {
  const status = getMetricStatus(metric);
  const rangeM = toRangeBarMetric(metric);

  return (
    <Link
      to={`/metrics/${metric.category}/${metric.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        className="zt-mrow zt-metric-row"
        style={{
          display: "grid",
          gridTemplateColumns: "18px minmax(0,1.4fr) minmax(0,1.6fr) max-content",
          alignItems: "center",
          gap: 16,
          padding: "var(--gap-row) 12px",
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
        <span className="zt-metric-range" style={{ minWidth: 0 }}>
          {rangeM ? <RangeBar m={rangeM} height={6} /> : null}
        </span>
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
              color: "var(--text-faint)",
              marginLeft: 6,
              // No uppercase: preserves case-sensitive units and the micro sign
              // µ (uppercasing maps µ→Μ → "µmol/L" renders as "MMOL/L").
            }}
          >
            {metric.unit}
          </span>
        </span>
      </div>
    </Link>
  );
}

// Round-5 LINE-signature: CategorySection receives its φ-stagger rank so the
// catalog cards settle in golden order. No watermark; no grain on rows — the
// character holds without turning the dense list into noise.
function CategorySection({
  category,
  metrics,
  sigIndex,
}: {
  category: MetricCategory;
  metrics: MetricWithChartInfo[];
  sigIndex: number;
}) {
  const info = CATEGORY_INFO[category];
  const icon = LUCIDE_MAP[info.icon];
  if (metrics.length === 0) return null;

  const optimal = metrics.filter((m) => getMetricStatus(m) === "optimal").length;

  return (
    // zt-sig-frame: settle in φ-stagger order; icon tile gets zt-sig-icon hairline frame.
    // Dense rows carry NO watermark and NO per-row grain (grain is canvas-level only).
    <Card padding="md" className="zt-sig-frame" style={{ marginBottom: "var(--gap-lg)", ...sigDelay(sigIndex) }}>
      {/* Category header — round-4 FRAME STRIP (owner pick, exploration A):
          one status dot per marker + mono "N markers · n optimal" readout.
          Supersedes the round-3 ring/CountDots treatments — a ring never
          reads status share (BAKED). */}
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
        {/* zt-sig-icon: hairline frame around the category icon tile */}
        {icon && (
          <span className="zt-sig-icon">
            <CatChip icon={icon} family={info.family} size={34} />
          </span>
        )}
        <div style={{ minWidth: 0 }}>
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
          <div className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)", marginTop: 2 }}>
            {metrics.length} markers · {optimal} optimal
          </div>
        </div>
        {/* frame strip: one dot per marker */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 140 }}>
          {metrics.map((m) => (
            <StatusDot key={m.id} status={getMetricStatus(m)} size={10} />
          ))}
        </div>
      </div>
      {/* Metric rows — no watermark, no grain per-row */}
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
  // φ-stagger ranks for the category section cards (golden-ratio ordering)
  const catRanks = goldenRanks(categories.length);
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

      {/* Category sections — zt-sig-frame + φ-stagger on each card.
          No watermark; no grain on rows (calm dense list). */}
      <div>
        {categories.map((category, i) => (
          <CategorySection
            key={category}
            category={category}
            metrics={filteredByCategory[category] || []}
            sigIndex={catRanks[i]}
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

      {/* Round-5 mobile fix: at ≤480px the range bar drops to its own row so
          the metric name keeps usable width at 390px. */}
      <style>{`
        @media (max-width: 480px) {
          .zt-metric-row {
            grid-template-columns: 18px minmax(0, 1fr) max-content !important;
            row-gap: 8px !important;
          }
          .zt-metric-row > .zt-metric-range {
            grid-column: 2 / -1;
            grid-row: 2;
          }
        }
      `}</style>
    </div>
  );
}
