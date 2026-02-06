import { Link } from "react-router";
import type { Route } from "./+types/versions";
import { realProtocolVersions, realProtocolChanges, realMilestones } from "../../lib/protocol-data";
import { format, parseISO } from "date-fns";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Protocol Versions - Wellness Tracker" },
    { name: "description", content: "Track protocol evolution from M0 to M6" },
  ];
}

export function loader() {
  // Enrich versions with change counts and milestones
  const versions = realProtocolVersions.map((version) => {
    const changes = realProtocolChanges.filter((c) => c.versionId === version.id);
    const milestones = realMilestones.filter((m) => m.protocolVersion === version.version);

    return {
      ...version,
      changeCount: changes.length,
      milestones,
      changes: changes.slice(0, 3), // Preview first 3 changes
    };
  });

  return { versions: versions.reverse() }; // Most recent first
}

function ChangeTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    added: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    removed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    dosage_changed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    timing_changed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    frequency_changed: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  const labels: Record<string, string> = {
    added: "Added",
    removed: "Removed",
    dosage_changed: "Dosage",
    timing_changed: "Timing",
    frequency_changed: "Frequency",
  };

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded ${styles[type] || "bg-gray-100 text-gray-800"}`}>
      {labels[type] || type}
    </span>
  );
}

export default function ProtocolVersions({ loaderData }: Route.ComponentProps) {
  const { versions } = loaderData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Protocol Evolution</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track changes across protocol versions
          </p>
        </div>
        <Link
          to="/protocol/compare"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Compare Versions
        </Link>
      </div>

      {/* Timeline view */}
      <div className="space-y-4">
        {versions.map((version, index) => {
          const isLatest = index === 0;
          return (
            <div key={version.id} className="relative pl-8">
              {/* Timeline connector */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />
              <div
                className={`absolute left-0 top-4 w-6 h-6 rounded-full border-4 ${
                  isLatest
                    ? "bg-green-500 border-green-200 dark:border-green-900"
                    : "bg-gray-300 dark:bg-gray-700 border-gray-100 dark:border-gray-800"
                }`}
              />

              <Link
                to={`/protocol/versions/${version.version}`}
                className="block rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{version.version}</span>
                      {isLatest && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Effective {format(parseISO(version.effectiveDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{version.changeCount} changes</div>
                    <div className="text-gray-500">{version.milestones.length} milestones</div>
                  </div>
                </div>

                {version.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {version.notes}
                  </p>
                )}

                {/* Preview changes */}
                {version.changes.length > 0 && (
                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                    {version.changes.map((change) => (
                      <div key={change.id} className="flex items-center gap-2 text-sm">
                        <ChangeTypeBadge type={change.changeType} />
                        <span className="font-medium">{change.supplementName}</span>
                        {change.oldDosage && change.newDosage && (
                          <span className="text-gray-500">
                            {change.oldDosage} → {change.newDosage}
                          </span>
                        )}
                      </div>
                    ))}
                    {version.changeCount > 3 && (
                      <div className="text-xs text-gray-500">
                        +{version.changeCount - 3} more changes
                      </div>
                    )}
                  </div>
                )}

                {/* Milestones */}
                {version.milestones.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-xs text-gray-500 mb-1">Milestones</div>
                    {version.milestones.map((milestone) => (
                      <div key={milestone.id} className="text-sm text-gray-600 dark:text-gray-400">
                        • {milestone.description}
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
