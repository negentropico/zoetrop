import { useSearchParams } from "react-router";
import type { Route } from "./+types/compare";
import { seedProtocolVersions, seedProtocolChanges } from "../../lib/seed-data";
import { format, parseISO } from "date-fns";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Compare Versions - Wellness Tracker" },
    { name: "description", content: "Compare protocol versions side by side" },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const versions = seedProtocolVersions;

  // Default to comparing last two versions if not specified
  const fromVersion = fromParam
    ? versions.find((v) => v.version === fromParam)
    : versions[versions.length - 2];
  const toVersion = toParam
    ? versions.find((v) => v.version === toParam)
    : versions[versions.length - 1];

  // Get all changes for the "to" version (changes from previous)
  const changes = toVersion
    ? seedProtocolChanges.filter((c) => c.versionId === toVersion.id)
    : [];

  // Categorize changes
  const added = changes.filter((c) => c.changeType === "added");
  const removed = changes.filter((c) => c.changeType === "removed");
  const modified = changes.filter(
    (c) =>
      c.changeType === "dosage_changed" ||
      c.changeType === "timing_changed" ||
      c.changeType === "frequency_changed"
  );

  return {
    versions,
    fromVersion,
    toVersion,
    changes,
    added,
    removed,
    modified,
  };
}

function VersionSelector({
  label,
  value,
  versions,
  onChange,
  excludeVersion,
}: {
  label: string;
  value: string | undefined;
  versions: typeof seedProtocolVersions;
  onChange: (version: string) => void;
  excludeVersion?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
      >
        {versions
          .filter((v) => v.version !== excludeVersion)
          .map((version) => (
            <option key={version.id} value={version.version}>
              {version.version} ({format(parseISO(version.effectiveDate), "MMM yyyy")})
            </option>
          ))}
      </select>
    </div>
  );
}

export default function Compare({ loaderData }: Route.ComponentProps) {
  const { versions, fromVersion, toVersion, changes, added, removed, modified } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const updateVersion = (type: "from" | "to", version: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(type, version);
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      {/* Version selectors */}
      <div className="grid grid-cols-2 gap-4">
        <VersionSelector
          label="From Version"
          value={fromVersion?.version}
          versions={versions}
          onChange={(v) => updateVersion("from", v)}
          excludeVersion={toVersion?.version}
        />
        <VersionSelector
          label="To Version"
          value={toVersion?.version}
          versions={versions}
          onChange={(v) => updateVersion("to", v)}
          excludeVersion={fromVersion?.version}
        />
      </div>

      {/* Comparison header */}
      {fromVersion && toVersion && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{fromVersion.version}</div>
              <div className="text-sm text-gray-500">
                {format(parseISO(fromVersion.effectiveDate), "MMM yyyy")}
              </div>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {toVersion.version}
              </div>
              <div className="text-sm text-gray-500">
                {format(parseISO(toVersion.effectiveDate), "MMM yyyy")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {added.length}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">Added</div>
        </div>
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{removed.length}</div>
          <div className="text-sm text-red-700 dark:text-red-300">Removed</div>
        </div>
        <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {modified.length}
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">Modified</div>
        </div>
      </div>

      {/* Detailed changes */}
      {changes.length > 0 ? (
        <div className="space-y-4">
          {/* Added */}
          {added.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h3 className="font-medium text-green-600 dark:text-green-400 mb-3">
                Added Supplements
              </h3>
              <div className="space-y-3">
                {added.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-start justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{change.supplementName}</div>
                      {change.newDosage && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {change.newDosage}
                        </div>
                      )}
                      {change.rationale && (
                        <div className="text-sm text-gray-500 mt-1">{change.rationale}</div>
                      )}
                    </div>
                    <span className="text-green-600 dark:text-green-400 text-xl">+</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed */}
          {removed.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h3 className="font-medium text-red-600 dark:text-red-400 mb-3">
                Removed Supplements
              </h3>
              <div className="space-y-3">
                {removed.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-start justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <div>
                      <div className="font-medium line-through text-gray-500">
                        {change.supplementName}
                      </div>
                      {change.oldDosage && (
                        <div className="text-sm text-gray-400 line-through">{change.oldDosage}</div>
                      )}
                      {change.rationale && (
                        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {change.rationale}
                        </div>
                      )}
                    </div>
                    <span className="text-red-600 dark:text-red-400 text-xl">−</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified */}
          {modified.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h3 className="font-medium text-blue-600 dark:text-blue-400 mb-3">
                Modified Supplements
              </h3>
              <div className="space-y-3">
                {modified.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-start justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{change.supplementName}</div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        {change.oldDosage && (
                          <span className="text-gray-400 line-through">{change.oldDosage}</span>
                        )}
                        {change.oldDosage && change.newDosage && (
                          <span className="text-gray-400">→</span>
                        )}
                        {change.newDosage && (
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {change.newDosage}
                          </span>
                        )}
                      </div>
                      {change.rationale && (
                        <div className="text-sm text-gray-500 mt-1">{change.rationale}</div>
                      )}
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-xl">~</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <p className="text-gray-500">
            {fromVersion && toVersion
              ? "No changes recorded between these versions."
              : "Select two versions to compare."}
          </p>
        </div>
      )}

      {/* Version notes comparison */}
      {fromVersion && toVersion && (fromVersion.notes || toVersion.notes) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h3 className="font-medium mb-2">{fromVersion.version} Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {fromVersion.notes || "No notes for this version."}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h3 className="font-medium mb-2">{toVersion.version} Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {toVersion.notes || "No notes for this version."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
