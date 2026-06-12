import { Link } from "react-router";
import type { Route } from "./+types/version-detail";
import { requireUser } from "~/lib/authz.server";
import {
  getOwnerSubject,
  getProtocolVersions,
  getProtocolChanges,
  getMilestones,
  getSupplements,
} from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { format, parseISO } from "date-fns";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { version: versionParam } = params;

  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };

  const [protocolVersionsRows, protocolChangesRows, milestonesRows, supplementsRows] = await Promise.all([
    getProtocolVersions(ctx),
    getProtocolChanges(ctx),
    getMilestones(ctx),
    getSupplements(ctx),
  ]);

  // Normalize timestamps to ISO strings
  const protocolVersionsList = protocolVersionsRows.map((v) => ({
    ...v,
    effectiveDate: v.effectiveDate instanceof Date ? v.effectiveDate.toISOString() : v.effectiveDate,
    createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
  }));
  const milestonesList = milestonesRows.map((m) => ({
    ...m,
    date: m.date instanceof Date ? m.date.toISOString() : m.date,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  }));

  // Sort versions ascending by effectiveDate
  const sortedVersions = [...protocolVersionsList].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );

  const version = sortedVersions.find((v) => v.version === versionParam);
  if (!version) {
    throw new Response("Version not found", { status: 404 });
  }

  const changes = protocolChangesRows.filter((c) => c.versionId === version.id);
  const versionMilestones = milestonesList.filter((m) => m.protocolVersion === version.version);

  // Get supplements active during this version
  // For the current (latest) version, show all supplements
  const latestVersion = sortedVersions[sortedVersions.length - 1];
  const versionSupplements =
    version.version === latestVersion?.version ? supplementsRows : [];

  // Find previous and next versions for navigation
  const versionIndex = sortedVersions.findIndex((v) => v.id === version.id);
  const previousVersion = versionIndex > 0 ? sortedVersions[versionIndex - 1] : null;
  const nextVersion =
    versionIndex < sortedVersions.length - 1 ? sortedVersions[versionIndex + 1] : null;

  return {
    version,
    changes,
    milestones: versionMilestones,
    supplements: versionSupplements,
    previousVersion,
    nextVersion,
    isLatest: version.version === latestVersion?.version,
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
    dosage_changed: "Dosage changed",
    timing_changed: "Timing changed",
    frequency_changed: "Frequency changed",
  };

  return (
    <Badge tone={toneMap[type] || "neutral"}>
      {labels[type] || type}
    </Badge>
  );
}

// Supplement tier badge
function TierBadge({ tier }: { tier: string }) {
  const toneMap: Record<string, "vital" | "focus" | "energy" | "neutral"> = {
    tier1: "vital",
    tier2: "focus",
    tier3: "energy",
    as_needed: "neutral",
  };
  const labels: Record<string, string> = {
    tier1: "Tier 1",
    tier2: "Tier 2",
    tier3: "Tier 3",
    as_needed: "As needed",
  };
  return <Badge tone={toneMap[tier] || "neutral"}>{labels[tier] || tier}</Badge>;
}

