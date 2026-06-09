import { Link } from "react-router";
import type { Route } from "./+types/versions";
import { realProtocolVersions, realProtocolChanges, realMilestones } from "~/lib/protocol-data";
import { format, parseISO } from "date-fns";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Protocol Versions - Zoetrop" },
    { name: "description", content: "Track protocol evolution from P0 to P6" },
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

// Change type badge — brand tokens, no raw grays
function ChangeTypeBadge({ type }: { type: string }) {
  const toneMap: Record<string, "vital" | "danger" | "focus" | "energy" | "neutral"> = {
    added: "vital",
    removed: "danger",
    dosage_changed: "focus",
    timing_changed: "energy",
    frequency_changed: "neutral",
  };

  const labels: Record<string, string> = {
    added: "Added",
    removed: "Removed",
    dosage_changed: "Dosage",
    timing_changed: "Timing",
    frequency_changed: "Frequency",
  };

  return (
    <Badge tone={toneMap[type] || "neutral"}>
      {labels[type] || type}
    </Badge>
  );
}

export default function ProtocolVersions({ loaderData }: Route.ComponentProps) {
  const { versions } = loaderData;
  const currentVersion = versions[0]; // Most recent first

  return (
    <div>
      <PageHeader
        eyebrow="VERSION HISTORY"
        title="Protocol evolution"
        sub="Track changes across protocol versions."
        right={
          <Link to="/protocol/compare">
            <Button variant="secondary">Compare versions</Button>
          </Link>
        }
      />

      {/* Version list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        {versions.map((version) => {
          const isLatest = version.version === currentVersion?.version;
          return (
            <Link
              key={version.id}
              to={`/protocol/versions/${version.version}`}
              style={{ textDecoration: "none" }}
            >
              <Card padding="md" interactive>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-xl)", color: "var(--ink)" }}>
                        {version.version}
                      </span>
                      {isLatest && <Badge tone="success">Current</Badge>}
                    </div>
                    <p style={{ margin: "4px 0 0", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      Effective {format(parseISO(version.effectiveDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--ink)" }}>
                      {version.changeCount} changes
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      {version.milestones.length} milestones
                    </div>
                  </div>
                </div>

                {version.notes && (
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: 12 }}>
                    {version.notes}
                  </p>
                )}

                {/* Preview changes */}
                {version.changes.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    {version.changes.map((change) => (
                      <div
                        key={change.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: "var(--text-sm)" }}
                      >
                        <ChangeTypeBadge type={change.changeType} />
                        <span style={{ fontWeight: 500, color: "var(--ink)" }}>{change.supplementName}</span>
                        {change.oldDosage && change.newDosage && (
                          <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                            {change.oldDosage} → {change.newDosage}
                          </span>
                        )}
                      </div>
                    ))}
                    {version.changeCount > 3 && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        +{version.changeCount - 3} more changes
                      </div>
                    )}
                  </div>
                )}

                {/* Milestones */}
                {version.milestones.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    <div className="zt-eyebrow" style={{ marginBottom: 6 }}>Milestones</div>
                    {version.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: 4 }}
                      >
                        {milestone.description}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
