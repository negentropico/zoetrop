import { useSearchParams } from "react-router";
import type { Route } from "./+types/supplements";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getSupplements } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { SUPPLEMENT_TIERS, type SupplementTier } from "~/types/protocol";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { PageHeader } from "~/components/ui/PageHeader";

// Supplement type from DB (subset of the full Supplement type used for display)
type DBSupplement = {
  id: number;
  name: string;
  tier: string;
  dosage: number;
  unit: string;
  frequency: string;
  timing: string | null;
  isActive: boolean;
  geneticBasis: string | null;
  notes: string | null;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Supplements - Zoetrop" },
    { name: "description", content: "Manage supplement protocol" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  const supplements = await getSupplements(ctx);

  // Group by tier
  const byTier = supplements.reduce((acc, supp) => {
    const tier = supp.tier as SupplementTier;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(supp);
    return acc;
  }, {} as Record<SupplementTier, typeof supplements>);

  // Stats
  const totalDaily = supplements
    .filter((s) => s.frequency === "daily" && s.isActive)
    .reduce((sum) => sum + 1, 0);

  return {
    supplements,
    byTier,
    stats: {
      total: supplements.length,
      active: supplements.filter((s) => s.isActive).length,
      withGenetic: supplements.filter((s) => s.geneticBasis).length,
      dailyCount: totalDaily,
    },
  };
}

// Tier badge using brand tones (tier-definitions card)
function TierBadge({ tier }: { tier: SupplementTier }) {
  const toneMap: Record<SupplementTier, "vital" | "focus" | "energy" | "neutral"> = {
    tier1: "vital",
    tier2: "focus",
    tier3: "energy",
    as_needed: "neutral",
  };
  const info = SUPPLEMENT_TIERS[tier];
  return <Badge tone={toneMap[tier] || "neutral"}>{info.label}</Badge>;
}

// Tier color dot — round 3: tier label carries a color dot (the left-border
// accent treatment is dropped).
const TIER_DOT: Record<SupplementTier, string> = {
  tier1: "var(--vital)",
  tier2: "var(--focus)",
  tier3: "var(--energy)",
  as_needed: "var(--n-300)",
};

// Round-3 tier section sublabels (prototype: "Tier 1 — Core" etc.)
const TIER_SUB: Record<SupplementTier, string> = {
  tier1: "Core",
  tier2: "Targeted",
  tier3: "Conditional",
  as_needed: "Situational",
};

// Supplement row — frame-card list row: name with rationale visible under
// it (no expansion), mono dose, timing (round 3).
function SupplementRow({ supplement, last }: { supplement: DBSupplement; last: boolean }) {
  const rationale = [supplement.notes, supplement.geneticBasis].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.8fr)",
        gap: "var(--gap-xl)",
        padding: "var(--gap-row) var(--gap-card)",
        borderBottom: last ? "none" : "1px solid var(--border)",
        alignItems: "center",
        opacity: supplement.isActive ? 1 : 0.55,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: "var(--text)", fontSize: "var(--text-sm)" }}>
          {supplement.name}
          {!supplement.isActive && (
            <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              inactive
            </span>
          )}
        </div>
        {rationale && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 3, textWrap: "pretty" }}>
            {rationale}
          </div>
        )}
      </div>
      <div className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text)" }}>
        {supplement.dosage} {supplement.unit} · {supplement.frequency}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {supplement.timing || "—"}
      </div>
    </div>
  );
}

export default function Supplements({ loaderData }: Route.ComponentProps) {
  const { byTier, stats } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const showInactive = searchParams.get("inactive") === "true";

  const tiers = Object.keys(SUPPLEMENT_TIERS) as SupplementTier[];

  return (
    <div>
      <PageHeader
        eyebrow="SUPPLEMENTS BY TIER"
        title="Supplements"
        sub="Protocol-graded supplement stack."
        right={
          <label className="zt-pill" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                const newParams = new URLSearchParams(searchParams);
                if (e.target.checked) {
                  newParams.set("inactive", "true");
                } else {
                  newParams.delete("inactive");
                }
                setSearchParams(newParams);
              }}
              style={{ accentColor: "var(--accent)" }}
            />
            Show inactive
          </label>
        }
      />

      {/* Stats — stat strip card (round 3) */}
      <Card padding="lg" style={{ marginBottom: "var(--gap-section)" }}>
        <div className="zt-stat-strip">
          {[
            { label: "Active", value: stats.active },
            { label: "Daily items", value: stats.dailyCount },
            { label: "Genetic-based", value: stats.withGenetic },
            { label: "Tier 1", value: byTier.tier1?.length || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="zt-stat">
              <div className="zt-eyebrow" style={{ marginBottom: 8 }}>{label}</div>
              <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tier sections — tier label with color dot (left-border accent
          dropped); rationale visible under each name; mono doses. */}
      {tiers.map((tier) => {
        const info = SUPPLEMENT_TIERS[tier];
        const tierSupps = ((byTier[tier] as DBSupplement[] | undefined) || []).filter(
          (s) => showInactive || s.isActive
        );
        if (tierSupps.length === 0) return null;
        return (
          <section key={tier} className="zt-section">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--gap-lg)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: TIER_DOT[tier], flex: "0 0 auto" }} />
              <div className="zt-eyebrow" style={{ color: "var(--text-secondary)" }}>
                {info.label} — {TIER_SUB[tier]}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                {tierSupps.length}
              </span>
            </div>
            <Card padding="none">
              {tierSupps.map((supplement, i) => (
                <SupplementRow
                  key={supplement.id}
                  supplement={supplement}
                  last={i === tierSupps.length - 1}
                />
              ))}
            </Card>
          </section>
        );
      })}

      {/* Tier definitions */}
      <Card padding="lg">
        <div className="zt-eyebrow" style={{ marginBottom: 16 }}>TIER DEFINITIONS</div>
        <div className="zt-grid-2">
          {tiers.map((tier) => {
            const info = SUPPLEMENT_TIERS[tier];
            return (
              <div key={tier}>
                <div style={{ marginBottom: 6 }}>
                  <TierBadge tier={tier} />
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
                  {info.description}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
