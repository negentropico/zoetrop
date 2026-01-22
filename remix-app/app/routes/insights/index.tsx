import { Link } from "react-router";
import type { Route } from "./+types/index";
import {
  seedCorrelations,
  seedGeneticVariants,
  getCorrelationColor,
} from "../../lib/seed-data";
import { CONFIDENCE_LEVELS, VARIANT_CATEGORIES } from "../../types/genetics";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Insights Overview - Wellness Tracker" },
    { name: "description", content: "Data-driven insights from your wellness data" },
  ];
}

export function loader() {
  // Top correlations
  const topCorrelations = [...seedCorrelations]
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 5);

  // High-impact genetic variants
  const highImpactVariants = seedGeneticVariants.filter(
    (v) => v.impact === "high"
  );

  // Variant counts by category
  const variantsByCategory = seedGeneticVariants.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Correlation stats
  const strongCorrelations = seedCorrelations.filter(
    (c) => c.significance === "strong"
  );
  const significantCorrelations = seedCorrelations.filter((c) => c.pValue < 0.05);

  return {
    topCorrelations,
    highImpactVariants,
    variantsByCategory,
    stats: {
      totalCorrelations: seedCorrelations.length,
      strongCorrelations: strongCorrelations.length,
      significantCorrelations: significantCorrelations.length,
      totalVariants: seedGeneticVariants.length,
      confirmedVariants: seedGeneticVariants.filter((v) => v.confidence === "K1")
        .length,
    },
  };
}

function CorrelationBadge({
  correlation,
  significance,
}: {
  correlation: number;
  significance: string;
}) {
  const colorClass = getCorrelationColor(significance);
  const sign = correlation >= 0 ? "+" : "";
  return (
    <span className={`font-mono font-medium ${colorClass}`}>
      {sign}
      {correlation.toFixed(2)}
    </span>
  );
}

export default function InsightsIndex({ loaderData }: Route.ComponentProps) {
  const { topCorrelations, highImpactVariants, variantsByCategory, stats } =
    loaderData;

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-2xl font-bold">{stats.totalCorrelations}</div>
          <div className="text-sm text-gray-500">Total Correlations</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.strongCorrelations}
          </div>
          <div className="text-sm text-gray-500">Strong (|r| ≥ 0.7)</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-2xl font-bold">{stats.totalVariants}</div>
          <div className="text-sm text-gray-500">Genetic Variants</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.confirmedVariants}
          </div>
          <div className="text-sm text-gray-500">K1 Confirmed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top correlations */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Strongest Correlations</h2>
            <Link
              to="/insights/correlations"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {topCorrelations.map((corr) => (
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
                <CorrelationBadge
                  correlation={corr.correlation}
                  significance={corr.significance}
                />
              </div>
            ))}
          </div>
        </div>

        {/* High-impact variants */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Protocol-Defining Variants</h2>
            <Link
              to="/insights/genetics"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {highImpactVariants.slice(0, 5).map((variant) => {
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
                    <div className="text-xs text-gray-500">
                      {variant.protocolAction}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{variant.genotype}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick insights */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
          Key Insights
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>
              <strong>Methylfolate → Homocysteine</strong> shows a strong negative
              correlation (r=-0.71), supporting the MTHFR protocol action.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>
              <strong>Magnesium</strong> correlates positively with both HRV and
              sleep performance, suggesting autonomic benefits.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>
              <strong>FAAH</strong> and <strong>CYP1A2</strong> variants are K3
              (inferred) - consider SelfDecode verification.
            </span>
          </li>
        </ul>
      </div>

      {/* Variant categories */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="font-medium mb-4">Variants by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(variantsByCategory).map(([category, count]) => {
            const info = VARIANT_CATEGORIES[category as keyof typeof VARIANT_CATEGORIES];
            return (
              <div key={category} className="text-center">
                <div className="text-xl font-bold">{count}</div>
                <div className="text-sm text-gray-500">{info?.label || category}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
