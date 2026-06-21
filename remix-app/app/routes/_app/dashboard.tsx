import { Link, useLoaderData } from "react-router";
import { CATEGORY_INFO, type MetricCategory, type MetricStatus, type Metric } from "~/types/metrics";
import { CESSATION_PHASES } from "~/types/protocol";
import { requireSubjectCtx } from "~/lib/authz.server";
import {
  getCorrelations,
  getSubjectGenotypes,
  getCessationLog,
  getProtocolVersions,
  getSupplements,
  getMetrics,
} from "~/lib/data.server";
import { dbRowToMetric } from "~/lib/db-mappers.server";
import { getGeneticKnowledgeByGene } from "~/lib/corpus.server";
import { getCessationDay, getCurrentCessationPhase } from "~/lib/cessation";
import { getMetricStatus } from "~/lib/metrics";
import {
  Pill,
  Gem,
  Flame,
  Zap,
  FlaskConical,
  HeartPulse,
  Dumbbell,
  Droplet,
  Dna,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { CatChip } from "~/components/ui/CatChip";
import { StatusDot } from "~/components/ui/StatusDot";
import { PhaseBar } from "~/components/ui/PhaseBar";
import { Sparkline } from "~/components/ui/Sparkline";
import { Delta } from "~/components/ui/Delta";
import type { Phase } from "~/components/ui/PhaseBar";
import { SigGhost, SigEyebrow, goldenRanks, sigDelay } from "~/components/ui/Signature";

// Significance derivation — survivor presentation helper (non-PHI)
function getCorrelationSignificance(r: number): "strong" | "moderate" | "weak" | "none" {
  const absR = Math.abs(r);
  if (absR >= 0.7) return "strong";
  if (absR >= 0.4) return "moderate";
  if (absR >= 0.2) return "weak";
  return "none";
}

// Lucide icon map by category icon name
const LUCIDE_MAP: Record<string, LucideIcon> = {
  pill: Pill,
  gem: Gem,
  flame: Flame,
  zap: Zap,
  "flask-conical": FlaskConical,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  droplet: Droplet,
  dna: Dna,
};

export function meta() {
  return [
    { title: "Zoetrop" },
    { name: "description", content: "Your signals, one frame at a time." },
  ];
}

// Correlation shape returned by the DB + derivation
type DerivedCorrelation = {
  id: number;
  supplementId: number;
  supplementName: string;
  metricName: string;
  correlation: number;
  lagDays: number;
  sampleSize: number;
  pValue: number | null;
  significance: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative";
};

// Genetic variant shape from DB + knowledge join
type DerivedVariant = {
  id: number;
  gene: string;
  rsid: string | null;
  genotype: string;
  confidence: string;
  category: string;
  impact: string;
  clinicalImplication: string;
  protocolAction: string;
};

// Highlight shape — latest metrics with sparkline history (round-3 dashboard)
type Highlight = {
  name: string;
  category: MetricCategory;
  id: string;
  value: number;
  unit: string;
  status: MetricStatus;
  values: number[]; // oldest first
};

export async function loader({ request }: { request: Request }, now: Date = new Date()) {
  const { ctx } = await requireSubjectCtx(request);

  const [
    correlationsRows,
    supplementsRows,
    genotypeRows,
    cessationRows,
    protocolVersionsRows,
    metricsRows,
    geneticKnowledge,
  ] = await Promise.all([
    getCorrelations(ctx),
    getSupplements(ctx),
    getSubjectGenotypes(ctx),
    getCessationLog(ctx),
    getProtocolVersions(ctx),
    getMetrics(ctx),
    getGeneticKnowledgeByGene(),
  ]);

  // Build supplement id → name map
  const suppNameMap = new Map(supplementsRows.map((s) => [s.id, s.name]));

  // Derive correlations with supplementName, significance, direction
  const allCorrelations: DerivedCorrelation[] = correlationsRows.map((c) => ({
    id: c.id,
    supplementId: c.supplementId,
    supplementName: suppNameMap.get(c.supplementId) ?? `Supplement #${c.supplementId}`,
    metricName: c.metricName,
    correlation: c.correlation,
    lagDays: c.lagDays,
    sampleSize: c.sampleSize,
    pValue: c.pValue ?? null,
    significance: getCorrelationSignificance(c.correlation),
    direction: c.correlation >= 0 ? "positive" : "negative",
  }));

  // Top correlations by absolute value
  const topCorrelations = [...allCorrelations]
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 3);

  // Join genotypes with corpus genetic knowledge
  const allVariants: DerivedVariant[] = genotypeRows
    .flatMap((row) => {
      const knowledge = geneticKnowledge[row.gene];
      if (!knowledge) return [];
      const variant: DerivedVariant = {
        id: row.id,
        gene: row.gene,
        rsid: row.rsid ?? null,
        genotype: row.genotype,
        confidence: knowledge.confidence,
        category: knowledge.category,
        impact: knowledge.impact,
        clinicalImplication: knowledge.clinicalImplication,
        protocolAction: knowledge.protocolAction,
      };
      return [variant];
    });

  // High-impact genetic variants
  const highImpactVariants = allVariants
    .filter((v) => v.impact === "high")
    .slice(0, 3);

  // K3 variants needing verification
  const k3Variants = allVariants.filter((v) => v.confidence === "K3");

  // Cessation data
  const cessation = cessationRows[0] ?? null;
  // hasCessationProgram: false for client subjects with no cessation_log row.
  // Prevents the misleading "Day 0 · Acute" hero for subjects with no program (Pitfall 6).
  const hasCessationProgram = cessation !== null;
  // cessationDay + cessationPhase are null (not 0) when no program exists —
  // distinguishes "no program" from "program just started at day 0".
  const cessationDay = hasCessationProgram
    ? getCessationDay(
        cessation!.startDate instanceof Date
          ? cessation!.startDate.toISOString()
          : (cessation!.startDate as unknown as string),
        now
      )
    : null;
  const cessationPhase = hasCessationProgram ? getCurrentCessationPhase(cessationDay!) : null;
  const targetDay = 150;

  // Protocol versions — sorted ascending, pick latest
  const sortedVersions = [...protocolVersionsRows].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );
  const currentVersionObj = sortedVersions[sortedVersions.length - 1] ?? null;
  const activeSupplements = supplementsRows.filter((s) => s.isActive).length;

  // Real metrics data
  const allMetrics = metricsRows.map(dbRowToMetric);

  // Get latest value for each unique metric name
  const latestByName = new Map<string, Metric>();
  allMetrics.forEach((m) => {
    const existing = latestByName.get(m.name);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latestByName.set(m.name, m);
    }
  });
  const latestMetrics = Array.from(latestByName.values());

  // History values per metric name (oldest first) — highlight sparklines
  const historyByName = new Map<string, Array<{ timestamp: string; value: number }>>();
  allMetrics.forEach((m) => {
    const arr = historyByName.get(m.name) || [];
    arr.push({ timestamp: m.timestamp, value: m.value });
    historyByName.set(m.name, arr);
  });
  historyByName.forEach((arr) =>
    arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  );

  // Recent highlights — most recently drawn metrics; prefer ones with a trend
  const byRecency = [...latestMetrics].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const multiPoint = byRecency.filter((m) => (historyByName.get(m.name)?.length ?? 0) >= 2);
  const singlePoint = byRecency.filter((m) => (historyByName.get(m.name)?.length ?? 0) < 2);
  const highlights: Highlight[] = [...multiPoint, ...singlePoint].slice(0, 4).map((m) => ({
    name: m.name,
    category: m.category,
    id: m.id,
    value: m.value,
    unit: m.unit,
    status: getMetricStatus(m),
    values: (historyByName.get(m.name) || []).map((h) => h.value),
  }));

  const byCategory = (Object.keys(CATEGORY_INFO) as MetricCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = latestMetrics.filter((m) => m.category === cat);
      return acc;
    },
    {} as Record<MetricCategory, Metric[]>
  );

  // Status counts across all metrics
  const statusCounts = latestMetrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  return {
    topCorrelations,
    highImpactVariants,
    k3Variants,
    stats: {
      totalCorrelations: allCorrelations.length,
      strongCorrelations: allCorrelations.filter((c) => c.significance === "strong").length,
      totalVariants: allVariants.length,
      confirmedVariants: allVariants.filter((v) => v.confidence === "K1").length,
    },
    hasCessationProgram,
    cessationDay,
    cessationPhase,
    targetDay,
    byCategory,
    statusCounts,
    totalMetrics: latestMetrics.length,
    highlights,
    currentVersion: currentVersionObj?.version || "—",
    totalVersions: sortedVersions.length,
    activeSupplements,
  };
}

