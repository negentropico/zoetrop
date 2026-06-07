import { useState } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/supplements";
import { realSupplements } from "../../lib/protocol-data";
import { SUPPLEMENT_TIERS, type SupplementTier, type Supplement } from "../../types/protocol";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Supplements - Zoetrop" },
    { name: "description", content: "Manage supplement protocol" },
  ];
}

export function loader() {
  const supplements = realSupplements;

  // Group by tier
  const byTier = supplements.reduce((acc, supp) => {
    if (!acc[supp.tier]) acc[supp.tier] = [];
    acc[supp.tier].push(supp);
    return acc;
  }, {} as Record<SupplementTier, Supplement[]>);

  // Stats
  const totalDaily = supplements
    .filter((s) => s.frequency === "daily" && s.isActive)
    .reduce((sum, s) => sum + 1, 0);

  return {
    supplements,
    byTier,
    stats: {
      total: supplements.length,
      active: supplements.filter((s) => s.isActive).length,
      withGenetic: supplements.filter((s) => s.geneticBasis).length,
      dailyCount: totalDaily,
    },
  };
}

function TierBadge({ tier }: { tier: SupplementTier }) {
  const info = SUPPLEMENT_TIERS[tier];
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${info.color} bg-current/10`}>
      {info.label}
    </span>
  );
}

function SupplementCard({ supplement }: { supplement: Supplement }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border bg-white dark:bg-gray-900 p-4 transition-all ${
        supplement.isActive
          ? "border-gray-200 dark:border-gray-800"
          : "border-gray-100 dark:border-gray-900 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{supplement.name}</h3>
            <TierBadge tier={supplement.tier} />
            {!supplement.isActive && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                Inactive
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {supplement.dosage} {supplement.unit} • {supplement.frequency}
            {supplement.timing && ` • ${supplement.timing}`}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {expanded ? "−" : "+"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2 text-sm">
          {supplement.geneticBasis && (
            <div>
              <span className="text-gray-500">Genetic basis:</span>{" "}
              <span className="text-gray-900 dark:text-gray-100">{supplement.geneticBasis}</span>
            </div>
          )}
          {supplement.notes && (
            <div>
              <span className="text-gray-500">Notes:</span>{" "}
              <span className="text-gray-900 dark:text-gray-100">{supplement.notes}</span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
              Edit
            </button>
            <button className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
              {supplement.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Supplements({ loaderData }: Route.ComponentProps) {
  const { supplements, byTier, stats } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const tierFilter = searchParams.get("tier") as SupplementTier | null;
  const showInactive = searchParams.get("inactive") === "true";

  // Filter supplements
  let filtered = supplements;
  if (tierFilter) {
    filtered = filtered.filter((s) => s.tier === tierFilter);
  }
  if (!showInactive) {
    filtered = filtered.filter((s) => s.isActive);
  }

  const tiers = Object.keys(SUPPLEMENT_TIERS) as SupplementTier[];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-2xl font-bold">{stats.active}</div>
          <div className="text-sm text-gray-500">Active Supplements</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-2xl font-bold">{stats.dailyCount}</div>
          <div className="text-sm text-gray-500">Daily Items</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-2xl font-bold">{stats.withGenetic}</div>
          <div className="text-sm text-gray-500">Genetic-Based</div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-2xl font-bold">{byTier.tier1?.length || 0}</div>
          <div className="text-sm text-gray-500">Tier 1 (Essential)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete("tier");
              setSearchParams(newParams);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              !tierFilter
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All Tiers
          </button>
          {tiers.map((tier) => {
            const info = SUPPLEMENT_TIERS[tier];
            const count = byTier[tier]?.filter((s) => showInactive || s.isActive).length || 0;
            return (
              <button
                key={tier}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set("tier", tier);
                  setSearchParams(newParams);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  tierFilter === tier
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {info.label} ({count})
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              if (e.target.checked) {
                newParams.set("inactive", "true");
              } else {
                newParams.delete("inactive");
              }
              setSearchParams(newParams);
            }}
            className="rounded"
          />
          Show inactive
        </label>
      </div>

      {/* Supplement grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((supplement) => (
          <SupplementCard key={supplement.id} supplement={supplement} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No supplements found matching the current filters.
        </div>
      )}

      {/* Tier descriptions */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="font-medium mb-4">Tier Definitions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiers.map((tier) => {
            const info = SUPPLEMENT_TIERS[tier];
            return (
              <div key={tier}>
                <div className={`font-medium ${info.color}`}>{info.label}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{info.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
