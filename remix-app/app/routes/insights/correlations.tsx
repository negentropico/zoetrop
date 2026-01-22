import { useSearchParams } from "react-router";
import type { Route } from "./+types/correlations";
import {
  seedCorrelations,
  seedSupplements,
  getCorrelationColor,
  type SupplementCorrelation,
} from "../../lib/seed-data";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Correlations - Wellness Tracker" },
    { name: "description", content: "Supplement-metric correlation analysis" },
  ];
}

export function loader() {
  const correlations = seedCorrelations;
  const supplements = seedSupplements;

  // Group by supplement
  const bySuplement = correlations.reduce((acc, corr) => {
    if (!acc[corr.supplementName]) {
      acc[corr.supplementName] = [];
    }
    acc[corr.supplementName].push(corr);
    return acc;
  }, {} as Record<string, SupplementCorrelation[]>);

  // Stats
  const avgCorrelation =
    correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) /
    correlations.length;

  return {
    correlations,
    supplements,
    bySuplement,
    stats: {
      total: correlations.length,
      strong: correlations.filter((c) => c.significance === "strong").length,
      moderate: correlations.filter((c) => c.significance === "moderate").length,
      weak: correlations.filter((c) => c.significance === "weak").length,
      avgCorrelation: avgCorrelation.toFixed(2),
      significant: correlations.filter((c) => c.pValue < 0.05).length,
    },
  };
}

function CorrelationBar({ correlation }: { correlation: number }) {
  const absCorr = Math.abs(correlation);
  const isPositive = correlation >= 0;
  const width = absCorr * 100;

  return (
    <div className="flex items-center gap-2 w-full max-w-[200px]">
      <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
        {/* Center line */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 dark:bg-gray-600" />
        {/* Bar */}
        <div
          className={`absolute top-0 bottom-0 ${
            isPositive
              ? "bg-green-500 dark:bg-green-600 left-1/2"
              : "bg-red-500 dark:bg-red-600 right-1/2"
          } transition-all`}
          style={{ width: `${width / 2}%` }}
        />
      </div>
      <span
        className={`text-sm font-mono font-medium w-14 text-right ${
          isPositive
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {isPositive ? "+" : ""}
        {correlation.toFixed(2)}
      </span>
    </div>
  );
}

function SignificanceBadge({ significance }: { significance: string }) {
  const colors: Record<string, string> = {
    strong: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    moderate: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    weak: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    none: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[significance]}`}>
      {significance}
    </span>
  );
}

function PValueBadge({ pValue }: { pValue: number }) {
  const isSignificant = pValue < 0.05;
  return (
    <span
      className={`text-xs ${
        isSignificant
          ? "text-green-600 dark:text-green-400"
          : "text-gray-500"
      }`}
    >
      p={pValue.toFixed(3)}
      {isSignificant && " *"}
    </span>
  );
}

export default function Correlations({ loaderData }: Route.ComponentProps) {
  const { correlations, bySuplement, stats } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const filterSignificance = searchParams.get("significance");
  const filterSupplement = searchParams.get("supplement");
  const sortBy = searchParams.get("sort") || "correlation";

  // Filter correlations
  let filtered = [...correlations];
  if (filterSignificance) {
    filtered = filtered.filter((c) => c.significance === filterSignificance);
  }
  if (filterSupplement) {
    filtered = filtered.filter((c) => c.supplementName === filterSupplement);
  }

  // Sort correlations
  if (sortBy === "correlation") {
    filtered.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  } else if (sortBy === "pvalue") {
    filtered.sort((a, b) => a.pValue - b.pValue);
  } else if (sortBy === "supplement") {
    filtered.sort((a, b) => a.supplementName.localeCompare(b.supplementName));
  }

  const supplementNames = [...new Set(correlations.map((c) => c.supplementName))];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.strong}
          </div>
          <div className="text-xs text-gray-500">Strong</div>
        </div>
        <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.moderate}
          </div>
          <div className="text-xs text-gray-500">Moderate</div>
        </div>
        <div className="rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.weak}
          </div>
          <div className="text-xs text-gray-500">Weak</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold">{stats.significant}</div>
          <div className="text-xs text-gray-500">p &lt; 0.05</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Significance filter */}
        <div className="flex gap-2">
          {["all", "strong", "moderate", "weak"].map((sig) => (
            <button
              key={sig}
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                if (sig === "all") {
                  newParams.delete("significance");
                } else {
                  newParams.set("significance", sig);
                }
                setSearchParams(newParams);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                (sig === "all" && !filterSignificance) || filterSignificance === sig
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {sig === "all" ? "All" : sig.charAt(0).toUpperCase() + sig.slice(1)}
            </button>
          ))}
        </div>

        {/* Supplement filter */}
        <select
          value={filterSupplement || ""}
          onChange={(e) => {
            const newParams = new URLSearchParams(searchParams);
            if (e.target.value) {
              newParams.set("supplement", e.target.value);
            } else {
              newParams.delete("supplement");
            }
            setSearchParams(newParams);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="">All Supplements</option>
          {supplementNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set("sort", e.target.value);
            setSearchParams(newParams);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="correlation">Sort by |r|</option>
          <option value="pvalue">Sort by p-value</option>
          <option value="supplement">Sort by Supplement</option>
        </select>
      </div>

      {/* Correlation list */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Supplement
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Metric
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Correlation
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                Significance
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                Lag
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                p-value
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">
                n
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((corr) => (
              <tr
                key={corr.id}
                className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{corr.supplementName}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {corr.metricName}
                </td>
                <td className="px-4 py-3">
                  <CorrelationBar correlation={corr.correlation} />
                </td>
                <td className="px-4 py-3 text-center">
                  <SignificanceBadge significance={corr.significance} />
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">
                  {corr.lagDays}d
                </td>
                <td className="px-4 py-3 text-center">
                  <PValueBadge pValue={corr.pValue} />
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-500">
                  {corr.sampleSize}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No correlations found matching the current filters.
        </div>
      )}

      {/* Interpretation guide */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="font-medium mb-3">Interpretation Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              Correlation Strength
            </h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong className="text-green-600 dark:text-green-400">Strong</strong>:{" "}
                |r| ≥ 0.7 — Reliable relationship
              </li>
              <li>
                <strong className="text-blue-600 dark:text-blue-400">Moderate</strong>:{" "}
                |r| 0.4-0.7 — Meaningful but variable
              </li>
              <li>
                <strong className="text-yellow-600 dark:text-yellow-400">Weak</strong>:{" "}
                |r| 0.2-0.4 — May be influenced by other factors
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              Statistical Significance
            </h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>p &lt; 0.05</strong>: Statistically significant (*)
              </li>
              <li>
                <strong>Lag days</strong>: Time offset for correlation analysis
              </li>
              <li>
                <strong>n</strong>: Sample size (more is better)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
