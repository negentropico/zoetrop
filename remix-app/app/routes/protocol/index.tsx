import { Link } from "react-router";
import type { Route } from "./+types/index";
import {
  realProtocolVersions,
  realSupplements,
  realCessationLog,
  realMilestones,
} from "../../lib/protocol-data";
import { CESSATION_PHASES, SUPPLEMENT_TIERS } from "../../types/protocol";
import { differenceInDays, parseISO, format } from "date-fns";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Protocol Overview - Wellness Tracker" },
    { name: "description", content: "Supplement protocol management overview" },
  ];
}

export function loader() {
  // Using real protocol data from vault
  const currentVersion = realProtocolVersions[realProtocolVersions.length - 1];
  const activeSupplements = realSupplements.filter((s) => s.isActive);
  const cessation = realCessationLog[0];
  const latestMilestone = realMilestones[realMilestones.length - 1];

  // Calculate cessation progress
  let cessationDay = 0;
  let cessationPhase = CESSATION_PHASES[0];
  if (cessation) {
    cessationDay = differenceInDays(new Date(), parseISO(cessation.startDate));
    cessationPhase = CESSATION_PHASES.find(
      (p) => cessationDay >= p.dayRange.start && cessationDay <= p.dayRange.end
    ) || CESSATION_PHASES[CESSATION_PHASES.length - 1];
  }

  // Group supplements by tier
  const supplementsByTier = activeSupplements.reduce((acc, supp) => {
    acc[supp.tier] = (acc[supp.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    currentVersion,
    activeSupplementCount: activeSupplements.length,
    supplementsByTier,
    cessation,
    cessationDay,
    cessationPhase,
    latestMilestone,
    totalVersions: realProtocolVersions.length,
    protocolVersions: realProtocolVersions,
  };
}

export default function ProtocolOverview({ loaderData }: Route.ComponentProps) {
  const {
    currentVersion,
    activeSupplementCount,
    supplementsByTier,
    cessation,
    cessationDay,
    cessationPhase,
    latestMilestone,
    totalVersions,
    protocolVersions,
  } = loaderData;

  const targetDay = 150;
  const progressPercent = Math.min((cessationDay / targetDay) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Version */}
        <Link
          to="/protocol/versions"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <div className="text-sm text-gray-500 dark:text-gray-500 mb-1">
            Current Protocol
          </div>
          <div className="text-2xl font-bold">{currentVersion?.version || "—"}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalVersions} versions tracked
          </div>
        </Link>

        {/* Active Supplements */}
        <Link
          to="/protocol/supplements"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <div className="text-sm text-gray-500 dark:text-gray-500 mb-1">
            Active Supplements
          </div>
          <div className="text-2xl font-bold">{activeSupplementCount}</div>
          <div className="text-xs text-gray-500 mt-1">
            {supplementsByTier.tier1 || 0} Tier 1, {supplementsByTier.tier2 || 0} Tier 2
          </div>
        </Link>

        {/* Cessation Day */}
        <Link
          to="/protocol/cessation"
          className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <div className="text-sm text-gray-500 dark:text-gray-500 mb-1">
            Cessation Progress
          </div>
          <div className="text-2xl font-bold">Day {cessationDay}</div>
          <div className="text-xs text-gray-500 mt-1">
            {cessationPhase.label} phase
          </div>
        </Link>

        {/* Latest Milestone */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-500 mb-1">
            Latest Milestone
          </div>
          <div className="text-lg font-medium truncate">
            {latestMilestone?.description.slice(0, 30) || "—"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {latestMilestone ? format(parseISO(latestMilestone.date), "MMM d, yyyy") : "—"}
          </div>
        </div>
      </div>

      {/* Cessation progress bar */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">FAAH Cessation Timeline</h2>
          <span className="text-sm text-gray-500">
            {cessationDay} / {targetDay} days
          </span>
        </div>

        {/* Phase markers */}
        <div className="relative mb-2">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Phase markers */}
          <div className="absolute inset-0 flex">
            {CESSATION_PHASES.map((phase, i) => (
              <div
                key={phase.phase}
                className="flex-1 border-r border-gray-300 dark:border-gray-600 last:border-0"
                style={{
                  width: `${((phase.dayRange.end - phase.dayRange.start + 1) / targetDay) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Phase labels */}
        <div className="flex text-xs text-gray-500">
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
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Version history */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Version History</h2>
            <Link
              to="/protocol/versions"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {protocolVersions.slice().reverse().slice(0, 5).map((version) => (
              <Link
                key={version.id}
                to={`/protocol/versions/${version.version}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <span className="font-medium">{version.version}</span>
                  {version.version === currentVersion?.version && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                      Current
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {format(parseISO(version.effectiveDate), "MMM yyyy")}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Supplements by tier */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Supplements by Tier</h2>
            <Link
              to="/protocol/supplements"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="space-y-3">
            {Object.entries(SUPPLEMENT_TIERS).map(([tier, info]) => {
              const count = supplementsByTier[tier] || 0;
              return (
                <div key={tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${info.color}`}>{info.label}</span>
                  </div>
                  <span className="text-sm text-gray-500">{count} supplements</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