// Build PhaseBar phases from CESSATION_PHASES + current day
function buildPhaseBarPhases(cessationDay: number, targetDay: number): Phase[] {
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  unit,
  hint,
  to,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: React.ReactNode;
  to: string;
}) {
  return (
    <Link to={to} style={{ display: "flex" }}>
      <Card padding="md" interactive style={{ flex: "1 1 auto", minHeight: 104, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="zt-eyebrow">{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
          <span className="zt-readout" style={{ fontSize: "var(--text-2xl)", color: "var(--ink)" }}>
            {value}
          </span>
          {unit && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {unit}
            </span>
          )}
          {hint && <span style={{ marginLeft: "auto", alignSelf: "center" }}>{hint}</span>}
        </div>
      </Card>
    </Link>
  );
}

function CorrRow({ c, last }: { c: DerivedCorrelation; last: boolean }) {
  const neg = c.correlation < 0;
  const col = neg ? "var(--deficient)" : "var(--vital-500, var(--vital))";
  const sign = c.correlation >= 0 ? "+" : "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "var(--gap-row) 0",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "var(--text-base)" }}>{c.supplementName}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 3 }}>
          {c.metricName} · {c.lagDays}d lag
        </div>
      </div>
      <span className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-lg)", fontWeight: 700, color: col }}>
        {sign}{c.correlation.toFixed(2)}
      </span>
    </div>
  );
}

