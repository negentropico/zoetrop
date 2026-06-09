import { useState } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/supplements";
import { realSupplements } from "~/lib/protocol-data";
import { SUPPLEMENT_TIERS, type SupplementTier, type Supplement } from "~/types/protocol";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { PageHeader } from "~/components/ui/PageHeader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Supplements - Zoetrop" },
    { name: "description", content: "Manage supplement protocol" },
  ];
}

export function loader() {
  const supplements = realSupplements;

  // Group by tier
  const byTier = supplements.reduce((acc, supp) => {
    if (!acc[supp.tier]) acc[supp.tier] = [];
    acc[supp.tier].push(supp);
    return acc;
  }, {} as Record<SupplementTier, Supplement[]>);

  // Stats
  const totalDaily = supplements
    .filter((s) => s.frequency === "daily" && s.isActive)
    .reduce((sum, s) => sum + 1, 0);

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

// Tier badge using brand tones
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

function SupplementCard({ supplement }: { supplement: Supplement }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      padding="md"
      style={{ opacity: supplement.isActive ? 1 : 0.6 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 500, color: "var(--ink)", fontSize: "var(--text-sm)" }}>
              {supplement.name}
            </span>
            <TierBadge tier={supplement.tier} />
            {!supplement.isActive && (
              <Badge tone="neutral">Inactive</Badge>
            )}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {supplement.dosage} {supplement.unit} · {supplement.frequency}
            {supplement.timing && ` · ${supplement.timing}`}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-base)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginLeft: 8,
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          {supplement.geneticBasis && (
            <div style={{ marginBottom: 8, fontSize: "var(--text-sm)" }}>
              <span style={{ color: "var(--text-muted)" }}>Genetic basis: </span>
              <span style={{ color: "var(--ink)" }}>{supplement.geneticBasis}</span>
            </div>
          )}
          {supplement.notes && (
            <div style={{ marginBottom: 8, fontSize: "var(--text-sm)" }}>
              <span style={{ color: "var(--text-muted)" }}>Notes: </span>
              <span style={{ color: "var(--ink)" }}>{supplement.notes}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
            <button
              style={{ padding: "6px 12px", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              Edit
            </button>
            <button
              style={{ padding: "6px 12px", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              {supplement.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Supplements({ loaderData }: Route.ComponentProps) {
  const { supplements, byTier, stats } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const tierFilter = searchParams.get("tier") as SupplementTier | null;
  const showInactive = searchParams.get("inactive") === "true";

  // Filter supplements
  let filtered = supplements;
  if (tierFilter) {
    filtered = filtered.filter((s) => s.tier === tierFilter);
  }
  if (!showInactive) {
    filtered = filtered.filter((s) => s.isActive);
  }

  const tiers = Object.keys(SUPPLEMENT_TIERS) as SupplementTier[];

  return (
    <div>
      <PageHeader
        eyebrow="SUPPLEMENTS BY TIER"
        title="Supplements"
        sub="Your active supplement stack, organized by tier."
      />

      {/* Stats */}
      <div className="zt-grid-4" style={{ marginBottom: "var(--gap-xl)" }}>
        {[
          { label: "Active", value: stats.active },
          { label: "Daily items", value: stats.dailyCount },
          { label: "Genetic-based", value: stats.withGenetic },
          { label: "Tier 1", value: byTier.tier1?.length || 0 },
        ].map(({ label, value }) => (
          <Card key={label} padding="md" style={{ minHeight: 90, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="zt-eyebrow">{label}</div>
            <span className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: "var(--ink)" }}>
              {value}
            </span>
          </Card>
        ))}
      </div>

      {/* Tier filter pills */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: "var(--gap-xl)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete("tier");
              setSearchParams(newParams);
            }}
            style={{
              padding: "9px 14px",
              borderRadius: "var(--radius-pill)",
              border: `1px solid ${!tierFilter ? "var(--ink)" : "var(--border)"}`,
              background: !tierFilter ? "var(--ink)" : "var(--surface)",
              color: !tierFilter ? "var(--n-50)" : "var(--text-secondary)",
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-sm)",
              fontWeight: !tierFilter ? 600 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            All tiers
          </button>
          {tiers.map((tier) => {
            const info = SUPPLEMENT_TIERS[tier];
            const count = byTier[tier]?.filter((s) => showInactive || s.isActive).length || 0;
            const isActive = tierFilter === tier;
            return (
              <button
                key={tier}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set("tier", tier);
                  setSearchParams(newParams);
                }}
                style={{
                  padding: "9px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: `1px solid ${isActive ? "var(--ink)" : "var(--border)"}`,
                  background: isActive ? "var(--ink)" : "var(--surface)",
                  color: isActive ? "var(--n-50)" : "var(--text-secondary)",
                  fontFamily: "var(--font-text)",
                  fontSize: "var(--text-sm)",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {info.label} ({count})
              </button>
            );
          })}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-secondary)", cursor: "pointer" }}>
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
          />
          Show inactive
        </label>
      </div>

      {/* Supplement grid */}
      <div className="zt-grid-2" style={{ marginBottom: "var(--gap-xl)" }}>
        {filtered.map((supplement) => (
          <SupplementCard key={supplement.id} supplement={supplement} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--gap-3xl) 0", color: "var(--text-muted)", fontFamily: "var(--font-text)" }}>
          No supplements match the current filters.
        </div>
      )}

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
