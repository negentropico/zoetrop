/**
 * vault.tsx — Vault import, CONNECTED/honest state (design-r35/W4b, screens-r5.jsx)
 *
 * Trust model (BAKED round 5): the Obsidian vault is a TRUSTED SOURCE — notes
 * and targets land directly, no review gate. Only lab PDFs pass review. The meta
 * strip + footer note state this.
 *
 * GROUNDING + HONESTY (W4b constraint): the ZD.vault sample (path '~/Obsidian/
 * health', sync schedule, recently-synced note list) is a loader contract
 * sketch — NOT data to integrate. There is no vault-sync table in the app, so:
 *   - Vault path / last-sync / schedule / per-note sync metadata are NOT
 *     tracked. We render an HONEST "manual reference import" state instead of
 *     fabricating a connection. We do NOT hardcode the user-specific absolute
 *     vault path (/Users/mac/vaults/#Bwell/602/ from CLAUDE.md) into shipped UI.
 *   - "Recently synced notes" has no real backing → honest manual-reference
 *     empty state (not a fabricated note list).
 *
 * REAL DATA: "Metric targets" are the app's real 2026 Q1/Q2 targets
 * (METRIC_TARGETS, ~/lib/metric-targets — the in-app analog of the vault's
 * 09_Targets_2026.md note). Each target is resolved to a real metric DB id so
 * the row links into the metric detail; targets without a real metric reading
 * are still listed (honest) but render without a link. The BAKED mapping
 * language applies: linked rows show → catId/metricId; unlinked targets read
 * "not yet tracked".
 */

import { Link } from "react-router";
import type { Route } from "./+types/vault";
import { ChevronRight, RefreshCw, FileText } from "lucide-react";
import { requireUser } from "~/lib/authz.server";
import { getOwnerSubject, getMetrics } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { dbRowToMetric } from "~/lib/db-mappers.server";
import { METRIC_TARGETS } from "~/lib/metric-targets";
import type { MetricCategory } from "~/types/metrics";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Vault import - Zoetrop" },
    { name: "description", content: "Protocol notes and metric targets from the Obsidian vault" },
  ];
}

type VaultTarget = {
  metricName: string;
  // formatted target string (e.g. "50 → 55 ng/mL")
  target: string;
  // resolved real metric id (latest reading) + category, or null when no real
  // metric reading exists yet (honest — link suppressed)
  catId: MetricCategory | null;
  metricId: string | null;
};

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };

  // REAL metrics — resolve target metric NAMEs to the latest reading's DB id so
  // each target row can link into the metric detail. getMetrics is unordered, so
  // resolve with newest-wins.
  const rows = (await getMetrics(ctx)).map(dbRowToMetric);
  const newest = new Map<string, { id: string; category: MetricCategory; ts: number }>();
  for (const m of rows) {
    const ts = new Date(m.timestamp).getTime();
    const cur = newest.get(m.name);
    if (!cur || ts > cur.ts) newest.set(m.name, { id: m.id, category: m.category, ts });
  }

  const targets: VaultTarget[] = METRIC_TARGETS.map((t) => {
    const resolved = newest.get(t.metricName) ?? null;
    const arrow = t.direction === "target" ? "→" : t.direction === "higher" ? "↑" : "↓";
    return {
      metricName: t.metricName,
      target: `${t.q1Target} ${arrow} ${t.q2Stretch} ${t.unit}`,
      catId: resolved ? resolved.category : null,
      metricId: resolved ? resolved.id : null,
    };
  });

  const linkedCount = targets.filter((t) => t.metricId).length;

  return {
    targets,
    linkedCount,
    targetCount: targets.length,
    // honest-empty: there is no vault-sync table — these are NOT tracked
    sync: {
      tracked: false as const,
      // recently-synced notes have no real backing
      recentNotes: [] as Array<{ file: string; kind: string; synced: string }>,
    },
  };
}

// ── shared idioms (mirror the WHOOP / review screens) ───────────────────────
function TrustNote({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: "var(--gap-lg)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "var(--gap-lg)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textWrap: "pretty" }}>{children}</span>
      {right}
    </div>
  );
}