function GeneRow({ g, last }: { g: DerivedVariant; last: boolean }) {
  const conf = g.confidence === "K1" ? "vital" : "energy";
  const confLabel = g.confidence;
  const confColor = conf === "vital" ? "var(--vital)" : "var(--energy)";
  const confBg = conf === "vital" ? "var(--vital-50)" : "var(--energy-50)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: "var(--gap-row) 0",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{g.gene}</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "3px 8px",
              borderRadius: "var(--radius-pill)",
              color: confColor,
              background: confBg,
              whiteSpace: "nowrap",
            }}
          >
            {confLabel}
          </span>
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 4 }}>
          {g.protocolAction}
        </div>
      </div>
      <span
        style={{
          flex: "0 0 auto",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          whiteSpace: "nowrap",
          textAlign: "right",
          paddingTop: 2,
        }}
      >
        {g.genotype}
      </span>
    </div>
  );
}

// Category card — round-4 FRAME STRIP (one status dot per marker + mono
// "N markers · n optimal" readout; icon tiles kept as the dashboard idiom).
// Supersedes the round-3 CountDots/ring treatment — rings only ever read
// true completion, never status share (BAKED).
// Round-5 LINE-signature: zt-sig-frame settle + φ-stagger; zt-sig-icon
// hairline frame around the icon tile.
function CategoryCardItem({
  category,
  metrics,
  sigIndex,
}: {
  category: MetricCategory;
  metrics: Metric[];
  sigIndex: number;
}) {
  const info = CATEGORY_INFO[category];
  const icon = LUCIDE_MAP[info.icon];

  const optimal = metrics.filter((m) => getMetricStatus(m) === "optimal").length;

  return (
    // W2a card-structure fix: anchors are flex containers, cards flex:1 —
    // no height:100% inside grid-item anchors.
    <Link to={`/metrics/${category}`} style={{ display: "flex", textDecoration: "none" }}>
      {/* zt-sig-frame settle + φ-stagger index for golden-order mount animation */}
      <Card interactive padding="md" className="zt-sig-frame" style={{ flex: "1 1 auto", display: "flex", alignItems: "center", gap: "var(--gap-lg)", ...sigDelay(sigIndex) }}>
        {/* zt-sig-icon: hairline frame around the category icon tile */}
        {icon && (
          <span className="zt-sig-icon">
            <CatChip icon={icon} family={info.family} size={36} />
          </span>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)" }}>
            {info.label}
          </div>
          <div className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)", marginTop: 2 }}>
            {metrics.length} markers · {optimal} optimal
          </div>
        </div>
        {/* frame strip: one dot per marker */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 110 }}>
          {metrics.map((m) => (
            <StatusDot key={m.id} status={getMetricStatus(m)} size={10} />
          ))}
        </div>
      </Card>
    </Link>
  );
}