export default function VersionDetail({ loaderData }: Route.ComponentProps) {
  const { version, changes, milestones, supplements, previousVersion, nextVersion, isLatest } =
    loaderData;

  return (
    <div>
      {/* Header (crumb renders in the PageHeader meta row) */}
      <PageHeader
        crumbs={[
          { label: "Protocol", to: "/protocol" },
          { label: "Versions", to: "/protocol/versions" },
          { label: version.version },
        ]}
        eyebrow="PROTOCOL VERSION"
        title={`Protocol ${version.version}`}
        sub={`Effective ${format(parseISO(version.effectiveDate), "MMMM d, yyyy")}`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            {isLatest && <Badge tone="success">Current</Badge>}
            {previousVersion && (
              <Link to={`/protocol/versions/${previousVersion.version}`}>
                <Button variant="secondary">
                  {previousVersion.version}
                </Button>
              </Link>
            )}
            {nextVersion && (
              <Link to={`/protocol/versions/${nextVersion.version}`}>
                <Button variant="secondary">
                  {nextVersion.version}
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Notes */}
      {version.notes && (
        <Card padding="md" style={{ marginBottom: "var(--gap-lg)" }}>
          <div className="zt-eyebrow" style={{ marginBottom: 8 }}>Notes</div>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
            {version.notes}
          </p>
        </Card>
      )}

      {/* Changes */}
      <Card padding="md" style={{ marginBottom: "var(--gap-lg)" }}>
        <div className="zt-eyebrow" style={{ marginBottom: 16 }}>Changes in this version</div>
        {changes.length === 0 ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Initial version — no changes from previous.
          </p>
        ) : (
          <div>
            {changes.map((change, i) => (
              <div
                key={change.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "14px 0",
                  borderBottom: i < changes.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <ChangeTypeBadge type={change.changeType} />
                    <span style={{ fontWeight: 500, color: "var(--ink)" }}>{change.supplementName}</span>
                  </div>
                  {(change.oldDosage || change.newDosage) && (
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {change.oldDosage && (
                        <span style={{ textDecoration: "line-through", color: "var(--text-faint)" }}>{change.oldDosage}</span>
                      )}
                      {change.oldDosage && change.newDosage && <span style={{ margin: "0 6px", color: "var(--text-muted)" }}>→</span>}
                      {change.newDosage && <span style={{ fontWeight: 500, color: "var(--ink)" }}>{change.newDosage}</span>}
                    </div>
                  )}
                  {change.rationale && (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: "4px 0 0" }}>
                      {change.rationale}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Milestones */}
      {milestones.length > 0 && (
        <Card padding="md" style={{ marginBottom: "var(--gap-lg)" }}>
          <div className="zt-eyebrow" style={{ marginBottom: 16 }}>Milestones</div>
          <div>
            {milestones.map((milestone, i) => (
              <div
                key={milestone.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "14px 0",
                  borderBottom: i < milestones.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap", paddingTop: 2 }}>
                  {format(parseISO(milestone.date), "MMM d, yyyy")}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: "var(--ink)", fontSize: "var(--text-sm)" }}>{milestone.description}</p>
                  {milestone.biometricSnapshot && (
                    <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                      {Object.entries(milestone.biometricSnapshot as Record<string, unknown>).map(([key, value]) => (
                        <span key={key} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                          {key}: <span style={{ fontWeight: 600, color: "var(--ink)" }}>{String(value)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Supplements (for current version) */}
      {supplements.length > 0 && (
        <Card padding="md" style={{ marginBottom: "var(--gap-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="zt-eyebrow">Active supplements</div>
            <Link
              to="/protocol/supplements"
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", textDecoration: "none" }}
            >
              Manage all →
            </Link>
          </div>
          <div className="zt-grid-2">
            {supplements.slice(0, 6).map((supplement) => (
              <div
                key={supplement.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: "var(--surface-2)", borderRadius: "var(--radius-md)" }}
              >
                <div>
                  <div style={{ fontWeight: 500, color: "var(--ink)", fontSize: "var(--text-sm)" }}>
                    {supplement.name}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                    {supplement.dosage} {supplement.unit} · {supplement.frequency}
                  </div>
                </div>
                <TierBadge tier={supplement.tier} />
              </div>
            ))}
          </div>
          {supplements.length > 6 && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 12 }}>
              +{supplements.length - 6} more supplements
            </p>
          )}
        </Card>
      )}

      {/* Compare link */}
      {previousVersion && (
        <div style={{ textAlign: "center", marginTop: "var(--gap-lg)" }}>
          <Link
            to={`/protocol/compare?from=${previousVersion.version}&to=${version.version}`}
          >
            <Button variant="secondary">
              Compare with {previousVersion.version}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
