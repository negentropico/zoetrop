import { useSearchParams } from "react-router";
import type { Route } from "./+types/compare";
import { requireSubjectCtx } from "~/lib/authz.server";
import { getProtocolVersions, getProtocolChanges } from "~/lib/data.server";
import { format, parseISO } from "date-fns";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { PageHeader } from "~/components/ui/PageHeader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Compare Versions - Zoetrop" },
    { name: "description", content: "Compare protocol versions side by side" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const { ctx } = await requireSubjectCtx(request);

  const [protocolVersionsRows, protocolChanges] = await Promise.all([
    getProtocolVersions(ctx),
    getProtocolChanges(ctx),
  ]);

  // Normalize timestamps to ISO strings
  const normalizedVersions = protocolVersionsRows.map((v) => ({
    ...v,
    effectiveDate: v.effectiveDate instanceof Date ? v.effectiveDate.toISOString() : v.effectiveDate,
    createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
  }));

  // Sort versions ascending by effectiveDate
  const versions = [...normalizedVersions].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );

  // Default to comparing last two versions if not specified
  const fromVersion = fromParam
    ? versions.find((v) => v.version === fromParam)
    : versions[versions.length - 2];
  const toVersion = toParam
    ? versions.find((v) => v.version === toParam)
    : versions[versions.length - 1];

  // Get all changes for the "to" version (changes from previous)
  const changes = toVersion
    ? protocolChanges.filter((c) => c.versionId === toVersion.id)
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
    fromVersion: fromVersion ?? null,
    toVersion: toVersion ?? null,
    changes,
    added,
    removed,
    modified,
  };
}

// Version type inferred from loader return
type VersionItem = NonNullable<Awaited<ReturnType<typeof loader>>["versions"]>[number];

