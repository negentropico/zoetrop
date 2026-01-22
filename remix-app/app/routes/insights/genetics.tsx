import { useSearchParams } from "react-router";
import type { Route } from "./+types/genetics";
import {
  seedGeneticVariants,
  type GeneticVariant,
} from "../../lib/seed-data";
import {
  CONFIDENCE_LEVELS,
  VARIANT_CATEGORIES,
  type ConfidenceLevel,
  type VariantCategory,
} from "../../types/genetics";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Genetic Profile - Wellness Tracker" },
    { name: "description", content: "Genetic variants informing supplement protocol" },
  ];
}

export function loader() {
  const variants = seedGeneticVariants;

  // Group by category
  const byCategory = variants.reduce((acc, v) => {
    if (!acc[v.category]) {
      acc[v.category] = [];
    }
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, GeneticVariant[]>);

  // Stats
  const byConfidence = variants.reduce((acc, v) => {
    acc[v.confidence] = (acc[v.confidence] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byImpact = variants.reduce((acc, v) => {
    acc[v.impact] = (acc[v.impact] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    variants,
    byCategory,
    stats: {
      total: variants.length,
      byConfidence,
      byImpact,
      highImpact: variants.filter((v) => v.impact === "high").length,
      k1Confirmed: byConfidence["K1"] || 0,
    },
  };
}

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const info = CONFIDENCE_LEVELS[confidence];
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded ${info.color} bg-current/10`}
      title={info.description}
    >
      {info.label}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    moderate: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    informational: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[impact]}`}>
      {impact}
    </span>
  );
}

function CategoryIcon({ category }: { category: VariantCategory }) {
  const icons: Record<VariantCategory, string> = {
    methylation: "🧬",
    detoxification: "🔄",
    neurotransmitter: "🧠",
    nutritional: "🥗",
    cardiovascular: "❤️",
    inflammation: "🔥",
    metabolism: "⚡",
  };
  return <span className="text-lg">{icons[category]}</span>;
}

function VariantCard({ variant }: { variant: GeneticVariant }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{variant.gene}</span>
            <ConfidenceBadge confidence={variant.confidence} />
          </div>
          {variant.rsid && (
            <span className="text-xs text-gray-500 font-mono">{variant.rsid}</span>
          )}
        </div>
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {variant.genotype}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ImpactBadge impact={variant.impact} />
          <span className="text-xs text-gray-500">
            {VARIANT_CATEGORIES[variant.category].label}
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {variant.clinicalImplication}
        </p>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs font-medium text-gray-500 mb-1">Protocol Action</div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {variant.protocolAction}
          </p>
        </div>

        {variant.notes && (
          <p className="text-xs text-gray-500 italic">{variant.notes}</p>
        )}
      </div>
    </div>
  );
}

export default function Genetics({ loaderData }: Route.ComponentProps) {
  const { variants, byCategory, stats } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const filterCategory = searchParams.get("category") as VariantCategory | null;
  const filterConfidence = searchParams.get("confidence") as ConfidenceLevel | null;
  const filterImpact = searchParams.get("impact");

  // Filter variants
  let filtered = [...variants];
  if (filterCategory) {
    filtered = filtered.filter((v) => v.category === filterCategory);
  }
  if (filterConfidence) {
    filtered = filtered.filter((v) => v.confidence === filterConfidence);
  }
  if (filterImpact) {
    filtered = filtered.filter((v) => v.impact === filterImpact);
  }

  const categories = Object.keys(VARIANT_CATEGORIES) as VariantCategory[];
  const confidenceLevels = Object.keys(CONFIDENCE_LEVELS) as ConfidenceLevel[];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Variants</div>
        </div>
        <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.k1Confirmed}
          </div>
          <div className="text-xs text-gray-500">K1 Confirmed</div>
        </div>
        <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.byConfidence["K2"] || 0}
          </div>
          <div className="text-xs text-gray-500">K2 High Confidence</div>
        </div>
        <div className="rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.byConfidence["K3"] || 0}
          </div>
          <div className="text-xs text-gray-500">K3 Inferred</div>
        </div>
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.highImpact}
          </div>
          <div className="text-xs text-gray-500">High Impact</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Category filter */}
        <select
          value={filterCategory || ""}
          onChange={(e) => {
            const newParams = new URLSearchParams(searchParams);
            if (e.target.value) {
              newParams.set("category", e.target.value);
            } else {
              newParams.delete("category");
            }
            setSearchParams(newParams);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {VARIANT_CATEGORIES[cat].label}
            </option>
          ))}
        </select>

        {/* Confidence filter */}
        <div className="flex gap-2">
          {["all", ...confidenceLevels].map((conf) => (
            <button
              key={conf}
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                if (conf === "all") {
                  newParams.delete("confidence");
                } else {
                  newParams.set("confidence", conf);
                }
                setSearchParams(newParams);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                (conf === "all" && !filterConfidence) || filterConfidence === conf
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {conf === "all" ? "All" : CONFIDENCE_LEVELS[conf as ConfidenceLevel].label}
            </button>
          ))}
        </div>

        {/* Impact filter */}
        <select
          value={filterImpact || ""}
          onChange={(e) => {
            const newParams = new URLSearchParams(searchParams);
            if (e.target.value) {
              newParams.set("impact", e.target.value);
            } else {
              newParams.delete("impact");
            }
            setSearchParams(newParams);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="">All Impacts</option>
          <option value="high">High Impact</option>
          <option value="moderate">Moderate Impact</option>
          <option value="low">Low Impact</option>
          <option value="informational">Informational</option>
        </select>

        {/* Clear filters */}
        {(filterCategory || filterConfidence || filterImpact) && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Showing {filtered.length} of {stats.total} variants
      </div>

      {/* Variant grid */}
      {filterCategory ? (
        // Single category view
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((variant) => (
            <VariantCard key={variant.id} variant={variant} />
          ))}
        </div>
      ) : (
        // Grouped by category view
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryVariants = filtered.filter((v) => v.category === category);
            if (categoryVariants.length === 0) return null;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <CategoryIcon category={category} />
                  <h2 className="text-lg font-medium">
                    {VARIANT_CATEGORIES[category].label}
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({categoryVariants.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryVariants.map((variant) => (
                    <VariantCard key={variant.id} variant={variant} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No variants found matching the current filters.
        </div>
      )}

      {/* Confidence guide */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="font-medium mb-3">Confidence Level Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {confidenceLevels.map((level) => {
            const info = CONFIDENCE_LEVELS[level];
            return (
              <div key={level} className="flex items-start gap-3">
                <ConfidenceBadge confidence={level} />
                <div>
                  <div className="font-medium">{info.label}</div>
                  <div className="text-gray-500">{info.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification prompt */}
      <div className="rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20 p-4">
        <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
          K3 Verification Needed
        </h3>
        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
          The following variants are K3 (inferred from protocol) and should be verified
          through SelfDecode or genetic testing:
        </p>
        <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
          {variants
            .filter((v) => v.confidence === "K3")
            .map((v) => (
              <li key={v.id} className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                <strong>{v.gene}</strong> - {v.clinicalImplication}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
