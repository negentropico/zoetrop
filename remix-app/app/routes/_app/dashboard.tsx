import { Link, useLoaderData } from "react-router";
import { CATEGORY_INFO, type MetricCategory, type MetricStatus, type Metric } from "~/types/metrics";
import { CESSATION_PHASES } from "~/types/protocol";
import { CONFIDENCE_LEVELS } from "~/types/genetics";
import { requireUser } from "~/lib/authz.server";
import {
  getOwnerSubject,
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { CatChip } from "~/components/ui/CatChip";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { StatusDot } from "~/components/ui/StatusDot";
import { PhaseBar } from "~/components/ui/PhaseBar";
import { MetricRing } from "~/components/ui/MetricRing";
import type { Phase } from "~/components/ui/PhaseBar";

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

export async function loader({ request }: { request: Request }, now: Date = new Date()) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const tenantId = user.tenantId!;
  const subjectId = subject.id;

  const [
    correlationsRows,
    supplementsRows,
    genotypeRows,
    cessationRows,
    protocolVersionsRows,
    metricsRows,
    geneticKnowledge,
  ] = await Promise.all([
    getCorrelations(tenantId, subjectId),
    getSupplements(tenantId, subjectId),
    getSubjectGenotypes(tenantId, subjectId),
    getCessationLog(tenantId, subjectId),
    getProtocolVersions(tenantId, subjectId),
    getMetrics(tenantId, subjectId),
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
  const cessationDay = cessation
    ? getCessationDay(
        cessation.startDate instanceof Date
          ? cessation.startDate.toISOString()
          : (cessation.startDate as unknown as string),
        now
      )
    : 0;
  const cessationPhase = getCurrentCessationPhase(cessationDay);
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
    cessationDay,
    cessationPhase,
    targetDay,
    byCategory,
    statusCounts,
    totalMetrics: latestMetrics.length,
    currentVersion: currentVersionObj?.version || "—",
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
    <Link to={to}>
      <Card padding="md" interactive style={{ minHeight: 104, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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
  const col = neg ? "var(--danger)" : "var(--vital-500, var(--vital))";
  const sign = c.correlation >= 0 ? "+" : "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 0",
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
        padding: "14px 0",
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

function CategoryCardItem({
  category,
  metrics,
}: {
  category: MetricCategory;
  metrics: Metric[];
}) {
  const info = CATEGORY_INFO[category];
  const icon = LUCIDE_MAP[info.icon];

  const statusCounts = metrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  const statuses: MetricStatus[] = ["optimal", "borderline", "deficient", "excess"];

  return (
    <Link to={`/metrics/${category}`} style={{ height: "100%", display: "block" }}>
      <Card interactive padding="lg" style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
          {icon && <CatChip icon={icon} family={info.family} size={42} />}
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "var(--text-lg)", letterSpacing: "-0.01em" }}>
            {info.label}
          </div>
        </div>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-sm)", minHeight: 40 }}>
          {info.description}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {metrics.length} tracked
          </span>
          {/* CountDots: inline status dot row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {statuses.map((s) =>
              (statusCounts[s] || 0) > 0 ? (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <StatusDot status={s} size={7} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>
                    {statusCounts[s]}
                  </span>
                </span>
              ) : null
            )}
          </div>
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
    cessationDay,
    cessationPhase,
    targetDay,
    byCategory,
    statusCounts,
    totalMetrics,
    currentVersion,
    activeSupplements,
  } = loaderData;

  const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];
  const needLook = (statusCounts.deficient || 0) + (statusCounts.excess || 0);
  const cessationComplete = cessationDay >= targetDay;
  const phaseBarPhases = buildPhaseBarPhases(cessationDay, targetDay);

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

      {/* Stat tiles — zt-grid-4 */}
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
        <StatTile label="Protocol version" value={currentVersion} unit="7 versions" to="/protocol/versions" />
      </div>

      {/* Cessation + correlations — zt-grid-2 */}
      <div className="zt-grid-2" style={{ alignItems: "start" }}>
        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-md)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)" }}>
              Cessation protocol
            </div>
            <Link
              to="/protocol/cessation"
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}
            >
              View details →
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="zt-readout" style={{ fontSize: "var(--text-3xl)" }}>Day {cessationDay}</span>
            {cessationComplete ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--vital-500, var(--vital))" }}>· complete</span>
            ) : (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>of {targetDay}</span>
            )}
          </div>
          <p style={{ margin: "8px 0 22px", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
            {cessationComplete
              ? `${targetDay}-day protocol complete — all phases finished.`
              : `${cessationPhase.label} phase — ${cessationPhase.focus}.`}
          </p>
          <PhaseBar phases={phaseBarPhases} compact />
        </Card>

        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-md)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)" }}>
              Top correlations
            </div>
            <Link
              to="/insights/correlations"
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}
            >
              View all · {stats.totalCorrelations} →
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
      </div>

      {/* Genetic insights + metric status — zt-grid-2 */}
      <div className="zt-grid-2">
        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-md)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)" }}>
              Genetic insights
            </div>
            <Link
              to="/insights/genetics"
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}
            >
              View all · {stats.totalVariants} →
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

        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-md)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "var(--text-base)" }}>
              Metric status
            </div>
            <Link
              to="/metrics"
              style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}
            >
              View all →
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <MetricRing
              value={statusCounts.optimal || 0}
              max={totalMetrics}
              tone="vital"
              size={132}
              thickness={13}
              label={statusCounts.optimal || 0}
              sublabel="optimal"
            />
            <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 2 }}>
              {(["optimal", "borderline", "deficient", "excess"] as MetricStatus[]).map((k) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <StatusDot status={k} />
                  <span style={{ fontSize: "var(--text-sm)", textTransform: "capitalize", color: "var(--text-secondary)" }}>
                    {k}
                  </span>
                  <span className="zt-tnum" style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-md)" }}>
                    {statusCounts[k] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Category grid — zt-grid-3 */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--gap-lg)" }}>
          <div className="zt-eyebrow">Metric categories</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
            {categories.length}
          </span>
        </div>
        <div className="zt-grid-3">
          {categories.map((category) => (
            <CategoryCardItem
              key={category}
              category={category}
              metrics={byCategory[category] || []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
