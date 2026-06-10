import { Link } from "react-router";
import type { Route } from "./+types/index";
import { requireUser } from "~/lib/authz.server";
import {
  getOwnerSubject,
  getProtocolVersions,
  getSupplements,
  getCessationLog,
  getMilestones,
} from "~/lib/data.server";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/cessation";
import { CESSATION_PHASES, SUPPLEMENT_TIERS } from "~/types/protocol";
import { differenceInDays, parseISO, format } from "date-fns";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { PhaseBar } from "~/components/ui/PhaseBar";
import type { Phase } from "~/components/ui/PhaseBar";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Protocol Overview - Zoetrop" },
    { name: "description", content: "Supplement protocol management overview" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const tenantId = user.tenantId!;
  const subjectId = subject.id;

  const [protocolVersionsRows, supplements, cessationRows, milestonesRows] = await Promise.all([
    getProtocolVersions(tenantId, subjectId),
    getSupplements(tenantId, subjectId),
    getCessationLog(tenantId, subjectId),
    getMilestones(tenantId, subjectId),
  ]);

  // Normalize timestamps to ISO strings
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

  const cessation = cessationRows[0] ?? null;
  const activeSupplements = supplements.filter((s) => s.isActive);

  // Sort versions ascending by effectiveDate for consistency
  const sortedVersions = [...normalizedVersions].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );

  const currentVersion = sortedVersions[sortedVersions.length - 1] ?? null;
  const latestMilestone = normalizedMilestones.length > 0
    ? normalizedMilestones[normalizedMilestones.length - 1]
    : null;

  // Calculate cessation progress using DB cessation log + survivor engine fns
  const cessationDay = cessation
    ? getCessationDay(
        cessation.startDate instanceof Date
          ? cessation.startDate.toISOString()
          : (cessation.startDate as unknown as string),
        new Date()
      )
    : 0;
  const cessationPhase = getCurrentCessationPhase(cessationDay);

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
    totalVersions: sortedVersions.length,
    protocolVersions: sortedVersions,
  };
}

// Stat tile — Card + .zt-eyebrow + .zt-readout (ProtoStat pattern from screen-protocol.jsx)
function ProtoStat({
  label,
  value,
  unit,
  sub,
  to,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  to?: string;
}) {
  const inner = (
    <Card padding="md" interactive={!!to} style={{ height: "100%", minHeight: 116, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div className="zt-eyebrow">{label}</div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: "var(--ink)" }}>
            {value}
          </span>
          {unit && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {unit}
            </span>
          )}
        </div>
        {sub && (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
    </Card>
  );
  return to ? <Link to={to} style={{ textDecoration: "none", display: "block", height: "100%" }}>{inner}</Link> : inner;
}

// Build PhaseBar phases from CESSATION_PHASES + current day
function buildPhaseBarPhases(cessationDay: number): Phase[] {
  return CESSATION_PHASES.map((p) => {
    const days = p.dayRange.end - p.dayRange.start + 1;
    let state: Phase["state"];
    if (cessationDay > p.dayRange.end) {
      state = "completed";
    } else if (cessationDay >= p.dayRange.start && cessationDay <= p.dayRange.end) {
      state = "current";
    } else {
      state = "upcoming";
    }
    return { id: p.phase, name: p.label, days, state };
  });
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
  const phaseBarPhases = buildPhaseBarPhases(cessationDay);

  return (
    <div>
      {/* Stat tiles — 4-up grid */}
      <div className="zt-grid-4" style={{ marginBottom: "var(--gap-2xl)" }}>
        <ProtoStat
          label="Current protocol"
          value={currentVersion?.version || "—"}
          unit={`${totalVersions} versions`}
          sub={`Active since ${currentVersion ? format(parseISO(currentVersion.effectiveDate), "MMM d") : "—"}`}
          to="/protocol/versions"
        />
        <ProtoStat
          label="Active supplements"
          value={activeSupplementCount}
          sub={`${supplementsByTier.tier1 || 0} Tier 1 · ${supplementsByTier.tier2 || 0} Tier 2`}
          to="/protocol/supplements"
        />
        <ProtoStat
          label="Cessation"
          value={`Day ${cessationDay}`}
          sub={`${cessationPhase.label} phase`}
          to="/protocol/cessation"
        />
        <ProtoStat
          label="Latest milestone"
          value={latestMilestone?.description.slice(0, 20) || "—"}
          sub={latestMilestone ? format(parseISO(latestMilestone.date), "MMM d, yyyy") : "—"}
        />
      </div>

      {/* FAAH Cessation Timeline card */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="zt-eyebrow">FAAH CESSATION TIMELINE</div>
          <Link
            to="/protocol/cessation"
            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", textDecoration: "none" }}
          >
            View tracker →
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
          <span className="zt-readout" style={{ fontSize: "var(--text-xl)" }}>{cessationDay}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            / {targetDay} days
          </span>
        </div>
        <PhaseBar phases={phaseBarPhases} />
      </Card>

      {/* Version history + Supplements by tier */}
      <div className="zt-grid-2">
        {/* Version history */}
        <Card padding="md">
          <div style={{ padding: "4px 8px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="zt-eyebrow">VERSION HISTORY</div>
              <Link
                to="/protocol/versions"
                style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", textDecoration: "none" }}
              >
                All →
              </Link>
            </div>
          </div>
          {[...protocolVersions].reverse().slice(0, 4).map((version, i) => (
            <Link
              key={version.id}
              to={`/protocol/versions/${version.version}`}
              style={{ textDecoration: "none" }}
            >
              <div
                className="zt-trow"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 12px", borderTop: i ? "1px solid var(--border)" : "none" }}
              >
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-lg)", width: 38, color: "var(--ink)" }}>
                  {version.version}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {version.notes || "—"}
                </span>
                {version.version === currentVersion?.version && (
                  <Badge tone="success">Current</Badge>
                )}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {format(parseISO(version.effectiveDate), "MMM yyyy")}
                </span>
              </div>
            </Link>
          ))}
        </Card>

        {/* Supplements by tier */}
        <Card padding="md">
          <div style={{ padding: "4px 8px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="zt-eyebrow">SUPPLEMENTS BY TIER</div>
              <Link
                to="/protocol/supplements"
                style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", textDecoration: "none" }}
              >
                Manage →
              </Link>
            </div>
          </div>
          {Object.entries(SUPPLEMENT_TIERS).map(([tier, info], i) => {
            const count = supplementsByTier[tier] || 0;
            const toneMap: Record<string, "vital" | "focus" | "energy" | "neutral"> = {
              tier1: "vital",
              tier2: "focus",
              tier3: "energy",
              as_needed: "neutral",
            };
            return (
              <div
                key={tier}
                className="zt-trow"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", borderTop: i ? "1px solid var(--border)" : "none" }}
              >
                <Badge tone={toneMap[tier] || "neutral"}>{info.label}</Badge>
                <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                  {info.description.slice(0, 40)}
                </span>
                <span className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-md)", color: "var(--ink)" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
