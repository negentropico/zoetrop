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
import { ArrowRight } from "lucide-react";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { ChartEmpty } from "~/components/ui/TrendChart";
import { DiffRowList, DiffSummaryCounts } from "~/components/ui/DiffRows";
import { netProtocolChanges, diffCounts } from "~/lib/protocol-diff";

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

  // Get supplements active during this version.
  // Real-data gap: per-version stack snapshots are not stored — only the
  // CURRENT stack exists (supplements table). The latest version shows it;
  // older versions render an honest note + the change log below.
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
    isFirst: versionIndex === 0,
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

// Version chip — mono id tile (round-4 masthead idiom)
function VersionChip({ id, active }: { id: string; active: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: "var(--text-sm)",
        color: active ? "var(--accent)" : "var(--text-muted)",
        background: active ? "var(--focus-50)" : "var(--surface-sunken)",
        borderRadius: "var(--radius-sm)",
        padding: "3px 8px",
      }}
    >
      {id}
    </span>
  );
}

// Section label — eyebrow + count + optional right action (round-3 idiom)
function SectionLabel({
  children,
  count,
  action,
}: {
  children: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-lg)" }}>
      <div className="zt-eyebrow">
        {children}
        {count != null && <span style={{ color: "var(--text-faint)" }}>{"  ·  "}{count}</span>}
      </div>
      {action}
    </div>
  );
}

export default function VersionDetail({ loaderData }: Route.ComponentProps) {
  const { version, changes, milestones, supplements, previousVersion, nextVersion, isLatest, isFirst } =
    loaderData;

  // Diff vs previous — the same glyph rows as Compare (shared netProtocolChanges)
  const diffRows = netProtocolChanges(
    changes.map((c) => ({
      supplementName: c.supplementName,
      changeType: c.changeType,
      oldDosage: c.oldDosage ?? null,
      newDosage: c.newDosage ?? null,
    }))
  ).filter((r) => r.state !== "same");
  const counts = diffCounts(diffRows);

  return (
    <div>
      {/* Masthead — version chip + name; sub = date · description; right = status pill */}
      <PageHeader
        crumbs={[
          { label: "Protocol", to: "/protocol" },
          { label: "Versions", to: "/protocol/versions" },
          { label: version.version },
        ]}
        icon={<VersionChip id={version.version} active={isLatest} />}
        title={`Protocol ${version.version}`}
        sub={`${format(parseISO(version.effectiveDate), "MMM d, yyyy")}${version.notes ? ` · ${version.notes}` : ""}`}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: isLatest ? "var(--accent)" : "var(--text-muted)",
                background: isLatest ? "var(--focus-50)" : "var(--surface-sunken)",
                padding: "4px 11px",
                borderRadius: "var(--radius-pill)",
              }}
            >
              {isLatest ? "active" : "superseded"}
            </span>
            {previousVersion && (
              <Link to={`/protocol/versions/${previousVersion.version}`} className="zt-pill">
                ← {previousVersion.version}
              </Link>
            )}
            {nextVersion && (
              <Link to={`/protocol/versions/${nextVersion.version}`} className="zt-pill">
                {nextVersion.version} →
              </Link>
            )}
          </div>
        }
      />

      {/* Stack at Pn */}
      <section className="zt-section">
        <SectionLabel count={supplements.length > 0 ? supplements.length : undefined}>
          Stack at {version.version}
        </SectionLabel>
        <Card padding="none">
          {supplements.length > 0 ? (
            supplements.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--gap-xl)",
                  padding: "var(--gap-row) var(--gap-card)",
                  borderBottom: i < supplements.length - 1 ? "1px solid var(--border)" : "none",
                  opacity: s.isActive ? 1 : 0.55,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
                  {s.name}
                  {!s.isActive && (
                    <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      inactive
                    </span>
                  )}
                </div>
                <div className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                  {s.dosage} {s.unit} · {s.frequency}
                </div>
              </div>
            ))
          ) : isFirst ? (
            <ChartEmpty
              height={160}
              title="No supplement stack"
              body={`${version.version} is the bloodwork baseline — no interventions yet.`}
            />
          ) : (
            // Real-data gap: per-version stack snapshots are not stored —
            // only the current stack exists. The change log below carries
            // what moved at this version.
            <ChartEmpty
              height={160}
              title="Stack snapshot not recorded"
              body={`Per-version stacks aren't stored yet — the current stack lives on the active version. The changes ${version.version} introduced are below.`}
            />
          )}
        </Card>
      </section>

      {/* Changes vs P(n−1) — reuses the Compare glyph-diff rows */}
      {previousVersion ? (
        <section className="zt-section">
          <SectionLabel
            count={diffRows.length}
            action={
              <Link
                to={`/protocol/compare?from=${previousVersion.version}&to=${version.version}`}
                className="zt-link"
                style={{ fontSize: "var(--text-xs)" }}
              >
                Full compare <ArrowRight size={13} strokeWidth={2} />
              </Link>
            }
          >
            Changes vs {previousVersion.version}
          </SectionLabel>
          {diffRows.length > 0 && (
            <div style={{ marginBottom: "var(--gap-lg)" }}>
              <DiffSummaryCounts counts={counts} />
            </div>
          )}
          <Card padding="none">
            {diffRows.length === 0 ? (
              <ChartEmpty
                height={140}
                title="No changes"
                body={`No supplement changes are logged against ${version.version}.`}
              />
            ) : (
              <DiffRowList rows={diffRows} />
            )}
          </Card>
        </section>
      ) : (
        <section className="zt-section">
          <SectionLabel>Changes</SectionLabel>
          <Card padding="md">
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
              Initial version — no previous version to diff against.
            </p>
          </Card>
        </section>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <section className="zt-section">
          <SectionLabel count={milestones.length}>Milestones</SectionLabel>
          <Card padding="none">
            {milestones.map((milestone, i) => (
              <div
                key={milestone.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "var(--gap-row) var(--gap-card)",
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
          </Card>
        </section>
      )}
    </div>
  );
}