function VersionSelector({
  label,
  value,
  versions,
  onChange,
  excludeVersion,
}: {
  label: string;
  value: string | undefined;
  versions: VersionItem[];
  onChange: (version: string) => void;
  excludeVersion?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
        {label}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--ink)",
          padding: "9px 14px",
          fontSize: "var(--text-sm)",
          fontFamily: "var(--font-text)",
          cursor: "pointer",
          appearance: "none",
          outline: "none",
        }}
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
    <div>
      <PageHeader
        eyebrow="VERSION COMPARISON"
        title="Compare versions"
        sub="Pick two protocol versions to see what changed — dose deltas, added and retired supplements, and the metrics that moved across the window between them."
      />

      {/* Version selectors */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-xl)" }}>
        <div className="zt-grid-2" style={{ marginBottom: "var(--gap-lg)" }}>
          <VersionSelector
            label="From version"
            value={fromVersion?.version}
            versions={versions}
            onChange={(v) => updateVersion("from", v)}
            excludeVersion={toVersion?.version}
          />
          <VersionSelector
            label="To version"
            value={toVersion?.version}
            versions={versions}
            onChange={(v) => updateVersion("to", v)}
            excludeVersion={fromVersion?.version}
          />
        </div>

        {/* Comparison header */}
        {fromVersion && toVersion && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: "var(--ink)" }}>
                {fromVersion.version}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                {format(parseISO(fromVersion.effectiveDate), "MMM yyyy")}
              </div>
            </div>
            <span style={{ color: "var(--text-faint)", fontSize: "var(--text-xl)" }}>→</span>
            <div style={{ textAlign: "center" }}>
              <div className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: "var(--vital)" }}>
                {toVersion.version}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                {format(parseISO(toVersion.effectiveDate), "MMM yyyy")}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Change summary tiles */}
      {fromVersion && toVersion && (
        <div className="zt-grid-3" style={{ marginBottom: "var(--gap-xl)" }}>
          <Card padding="md" tone="vital" style={{ textAlign: "center" }}>
            <div className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: "var(--vital)" }}>
              {added.length}
            </div>
            <div className="zt-eyebrow" style={{ marginTop: 4 }}>Added</div>
          </Card>
          <Card padding="md" style={{ textAlign: "center" }}>
            <div className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: removed.length > 0 ? "var(--danger)" : "var(--ink)" }}>
              {removed.length}
            </div>
            <div className="zt-eyebrow" style={{ marginTop: 4 }}>Removed</div>
          </Card>
          <Card padding="md" tone="focus" style={{ textAlign: "center" }}>
            <div className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: "var(--focus)" }}>
              {modified.length}
            </div>
            <div className="zt-eyebrow" style={{ marginTop: 4 }}>Modified</div>
          </Card>
        </div>
      )}

      {/* Detailed changes */}
      {changes.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
          {/* Added */}
          {added.length > 0 && (
            <Card padding="md">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div className="zt-eyebrow">Added supplements</div>
                <Badge tone="vital">{added.length}</Badge>
              </div>
              <div>
                {added.map((change, i) => (
                  <div
                    key={change.id}
                    style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "12px 0", borderBottom: i < added.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>{change.supplementName}</div>
                      {change.newDosage && (
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                          {change.newDosage}
                        </div>
                      )}
                      {change.rationale && (
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: "4px 0 0" }}>{change.rationale}</p>
                      )}
                    </div>
                    <span style={{ color: "var(--vital)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-lg)", marginLeft: 16 }}>+</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Removed */}
          {removed.length > 0 && (
            <Card padding="md">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div className="zt-eyebrow">Removed supplements</div>
                <Badge tone="danger">{removed.length}</Badge>
              </div>
              <div>
                {removed.map((change, i) => (
                  <div
                    key={change.id}
                    style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "12px 0", borderBottom: i < removed.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--text-faint)", textDecoration: "line-through", marginBottom: 4 }}>{change.supplementName}</div>
                      {change.oldDosage && (
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)", textDecoration: "line-through" }}>
                          {change.oldDosage}
                        </div>
                      )}
                      {change.rationale && (
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--danger)", margin: "4px 0 0" }}>{change.rationale}</p>
                      )}
                    </div>
                    <span style={{ color: "var(--danger)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-lg)", marginLeft: 16 }}>−</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Modified */}
          {modified.length > 0 && (
            <Card padding="md">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div className="zt-eyebrow">Modified supplements</div>
                <Badge tone="focus">{modified.length}</Badge>
              </div>
              <div>
                {modified.map((change, i) => (
                  <div
                    key={change.id}
                    style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "12px 0", borderBottom: i < modified.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>{change.supplementName}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                        {change.oldDosage && (
                          <span style={{ textDecoration: "line-through", color: "var(--text-faint)" }}>{change.oldDosage}</span>
                        )}
                        {change.oldDosage && change.newDosage && (
                          <span style={{ color: "var(--text-muted)" }}>→</span>
                        )}
                        {change.newDosage && (
                          <span style={{ fontWeight: 600, color: "var(--focus)" }}>{change.newDosage}</span>
                        )}
                      </div>
                      {change.rationale && (
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: "4px 0 0" }}>{change.rationale}</p>
                      )}
                    </div>
                    <span style={{ color: "var(--focus)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-lg)", marginLeft: 16 }}>~</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card padding="lg" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>
            {fromVersion && toVersion
              ? "No changes recorded between these versions."
              : "Select two versions to compare."}
          </p>
        </Card>
      )}

      {/* Version notes comparison */}
      {fromVersion && toVersion && (fromVersion.notes || toVersion.notes) && (
        <div className="zt-grid-2" style={{ marginTop: "var(--gap-xl)" }}>
          <Card padding="md">
            <div className="zt-eyebrow" style={{ marginBottom: 10 }}>{fromVersion.version} notes</div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
              {fromVersion.notes || "No notes for this version."}
            </p>
          </Card>
          <Card padding="md">
            <div className="zt-eyebrow" style={{ marginBottom: 10 }}>{toVersion.version} notes</div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
              {toVersion.notes || "No notes for this version."}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
