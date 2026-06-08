import { Link } from "react-router";
import type { Route } from "./+types/home";
import { CATEGORY_INFO, type MetricCategory, type MetricStatus, type Metric } from "../types/metrics";
import { CESSATION_PHASES } from "../types/protocol";
import { CONFIDENCE_LEVELS } from "../types/genetics";
import {
  seedCorrelations,
  seedGeneticVariants,
  getCorrelationColor,
} from "../lib/seed-data";
import {
  realCessationLog,
  realProtocolVersions,
  realSupplements,
  getCessationDay,
  getCurrentCessationPhase,
} from "../lib/protocol-data";
import { getLatestRealMetrics } from "../lib/real-data";
import { getMetricStatus } from "~/lib/metrics";
import { differenceInDays, parseISO } from "date-fns";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Zoetrop" },
    { name: "description", content: "Comprehensive wellness tracking dashboard" },
  ];
}

export function loader() {
  // Top correlations by absolute value
  const topCorrelations = [...seedCorrelations]
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 3);

  // High-impact genetic variants
  const highImpactVariants = seedGeneticVariants
    .filter((v) => v.impact === "high")
    .slice(0, 3);

  // K3 variants needing verification
  const k3Variants = seedGeneticVariants.filter((v) => v.confidence === "K3");

  // Real cessation data
  const cessation = realCessationLog[0];
  const cessationDay = cessation ? getCessationDay() : 0;
  const cessationPhase = getCurrentCessationPhase(cessationDay);
  const targetDay = 150;

  // Real metrics data
  const latestMetrics = getLatestRealMetrics();
  const byCategory = (Object.keys(CATEGORY_INFO) as MetricCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = latestMetrics.filter((m) => m.category === cat);
      return acc;
    },
    {} as Record<MetricCategory, Metric[]>
  );

  // Status counts across all metrics
  const statusCounts = latestMetrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  // Protocol data
  const currentVersion = realProtocolVersions[realProtocolVersions.length - 1];
  const activeSupplements = realSupplements.filter((s) => s.isActive).length;

  return {
    topCorrelations,
    highImpactVariants,
    k3Variants,
    stats: {
      totalCorrelations: seedCorrelations.length,
      strongCorrelations: seedCorrelations.filter((c) => c.significance === "strong").length,
      totalVariants: seedGeneticVariants.length,
      confirmedVariants: seedGeneticVariants.filter((v) => v.confidence === "K1").length,
    },
    cessationDay,
    cessationPhase,
    targetDay,
    byCategory,
    statusCounts,
    totalMetrics: latestMetrics.length,
    currentVersion: currentVersion?.version || "—",
    activeSupplements,
  };
}

function StatusDot({ status }: { status: MetricStatus }) {
  const colors: Record<MetricStatus, string> = {
    optimal: "bg-green-500",
    borderline: "bg-yellow-500",
    deficient: "bg-red-500",
    excess: "bg-orange-500",
  };
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} />;
}

function CategoryCard({
  category,
  metrics,
}: {
  category: MetricCategory;
  metrics: Metric[];
}) {
  const info = CATEGORY_INFO[category];

  const statusCounts = metrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  return (
    <Link
      to={`/metrics/${category}`}
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group"
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg">{info.icon}</span>
        <h3 className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {info.label}
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {info.description}
      </p>
      {metrics.length > 0 ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">{metrics.length} tracked</span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          {statusCounts.optimal > 0 && (
            <span className="flex items-center gap-1">
              <StatusDot status="optimal" />
              <span className="text-gray-500">{statusCounts.optimal}</span>
            </span>
          )}
          {statusCounts.borderline > 0 && (
            <span className="flex items-center gap-1">
              <StatusDot status="borderline" />
              <span className="text-gray-500">{statusCounts.borderline}</span>
            </span>
          )}
          {(statusCounts.deficient > 0 || statusCounts.excess > 0) && (
            <span className="flex items-center gap-1">
              <StatusDot status={statusCounts.deficient > 0 ? "deficient" : "excess"} />
              <span className="text-gray-500">
                {(statusCounts.deficient || 0) + (statusCounts.excess || 0)}
              </span>
            </span>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-400">No data yet</div>
      )}
    </Link>
  );
}