// ── Main dashboard component ───────────────────────────────────────────────────

export default function Dashboard() {
  const loaderData = useLoaderData<typeof loader>();
  const {
    topCorrelations,
    highImpactVariants,
    k3Variants,
    stats,
    hasCessationProgram,
    cessationDay,
    cessationPhase,
    targetDay,
    byCategory,
    statusCounts,
    totalMetrics,
    highlights,
    currentVersion,
    totalVersions,
    activeSupplements,
  } = loaderData;

  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];
  const needLook = (statusCounts.deficient || 0) + (statusCounts.excess || 0);
  // cessationDay is null when no program exists — guard before arithmetic
  const cessationComplete = hasCessationProgram && cessationDay !== null && cessationDay >= targetDay;
  const pastTarget = cessationDay !== null ? cessationDay - targetDay : 0;
  const phaseBarPhases = hasCessationProgram && cessationDay !== null
    ? buildPhaseBarPhases(cessationDay, targetDay)
    : [];

  // φ-stagger ranks for the 9 category cards (golden-ratio ordering)
  const catRanks = goldenRanks(categories.length);
  // φ-stagger ranks for the 4 highlight cards
  const hlRanks = goldenRanks(highlights.length);

  // Eyebrow date
  const now = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const eyebrowDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Today's frame · ${eyebrowDate}`}
        title="Dashboard"
        sub="Your signals, one frame at a time. 9 categories, tracked."
      />

      {/* Phasing hero — round-3 rebuild: day readout leads, phase bar
          carries the current-day marker. Guard: hasCessationProgram prevents
          a misleading "Day 0 · Acute" for client subjects with no program (Pitfall 6).
          Round-5: corner spiral watermark (SigGhost draw) clipped to the hero. */}
      <Card padding="lg" style={{ position: "relative", overflow: "hidden" }}>
        {/* Corner spiral watermark — ink hairline, 5% opacity, clipped */}
        <SigGhost
          size={200}
          strokeWidth={3}
          draw
          withEye
          style={{
            position: "absolute",
            bottom: -40,
            right: -40,
            pointerEvents: "none",
          }}
        />
        {hasCessationProgram && cessationDay !== null && cessationPhase !== null ? (
          <div
            className="zt-hero-grid"
            style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.5fr)", gap: "var(--gap-2xl)", alignItems: "center" }}
          >
            <div>
              <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
                Phasing · {currentVersion}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span className="zt-readout" style={{ fontSize: "var(--text-4xl)", color: "var(--ink)" }}>
                  {cessationDay}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                  / {targetDay} DAYS
                </span>
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 12 }}>
                <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{cessationPhase.label}</strong>
                {" — "}
                {cessationPhase.focus}
              </div>
              <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {cessationComplete ? `${pastTarget} days past target` : `${-pastTarget} days to target`}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <PhaseBar phases={phaseBarPhases} height={16} day={cessationDay} />
              <div style={{ marginTop: 14, textAlign: "right" }}>
                <Link to="/protocol/cessation" className="zt-link">
                  Full timeline <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Placeholder — shown when the active subject has no cessation program (Pitfall 6).
             Copy locked by UI-SPEC Dashboard cessation guard section. */
          <div>
            <div className="zt-eyebrow" style={{ marginBottom: 12 }}>PROGRAM</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "var(--text-lg)",
                color: "var(--ink)",
                marginBottom: 10,
              }}
            >
              No program started
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
              Program details will appear here once a program start date is set for this client.
            </p>
          </div>
        )}
      </Card>

      {/* Stat tiles — zt-grid-4; each tile settles in φ-stagger order */}
      <div className="zt-grid-4">
        <StatTile label="Metrics tracked" value={totalMetrics} to="/metrics" />
        <StatTile
          label="Need a look"
          value={needLook}
          hint={
            needLook > 0 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {(["deficient", "excess"] as MetricStatus[]).map((s) =>
                  (statusCounts[s] || 0) > 0 ? (
                    <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <StatusDot status={s} size={7} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
                        {statusCounts[s]}
                      </span>
                    </span>
                  ) : null
                )}
              </span>
            ) : undefined
          }
          to="/metrics"
        />
        <StatTile label="Active supplements" value={activeSupplements} to="/protocol/supplements" />
        <StatTile label="Protocol version" value={currentVersion} unit={`${totalVersions} versions`} to="/protocol/versions" />
      </div>

      {/* Metric status — stat strip (round 4: no ring for status share) */}
      <Card padding="lg">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-lg)" }}>
          <SigEyebrow>Metric status</SigEyebrow>
          <Link to="/metrics" className="zt-link" style={{ fontSize: "var(--text-xs)" }}>
            All metrics <ArrowRight size={13} strokeWidth={2} />
          </Link>
        </div>
        <div className="zt-stat-strip">
          {(["optimal", "borderline", "deficient", "excess"] as MetricStatus[]).map((k) => (
            <div key={k} className="zt-stat">
              <div className="zt-eyebrow" style={{ marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 7 }}>
                <StatusDot status={k} size={8} />
                {k}
              </div>
              <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)" }}>
                {statusCounts[k] || 0}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent highlights — figure leads, delta-since-last + status sparkline.
          Round-5: SigEyebrow section label; zt-sig-frame + φ-stagger on each card. */}
      {highlights.length > 0 && (
        <div>
          <div style={{ marginBottom: "var(--gap-lg)" }}>
            <SigEyebrow>Recent highlights</SigEyebrow>
          </div>
          <div className="zt-grid-4">
            {highlights.map((m, i) => (
              <Link key={m.id} to={`/metrics/${m.category}/${m.id}`} style={{ display: "flex", textDecoration: "none" }}>
                <Card interactive padding="md" className="zt-sig-frame" style={{ flex: "1 1 auto", ...sigDelay(hlRanks[i]) }}>
                  <div className="zt-eyebrow" style={{ marginBottom: 10 }}>{m.name}</div>
                  <div className="zt-readout" style={{ fontSize: "var(--text-xl)", color: "var(--ink)", marginBottom: 8 }}>
                    {m.value}{" "}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", fontWeight: 400, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                      {m.unit}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                    <Delta values={m.values} />
                    {m.values.length >= 2 && (
                      <Sparkline data={m.values} width={64} height={18} status={m.status} />
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Correlations + genetics — zt-grid-2 */}
      <div className="zt-grid-2" style={{ alignItems: "start" }}>
        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-md)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)" }}>
              Top correlations
            </div>
            <Link to="/insights/correlations" className="zt-link" style={{ fontSize: "var(--text-xs)" }}>
              View all · {stats.totalCorrelations} <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>
          <div>
            {topCorrelations.map((c, i) => (
              <CorrRow key={c.id} c={c} last={i === topCorrelations.length - 1} />
            ))}
          </div>
          <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {stats.strongCorrelations} strong correlations (|r| ≥ 0.7)
          </div>
        </Card>

        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-md)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)" }}>
              Genetic insights
            </div>
            <Link to="/insights/genetics" className="zt-link" style={{ fontSize: "var(--text-xs)" }}>
              View all · {stats.totalVariants} <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>
          {highImpactVariants.map((g, i) => (
            <GeneRow key={g.id} g={g} last={i === highImpactVariants.length - 1} />
          ))}
          {k3Variants.length > 0 && (
            <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--warning)" }}>
              {k3Variants.length} K3 variant{k3Variants.length !== 1 ? "s" : ""} need verification
            </div>
          )}
        </Card>
      </div>

      {/* Category grid — zt-grid-3, frame-strip cards.
          Round-5: SigEyebrow section label; zt-sig-frame + φ-stagger on cards (9);
          zt-sig-icon hairline around each category icon tile. */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--gap-lg)" }}>
          <SigEyebrow>Metric categories</SigEyebrow>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            {categories.length}
          </span>
        </div>
        <div className="zt-grid-3">
          {categories.map((category, i) => (
            <CategoryCardItem
              key={category}
              category={category}
              metrics={byCategory[category] || []}
              sigIndex={catRanks[i]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
