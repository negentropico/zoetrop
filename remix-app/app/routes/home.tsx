import { Link } from "react-router";
import type { Route } from "./+types/home";
import { CATEGORY_INFO, type MetricCategory } from "../types/metrics";
import { CESSATION_PHASES } from "../types/protocol";
import { CONFIDENCE_LEVELS } from "../types/genetics";
import {
  seedCorrelations,
  seedGeneticVariants,
  getCorrelationColor,
} from "../lib/seed-data";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Wellness Tracker" },
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
  };
}

function CategoryCard({ category }: { category: MetricCategory }) {
  const info = CATEGORY_INFO[category];
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-lg ${info.color}`}>{info.icon}</span>
        <h3 className="font-medium">{info.label}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {info.description}
      </p>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
        No data yet
      </div>
    </div>
  );
}

function CessationProgress() {
  // Placeholder - will calculate from cessation log
  const currentDay = 0;
  const targetDay = 150;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Cessation Protocol</h3>
        <Link
          to="/protocol/cessation"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View details
        </Link>
      </div>
      <div className="space-y-2">
        {CESSATION_PHASES.map((phase) => (
          <div key={phase.phase} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {phase.label}
            </span>
            <span className="text-gray-500 dark:text-gray-500">
              Days {phase.dayRange.start}-{phase.dayRange.end}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Day {currentDay}</span>
          <span>Target: {targetDay} days</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${(currentDay / targetDay) * 100}%` }}
          />
        </div>
      </div>
    </div>
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
  const { topCorrelations, highImpactVariants, k3Variants, stats } = loaderData;
  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

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
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold">{stats.totalCorrelations}</div>
          <div className="text-xs text-gray-500">Correlations</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.strongCorrelations}
          </div>
          <div className="text-xs text-gray-500">Strong (|r| ≥ 0.7)</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold">{stats.totalVariants}</div>
          <div className="text-xs text-gray-500">Genetic Variants</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.confirmedVariants}
          </div>
          <div className="text-xs text-gray-500">K1 Confirmed</div>
        </div>
      </div>

      {/* Insights row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopCorrelations correlations={topCorrelations} stats={stats} />
        <GeneticInsights
          highImpact={highImpactVariants}
          k3Variants={k3Variants}
          stats={stats}
        />
      </div>

      {/* Protocol row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CessationProgress />
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Protocol Status</h3>
            <Link
              to="/protocol/versions"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View timeline
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track protocol evolution from 601 → 602 → 603
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              to="/protocol"
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Overview
            </Link>
            <Link
              to="/protocol/supplements"
              className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Supplements
            </Link>
          </div>
        </div>
      </div>

      {/* Categories grid */}
      <div>
        <h2 className="text-lg font-medium mb-4">Metric Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <CategoryCard key={category} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}
