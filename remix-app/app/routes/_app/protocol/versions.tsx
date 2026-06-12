import { Link } from "react-router";
import type { Route } from "./+types/versions";
import { requireUser } from "~/lib/authz.server";
import {
  getOwnerSubject,
  getProtocolVersions,
  getProtocolChanges,
  getMilestones,
} from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Protocol Versions - Zoetrop" },
    { name: "description", content: "Track protocol evolution from P0 to P6" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };

  const [protocolVersionsRows, protocolChangesRows, milestonesRows] = await Promise.all([
    getProtocolVersions(ctx),
    getProtocolChanges(ctx),
    getMilestones(ctx),
  ]);

  // Normalize timestamp → ISO string for JSON serialization
  const normalizedVersions = protocolVersionsRows.map((v) => ({
    ...v,
    effectiveDate: v.effectiveDate instanceof Date ? v.effectiveDate.toISOString() : v.effectiveDate,
    createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
  }));
  const normalizedMilestones = milestonesRows.map((m) => ({
    ...m,
    date: m.date instanceof Date ? m.date.toISOString() : m.date,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  }));

  // Sort versions ascending by effectiveDate
  const sortedVersions = [...normalizedVersions].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );

  // Enrich versions with change + milestone counts
  const versions = sortedVersions.map((version) => ({
    ...version,
    changeCount: protocolChangesRows.filter((c) => c.versionId === version.id).length,
    milestoneCount: normalizedMilestones.filter((m) => m.protocolVersion === version.version).length,
  }));

  return { versions: [...versions].reverse() }; // Most recent first
}

export default function ProtocolVersions({ loaderData }: Route.ComponentProps) {
  const { versions } = loaderData;
  const currentVersion = versions[0]; // Most recent first

  return (
    <div>
      <PageHeader
        eyebrow="VERSION HISTORY"
        title="Protocol versions"
        sub={`${versions.length} versions logged.`}
        right={
          <Link to="/protocol/compare" className="zt-pill">
            Compare versions
          </Link>
        }
      />

      {/* Round 3: cards merged into ONE frame-card list, newest first;
          the active row is tinted --surface-2 and carries the focus chip;
          rows link through (hover + chevron, round 4). */}
      <Card padding="none">
        {versions.map((version, i) => {
          const isActive = version.version === currentVersion?.version;
          return (
            <Link
              key={version.id}
              to={`/protocol/versions/${version.version}`}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                className="zt-mrow"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--gap-xl)",
                  padding: "var(--gap-row) var(--gap-card)",
                  borderBottom: i < versions.length - 1 ? "1px solid var(--border)" : "none",
                  background: isActive ? "var(--surface-2)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-md)",
                    background: isActive ? "var(--focus-50)" : "var(--surface-sunken)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "var(--text-sm)",
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    {version.version}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {version.notes || `Protocol ${version.version}`}
                  </div>
                  <div className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
                    {version.changeCount} changes · {version.milestoneCount} milestones
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                    {format(parseISO(version.effectiveDate), "MMM d, yyyy")}
                  </div>
                  {isActive && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-2xs)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        background: "var(--focus-50)",
                        padding: "3px 9px",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      active
                    </span>
                  )}
                </div>
                <ChevronRight size={16} strokeWidth={1.5} color="var(--text-faint)" />
              </div>
            </Link>
          );
        })}
      </Card>
    </div>
  );
}
