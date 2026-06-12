import { Link } from "react-router";
import type { Route } from "./+types/index";
import { requireSubjectCtx } from "~/lib/authz.server";
import {
  getProtocolVersions,
  getSupplements,
  getCessationLog,
  getMilestones,
} from "~/lib/data.server";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/cessation";
import { CESSATION_PHASES, SUPPLEMENT_TIERS } from "~/types/protocol";
import { parseISO, format } from "date-fns";
import { ArrowRight, GitBranch, Pill, Timer, GitCompare } from "lucide-react";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { PageHeader } from "~/components/ui/PageHeader";
import { PhaseBar } from "~/components/ui/PhaseBar";
import type { Phase } from "~/components/ui/PhaseBar";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Protocol Overview - Zoetrop" },
    { name: "description", content: "Supplement protocol management overview" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { ctx } = await requireSubjectCtx(request);

  const [protocolVersionsRows, supplements, cessationRows, milestonesRows] = await Promise.all([
    getProtocolVersions(ctx),
    getSupplements(ctx),
    getCessationLog(ctx),
    getMilestones(ctx),
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
    cessationDay,
    cessationPhase,
    latestMilestone,
    totalVersions,
    protocolVersions,
  } = loaderData;

  const phaseBarPhases = buildPhaseBarPhases(cessationDay);

  return (
    <div>
      <PageHeader
        eyebrow="PROTOCOL"
        title="Protocol overview"
        sub="Your supplement and phasing protocol, one frame at a time."
      />

      {/* Active protocol + Phasing — round-3 section-dashboard pair */}
      <section className="zt-section">
        <div className="zt-grid-2">
          <Card padding="lg">
            <div className="zt-eyebrow" style={{ marginBottom: 12 }}>Active protocol</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              {/* version chip */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: "var(--text-sm)",
                  color: "var(--accent)",
                  background: "var(--focus-50)",
                  borderRadius: "var(--radius-sm)",
                  padding: "3px 8px",
                }}
              >
                {currentVersion?.version || "—"}
              </span>
              <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--ink)" }}>
                Active since {currentVersion ? format(parseISO(currentVersion.effectiveDate), "MMM d, yyyy") : "—"}
              </div>
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--gap-lg)", textWrap: "pretty" }}>
              {currentVersion?.notes || "No notes on the active version."}
            </div>
            {latestMilestone && (
              <div className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", letterSpacing: "0.06em", marginBottom: "var(--gap-lg)" }}>
                LATEST MILESTONE · {format(parseISO(latestMilestone.date), "MMM d, yyyy")} — {latestMilestone.description}
              </div>
            )}
            <Link to="/protocol/versions" className="zt-link">
              Version history · {totalVersions} <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </Card>

          <Card padding="lg">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="zt-eyebrow">Phasing</div>
              <span className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                DAY {cessationDay} · {cessationPhase.label.toUpperCase()}
              </span>
            </div>
            <div style={{ marginBottom: "var(--gap-xl)" }}>
              <PhaseBar phases={phaseBarPhases} height={12} compact day={cessationDay} />
            </div>
            <Link to="/protocol/cessation" className="zt-link">
              Full timeline <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </Card>
        </div>
      </section>

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
              <div className="zt-eyebrow">SUPPLEMENTS BY TIER · {activeSupplementCount} ACTIVE</div>
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

      {/* Quick links — zt-pill row (round 3) */}
      <div style={{ display: "flex", gap: "var(--gap-md)", flexWrap: "wrap", marginTop: "var(--gap-section)" }}>
        {[
          { label: "Versions", to: "/protocol/versions", Icon: GitBranch },
          { label: "Supplements", to: "/protocol/supplements", Icon: Pill },
          { label: "Phasing", to: "/protocol/cessation", Icon: Timer },
          { label: "Compare", to: "/protocol/compare", Icon: GitCompare },
        ].map(({ label, to, Icon }) => (
          <Link key={to} to={to} className="zt-pill">
            <Icon size={14} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
