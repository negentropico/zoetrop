import type { Route } from "./+types/protocol";
import { CESSATION_PHASES, SUPPLEMENT_TIERS, type SupplementTier } from "../types/protocol";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Protocol - Wellness Tracker" },
    { name: "description", content: "View and manage supplement protocols" },
  ];
}

function ProtocolVersionCard() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <h3 className="font-medium mb-3">Protocol Versions</h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
          <span className="font-medium">603</span>
          <span className="text-gray-500">Current</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400">
          <span>602</span>
          <span className="text-gray-500">Previous</span>
        </div>
        <div className="flex items-center justify-between py-2 text-gray-600 dark:text-gray-400">
          <span>601</span>
          <span className="text-gray-500">Initial</span>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Import protocol data to track evolution and changes
      </p>
    </div>
  );
}

function SupplementTierCard({ tier }: { tier: SupplementTier }) {
  const info = SUPPLEMENT_TIERS[tier];
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-medium ${info.color}`}>{info.label}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {info.description}
      </p>
      <div className="text-xs text-gray-500">
        0 supplements
      </div>
    </div>
  );
}

function CessationTimeline() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <h3 className="font-medium mb-4">Cessation Timeline (FAAH-Based)</h3>
      <div className="space-y-4">
        {CESSATION_PHASES.map((phase, index) => (
          <div key={phase.phase} className="relative pl-6">
            <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700" />
            {index < CESSATION_PHASES.length - 1 && (
              <div className="absolute left-1.5 top-4 w-0.5 h-full bg-gray-200 dark:bg-gray-800 -translate-x-1/2" />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{phase.label}</span>
                <span className="text-xs text-gray-500">
                  Days {phase.dayRange.start}-{phase.dayRange.end}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {phase.focus}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {phase.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Protocol() {
  const tiers = Object.keys(SUPPLEMENT_TIERS) as SupplementTier[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Protocol</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Supplement protocol management and cessation tracking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProtocolVersionCard />
        <CessationTimeline />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Supplement Tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <SupplementTierCard key={tier} tier={tier} />
          ))}
        </div>
      </div>
    </div>
  );
}