function MetaStrip({ stats }: { stats: Array<{ label: string; value: string; sub?: string }> }) {
  return (
    <Card>
      <div className="zt-stat-strip">
        {stats.map((s) => (
          <div key={s.label} className="zt-stat">
            <div className="zt-eyebrow" style={{ marginBottom: 6 }}>{s.label}</div>
            <div
              className="zt-meta-val"
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
            >
              {s.value}
            </div>
            {s.sub && (
              <div className="zt-eyebrow zt-meta-sub" style={{ marginTop: 5, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                {s.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-lg)" }}>
      <div className="zt-eyebrow">
        {children}
        {count != null && <span style={{ color: "var(--text-faint)" }}>{"  ·  "}{count}</span>}
      </div>
    </div>
  );
}

export default function VaultImport({ loaderData }: Route.ComponentProps) {
  const { targets, linkedCount, targetCount, sync } = loaderData;

  // Honest meta strip — connection metadata is NOT tracked; we state the manual
  // reference-import reality rather than fabricate path/sync timestamps.
  const stats = [
    { label: "Source", value: "Obsidian vault", sub: "manual reference import" },
    { label: "Last sync", value: "Not tracked", sub: "no sync schedule" },
    { label: "Targets", value: `${linkedCount} / ${targetCount}`, sub: "→ linked to metrics" },
    { label: "Writes", value: "Direct", sub: "trusted source · no gate" },
  ];

  return (
    <div data-screen-label="Vault import">
      <PageHeader
        crumbs={[{ label: "Ingest", to: "/ingest" }, { label: "Vault" }]}
        eyebrow="INGEST"
        title="Vault import"
        sub="Protocol notes and metric targets from the Obsidian vault"
        right={
          <span className="zt-pill" title="Sync is a manual reference import — not yet automated" style={{ cursor: "default", opacity: 0.7 }}>
            <RefreshCw size={13} strokeWidth={1.8} />
            Manual sync
          </span>
        }
      />

      <section className="zt-section">
        <MetaStrip stats={stats} />
      </section>

      <div className="zt-grid-2 zt-section">
        <section>
          <SectionLabel count={sync.recentNotes.length}>Recently synced</SectionLabel>
          <Card padding="none">
            {sync.recentNotes.length > 0 ? (
              sync.recentNotes.map((n, i, arr) => (
                <div
                  key={n.file}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--gap-lg)",
                    padding: "var(--gap-row) var(--gap-card)",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="zt-tnum"
                      style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {n.file}
                    </div>
                    <div className="zt-eyebrow" style={{ marginTop: 3, letterSpacing: "0.06em", color: "var(--text-faint)" }}>{n.kind}</div>
                  </div>
                  <span className="zt-eyebrow zt-tnum" style={{ flex: "0 0 auto" }}>{n.synced}</span>
                </div>
              ))
            ) : (
              <div
                className="zt-chart-empty"
                style={{
                  padding: "var(--gap-2xl) var(--gap-card)",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <FileText size={22} strokeWidth={1.5} color="var(--text-faint)" />
                <div className="zt-eyebrow">Sync log not tracked</div>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 300 }}>
                  Vault notes are a manual reference import — there is no automated
                  sync log yet, so no recently-synced files are recorded.
                </p>
              </div>
            )}
          </Card>
        </section>

        <section>
          <SectionLabel count={targets.length}>Metric targets</SectionLabel>
          <Card padding="none">
            {targets.map((t, i, arr) => {
              const linked = !!t.metricId;
              const inner = (
                <div
                  className="zt-mrow"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--gap-lg)",
                    padding: "var(--gap-row) var(--gap-card)",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: linked ? "pointer" : "default",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: linked ? "var(--text)" : "var(--text-muted)" }}>
                      {t.metricName}
                    </div>
                    <div
                      className="zt-eyebrow"
                      style={{ marginTop: 3, letterSpacing: "0.06em", color: linked ? undefined : "var(--text-faint)" }}
                    >
                      {linked ? `→ ${t.catId}/${t.metricId}` : "not yet tracked"}
                    </div>
                  </div>
                  <span
                    className="zt-tnum"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-secondary)", flex: "0 0 auto" }}
                  >
                    {t.target}
                  </span>
                  {linked ? (
                    <ChevronRight size={16} strokeWidth={1.5} color="var(--text-faint)" />
                  ) : (
                    <span style={{ width: 16, flex: "0 0 auto" }} />
                  )}
                </div>
              );
              return linked ? (
                <Link key={t.metricName} to={`/metrics/${t.catId}/${t.metricId}`} style={{ display: "block", textDecoration: "none" }}>
                  {inner}
                </Link>
              ) : (
                <div key={t.metricName}>{inner}</div>
              );
            })}
          </Card>
        </section>
      </div>

      <TrustNote>
        The vault is a trusted source — notes and targets write directly, no
        review gate. Targets shown are the app's 2026 Q1/Q2 goals (the in-app
        analog of the vault target notes); owner targets may differ from a
        metric's optimal band, and both render on the metric screens. Vault sync
        is a manual reference import — automated sync is not yet tracked.
      </TrustNote>
    </div>
  );
}