function CessationProgress({
  currentDay,
  cessationPhase,
  targetDay,
}: {
  currentDay: number;
  cessationPhase: (typeof CESSATION_PHASES)[0];
  targetDay: number;
}) {
  const progressPercent = Math.max(Math.min((currentDay / targetDay) * 100, 100), 0);

  return (
    <Link
      to="/protocol/cessation"
      className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors block"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Cessation Protocol</h3>
        <span className="text-xs text-blue-600 dark:text-blue-400">
          View details
        </span>
      </div>

      {/* Big day counter */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold">Day {currentDay}</span>
        <span className="text-sm text-gray-500">of {targetDay}</span>
      </div>

      {/* Current phase */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {cessationPhase.label} phase — {cessationPhase.focus}
      </div>

      {/* Progress bar with phase markers */}
      <div className="relative mb-2">
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="absolute inset-0 flex">
          {CESSATION_PHASES.map((phase) => (
            <div
              key={phase.phase}
              className="border-r border-white/60 dark:border-gray-950/60 last:border-0"
              style={{
                width: `${((phase.dayRange.end - phase.dayRange.start + 1) / targetDay) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Phase labels */}
      <div className="flex text-xs text-gray-400">
        {CESSATION_PHASES.map((phase) => (
          <div
            key={phase.phase}
            className={`text-center ${
              cessationPhase.phase === phase.phase ? "text-gray-900 dark:text-white font-medium" : ""
            }`}
            style={{
              width: `${((phase.dayRange.end - phase.dayRange.start + 1) / targetDay) * 100}%`,
            }}
          >
            {phase.label}
          </div>
        ))}
      </div>
    </Link>
  );
}

function TopCorrelations({
  correlations,
  stats,
}: {
  correlations: typeof seedCorrelations;
  stats: { totalCorrelations: number; strongCorrelations: number };
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Top Correlations</h3>
        <Link
          to="/insights/correlations"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all ({stats.totalCorrelations})
        </Link>
      </div>
      <div className="space-y-3">
        {correlations.map((corr) => {
          const colorClass = getCorrelationColor(corr.significance);
          const sign = corr.correlation >= 0 ? "+" : "";
          return (
            <div
              key={corr.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div>
                <div className="font-medium text-sm">{corr.supplementName}</div>
                <div className="text-xs text-gray-500">
                  → {corr.metricName} ({corr.lagDays}d lag)
                </div>
              </div>
              <span className={`font-mono font-medium ${colorClass}`}>
                {sign}
                {corr.correlation.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
        {stats.strongCorrelations} strong correlations (|r| ≥ 0.7)
      </div>
    </div>
  );
}

function GeneticInsights({
  highImpact,
  k3Variants,
  stats,
}: {
  highImpact: typeof seedGeneticVariants;
  k3Variants: typeof seedGeneticVariants;
  stats: { totalVariants: number; confirmedVariants: number };
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Genetic Insights</h3>
        <Link
          to="/insights/genetics"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all ({stats.totalVariants})
        </Link>
      </div>
      <div className="space-y-3">
        {highImpact.map((variant) => {
          const confidence = CONFIDENCE_LEVELS[variant.confidence];
          return (
            <div
              key={variant.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{variant.gene}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${confidence.color} bg-current/10`}
                  >
                    {confidence.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500">{variant.protocolAction}</div>
              </div>
              <span className="text-xs text-gray-400 font-mono">{variant.genotype}</span>
            </div>
          );
        })}
      </div>
      {k3Variants.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            {k3Variants.length} K3 variant{k3Variants.length !== 1 ? "s" : ""} need
            verification
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const {
    topCorrelations,
    highImpactVariants,
    k3Variants,
    stats,
    cessationDay,
    cessationPhase,
    targetDay,
    byCategory,
    statusCounts,
    totalMetrics,
    currentVersion,
    activeSupplements,
  } = loaderData;
  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

  const attentionItems = (statusCounts.deficient || 0) + (statusCounts.excess || 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive wellness tracking across 9 metric categories
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/metrics"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <div className="text-2xl font-bold">{totalMetrics}</div>
          <div className="text-xs text-gray-500">Metrics Tracked</div>
        </Link>
        <Link
          to="/metrics?status=deficient"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <div className={`text-2xl font-bold ${attentionItems > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {attentionItems}
          </div>
          <div className="text-xs text-gray-500">Need Attention</div>
        </Link>
        <Link
          to="/protocol/supplements"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <div className="text-2xl font-bold">{activeSupplements}</div>
          <div className="text-xs text-gray-500">Active Supplements</div>
        </Link>
        <Link
          to="/protocol/versions"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <div className="text-2xl font-bold">{currentVersion}</div>
          <div className="text-xs text-gray-500">Protocol Version</div>
        </Link>
      </div>

      {/* Protocol row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CessationProgress
          currentDay={cessationDay}
          cessationPhase={cessationPhase}
          targetDay={targetDay}
        />
        <div className="grid grid-cols-1 gap-4">
          <TopCorrelations correlations={topCorrelations} stats={stats} />
        </div>
      </div>

      {/* Insights row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GeneticInsights
          highImpact={highImpactVariants}
          k3Variants={k3Variants}
          stats={stats}
        />
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Metric Status</h3>
            <Link
              to="/metrics"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm">Optimal</span>
              </div>
              <span className="font-medium">{statusCounts.optimal || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="text-sm">Borderline</span>
              </div>
              <span className="font-medium">{statusCounts.borderline || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sm">Deficient</span>
              </div>
              <span className="font-medium">{statusCounts.deficient || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-sm">Excess</span>
              </div>
              <span className="font-medium">{statusCounts.excess || 0}</span>
            </div>
          </div>
          {/* Status bar */}
          {totalMetrics > 0 && (
            <div className="mt-4 h-2 rounded-full overflow-hidden flex">
              {statusCounts.optimal > 0 && (
                <div
                  className="bg-green-500"
                  style={{ width: `${((statusCounts.optimal || 0) / totalMetrics) * 100}%` }}
                />
              )}
              {statusCounts.borderline > 0 && (
                <div
                  className="bg-yellow-500"
                  style={{ width: `${((statusCounts.borderline || 0) / totalMetrics) * 100}%` }}
                />
              )}
              {statusCounts.deficient > 0 && (
                <div
                  className="bg-red-500"
                  style={{ width: `${((statusCounts.deficient || 0) / totalMetrics) * 100}%` }}
                />
              )}
              {statusCounts.excess > 0 && (
                <div
                  className="bg-orange-500"
                  style={{ width: `${((statusCounts.excess || 0) / totalMetrics) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Categories grid */}
      <div>
        <h2 className="text-lg font-medium mb-4">Metric Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <CategoryCard
              key={category}
              category={category}
              metrics={byCategory[category] || []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
