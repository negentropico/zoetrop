import { Link } from "react-router";
import type { Route } from "./+types/version-detail";
import {
  realProtocolVersions,
  realProtocolChanges,
  realMilestones,
  realSupplements,
} from "../../lib/protocol-data";
import { format, parseISO } from "date-fns";

export function loader({ params }: Route.LoaderArgs) {
  const { version: versionParam } = params;

  const version = realProtocolVersions.find((v) => v.version === versionParam);
  if (!version) {
    throw new Response("Version not found", { status: 404 });
  }

  const changes = realProtocolChanges.filter((c) => c.versionId === version.id);
  const milestones = realMilestones.filter((m) => m.protocolVersion === version.version);

  // Get supplements active during this version
  // For M6 (current), show all supplements
  const supplements = version.version === "P6" ? realSupplements : [];

  // Find previous and next versions for navigation
  const versionIndex = realProtocolVersions.findIndex((v) => v.id === version.id);
  const previousVersion = versionIndex > 0 ? realProtocolVersions[versionIndex - 1] : null;
  const nextVersion =
    versionIndex < realProtocolVersions.length - 1 ? realProtocolVersions[versionIndex + 1] : null;

  return {
    version,
    changes,
    milestones,
    supplements,
    previousVersion,
    nextVersion,
    isLatest: version.version === realProtocolVersions[realProtocolVersions.length - 1].version,
  };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Version Not Found - Zoetrop" }];
  }
  return [
    { title: `Protocol ${data.version.version} - Zoetrop` },
    { name: "description", content: data.version.notes || `Protocol version ${data.version.version}` },
  ];
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
    dosage_changed: "Dosage Changed",
    timing_changed: "Timing Changed",
    frequency_changed: "Frequency Changed",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[type] || "bg-gray-100 text-gray-800"}`}>
      {labels[type] || type}
    </span>
  );
}

export default function VersionDetail({ loaderData }: Route.ComponentProps) {
  const { version, changes, milestones, supplements, previousVersion, nextVersion, isLatest } =
    loaderData;

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/protocol/versions" className="hover:text-gray-900 dark:hover:text-gray-100">
              Versions
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100">{version.version}</span>
          </nav>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Protocol {version.version}</h2>
            {isLatest && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                Current
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">
            Effective {format(parseISO(version.effectiveDate), "MMMM d, yyyy")}
          </p>
        </div>

        {/* Version navigation */}
        <div className="flex gap-2">
          {previousVersion && (
            <Link
              to={`/protocol/versions/${previousVersion.version}`}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              ← {previousVersion.version}
            </Link>
          )}
          {nextVersion && (
            <Link
              to={`/protocol/versions/${nextVersion.version}`}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {nextVersion.version} →
            </Link>
          )}
        </div>
      </div>

      {/* Notes */}
      {version.notes && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="font-medium mb-2">Notes</h3>
          <p className="text-gray-600 dark:text-gray-400">{version.notes}</p>
        </div>
      )}

      {/* Changes */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="font-medium mb-4">Changes in this Version</h3>
        {changes.length === 0 ? (
          <p className="text-gray-500 text-sm">Initial version - no changes from previous.</p>
        ) : (
          <div className="space-y-4">
            {changes.map((change) => (
              <div
                key={change.id}
                className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ChangeTypeBadge type={change.changeType} />
                    <span className="font-medium">{change.supplementName}</span>
                  </div>
                  {(change.oldDosage || change.newDosage) && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {change.oldDosage && (
                        <span className="line-through text-gray-400">{change.oldDosage}</span>
                      )}
                      {change.oldDosage && change.newDosage && <span className="mx-2">→</span>}
                      {change.newDosage && <span className="font-medium">{change.newDosage}</span>}
                    </div>
                  )}
                  {change.rationale && (
                    <p className="text-sm text-gray-500 mt-1">{change.rationale}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="font-medium mb-4">Milestones</h3>
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-start gap-4">
                <div className="text-sm text-gray-500 whitespace-nowrap">
                  {format(parseISO(milestone.date), "MMM d, yyyy")}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-gray-100">{milestone.description}</p>
                  {milestone.biometricSnapshot && (
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      {Object.entries(milestone.biometricSnapshot).map(([key, value]) => (
                        <span key={key}>
                          {key}: <span className="font-medium">{value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplements (for current version) */}
      {supplements.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Active Supplements</h3>
            <Link
              to="/protocol/supplements"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {supplements.slice(0, 6).map((supplement) => (
              <div
                key={supplement.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{supplement.name}</div>
                  <div className="text-sm text-gray-500">
                    {supplement.dosage} {supplement.unit} • {supplement.frequency}
                  </div>
                </div>
                <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded capitalize">
                  {supplement.tier.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
          {supplements.length > 6 && (
            <p className="text-sm text-gray-500 mt-3">
              +{supplements.length - 6} more supplements
            </p>
          )}
        </div>
      )}

      {/* Compare link */}
      {previousVersion && (
        <div className="text-center">
          <Link
            to={`/protocol/compare?from=${previousVersion.version}&to=${version.version}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Compare with {previousVersion.version}
          </Link>
        </div>
      )}
    </div>
  );
}
