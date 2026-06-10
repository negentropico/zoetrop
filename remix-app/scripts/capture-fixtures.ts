/**
 * Fixture capture script: one-shot static-module → gitignored JSON fixture writer.
 *
 * Reproduces the CURRENT static loader return values (BEFORE loaders are rewired
 * to read from DB in Plan 04). These fixtures freeze the pre-migration baseline so
 * Plan 04's parity test can assert that the DB-backed loaders produce the same shape.
 *
 * Run from remix-app/:
 *   npm run capture-fixtures
 *
 * Output: tests/fixtures/<route-key>.json (gitignored — PHI, never commit)
 *
 * FIXED_NOW is pinned to 2026-06-10T00:00:00.000Z — matches FIXED_NOW in
 * tests/parity/loader-parity.test.ts for deterministic assertions.
 *
 * SECURITY: These fixtures contain PHI (health metrics, genetic data).
 * They MUST NOT be committed. tests/fixtures/ is gitignored (Plan 01 guard).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { differenceInDays, parseISO, addDays } from "date-fns";

// Static source modules
import {
  getRealMetrics,
  getLatestRealMetrics,
  getMetricTargets,
  getProjections,
} from "../app/lib/real-data";
import {
  realProtocolVersions,
  realProtocolChanges,
  realSupplements,
  realMilestones,
  realCessationLog,
  getCessationDay,
  getCurrentCessationPhase,
  CESSATION_START_DATE,
} from "../app/lib/protocol-data";
import {
  seedCorrelations,
  seedGeneticVariants,
  seedSupplements,
} from "../app/lib/seed-data";
import { CATEGORY_INFO } from "../app/types/metrics";
import { getMetricStatus } from "../app/lib/metrics";
import { CESSATION_PHASES } from "../app/types/protocol";
import type { MetricCategory, MetricStatus, Metric } from "../app/types/metrics";
import type { SupplementTier, Supplement } from "../app/types/protocol";
import type { GeneticVariant } from "../app/types/genetics";
import type { SupplementCorrelation } from "../app/lib/seed-data";

// ── PINNED NOW ────────────────────────────────────────────────────────────────
// MUST match FIXED_NOW in tests/parity/loader-parity.test.ts
const FIXED_NOW = new Date("2026-06-10T00:00:00.000Z");

// Representative params for param loaders (recorded in SUMMARY for Plan 04 parity test)
const FIXTURE_PARAMS = {
  category: "metabolic" as MetricCategory,
  metricId: "metabolic-glucose-m2",
  version: "P6",
};

// ── Output directory ──────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, "..", "tests", "fixtures");

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  console.log(`[capture-fixtures] Created ${FIXTURES_DIR}`);
}

function writeFixture(name: string, data: unknown): void {
  const filePath = path.join(FIXTURES_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`[capture-fixtures] Wrote ${name}.json`);
}

// ── Loader reproductions ──────────────────────────────────────────────────────

// 1. dashboard
function captureDashboard() {
  const topCorrelations = [...seedCorrelations]
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 3);

  const highImpactVariants = seedGeneticVariants
    .filter((v) => v.impact === "high")
    .slice(0, 3);

  const k3Variants = seedGeneticVariants.filter((v) => v.confidence === "K3");

  const cessation = realCessationLog[0];
  const cessationDay = cessation ? getCessationDay(FIXED_NOW) : 0;
  const cessationPhase = getCurrentCessationPhase(cessationDay);
  const targetDay = 150;

  const latestMetrics = getLatestRealMetrics();
  const byCategory = (Object.keys(CATEGORY_INFO) as MetricCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = latestMetrics.filter((m) => m.category === cat);
      return acc;
    },
    {} as Record<MetricCategory, Metric[]>
  );

  const statusCounts = latestMetrics.reduce(
    (acc, m) => {
      const status = getMetricStatus(m);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<MetricStatus, number>
  );

  const currentVersion = realProtocolVersions[realProtocolVersions.length - 1];
  const activeSupplements = realSupplements.filter((s) => s.isActive).length;

  return {
    topCorrelations,
    highImpactVariants,
    k3Variants,
    stats: {
      totalCorrelations: seedCorrelations.length,
      strongCorrelations: seedCorrelations.filter((c) => c.significance === "strong").length,
      totalVariants: seedGeneticVariants.length,
      confirmedVariants: seedGeneticVariants.filter((v) => v.confidence === "K1").length,
    },
    cessationDay,
    cessationPhase,
    targetDay,
    byCategory,
    statusCounts,
    totalMetrics: latestMetrics.length,
    currentVersion: currentVersion?.version || "—",
    activeSupplements,
  };
}

// 2. metrics/index
function captureMetricsIndex() {
  const allMetrics = getRealMetrics();
  const latestMetrics = getLatestRealMetrics();

  const countByName = new Map<string, number>();
  allMetrics.forEach((m) => {
    countByName.set(m.name, (countByName.get(m.name) || 0) + 1);
  });

  type MetricWithChartInfo = Metric & { historyCount: number; hasProjections: boolean };
  const metrics: MetricWithChartInfo[] = latestMetrics.map((m) => ({
    ...m,
    historyCount: countByName.get(m.name) || 1,
    hasProjections: !!getMetricTargets(m.name),
  }));

  const byCategory = (Object.keys(CATEGORY_INFO) as MetricCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = metrics
        .filter((m) => m.category === cat)
        .sort((a, b) => a.name.localeCompare(b.name));
      return acc;
    },
    {} as Record<MetricCategory, MetricWithChartInfo[]>
  );

  return { metrics, byCategory };
}

// 3. metrics/category (representative: metabolic)
function captureMetricsCategory() {
  const category = FIXTURE_PARAMS.category;
  const categoryInfo = CATEGORY_INFO[category];

  const allMetrics = getRealMetrics();
  const categoryMetrics = allMetrics.filter((m) => m.category === category);

  const latestByName = new Map<string, Metric>();
  categoryMetrics.forEach((m) => {
    const existing = latestByName.get(m.name);
    if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
      latestByName.set(m.name, m);
    }
  });
  const latestMetrics = Array.from(latestByName.values());

  const historyByName = new Map<string, Array<{ timestamp: string; value: number }>>();
  categoryMetrics.forEach((m) => {
    const history = historyByName.get(m.name) || [];
    history.push({ timestamp: m.timestamp, value: m.value });
    historyByName.set(m.name, history);
  });

  const metricsWithHistory = latestMetrics.map((m) => ({
    ...m,
    history: historyByName.get(m.name) || [],
    hasProjections: !!getMetricTargets(m.name),
  }));

  return {
    category,
    categoryInfo,
    metrics: metricsWithHistory,
    totalCount: metricsWithHistory.length,
  };
}

// 4. metrics/detail (representative: metabolic-glucose-m2)
function captureMetricsDetail() {
  const { category, metricId } = FIXTURE_PARAMS;
  const categoryInfo = CATEGORY_INFO[category];

  const allMetrics = getRealMetrics();
  const metric = allMetrics.find((m) => m.id === metricId);

  if (!metric) {
    throw new Error(`Metric not found: ${metricId}`);
  }

  const history = allMetrics
    .filter((m) => m.name === metric.name)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((m) => ({ timestamp: m.timestamp, value: m.value }));

  const projections = getProjections(metric.name);
  const targets = getMetricTargets(metric.name);

  return {
    category,
    categoryInfo,
    metric,
    history,
    projections,
    targets,
  };
}

// 5. protocol/index
function captureProtocolIndex() {
  const currentVersion = realProtocolVersions[realProtocolVersions.length - 1];
  const activeSupplements = realSupplements.filter((s) => s.isActive);
  const cessation = realCessationLog[0];
  const latestMilestone = realMilestones[realMilestones.length - 1];

  let cessationDay = 0;
  let cessationPhase = CESSATION_PHASES[0];
  if (cessation) {
    cessationDay = differenceInDays(FIXED_NOW, parseISO(cessation.startDate));
    cessationPhase =
      CESSATION_PHASES.find(
        (p) => cessationDay >= p.dayRange.start && cessationDay <= p.dayRange.end
      ) || CESSATION_PHASES[CESSATION_PHASES.length - 1];
  }

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
    totalVersions: realProtocolVersions.length,
    protocolVersions: realProtocolVersions,
  };
}

// 6. protocol/versions
function captureProtocolVersions() {
  const versions = realProtocolVersions.map((version) => {
    const changes = realProtocolChanges.filter((c) => c.versionId === version.id);
    const milestones = realMilestones.filter((m) => m.protocolVersion === version.version);

    return {
      ...version,
      changeCount: changes.length,
      milestones,
      changes: changes.slice(0, 3),
    };
  });

  return { versions: versions.reverse() };
}

// 7. protocol/version-detail (representative: P6)
function captureProtocolVersionDetail() {
  const versionParam = FIXTURE_PARAMS.version;

  const version = realProtocolVersions.find((v) => v.version === versionParam);
  if (!version) {
    throw new Error(`Version not found: ${versionParam}`);
  }

  const changes = realProtocolChanges.filter((c) => c.versionId === version.id);
  const milestones = realMilestones.filter((m) => m.protocolVersion === version.version);

  const supplements = version.version === "P6" ? realSupplements : [];

  const versionIndex = realProtocolVersions.findIndex((v) => v.id === version.id);
  const previousVersion = versionIndex > 0 ? realProtocolVersions[versionIndex - 1] : null;
  const nextVersion =
    versionIndex < realProtocolVersions.length - 1
      ? realProtocolVersions[versionIndex + 1]
      : null;

  return {
    version,
    changes,
    milestones,
    supplements,
    previousVersion,
    nextVersion,
    isLatest:
      version.version === realProtocolVersions[realProtocolVersions.length - 1].version,
  };
}

// 8. protocol/supplements
function captureProtocolSupplements() {
  const supplements = realSupplements;

  const byTier = supplements.reduce((acc, supp) => {
    if (!acc[supp.tier]) acc[supp.tier] = [];
    acc[supp.tier].push(supp);
    return acc;
  }, {} as Record<SupplementTier, Supplement[]>);

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

// 9. protocol/cessation
function captureProtocolCessation() {
  const cessation = realCessationLog[0];

  if (!cessation) {
    return {
      active: false,
      cessation: null,
      currentDay: 0,
      currentPhase: CESSATION_PHASES[0],
      daysInPhase: 0,
      daysUntilNextPhase: 0,
      projectedCompletion: null as string | null,
      phaseProgress: [] as Array<{
        phase: string;
        label: string;
        status: "completed" | "current" | "upcoming";
        startDay: number;
        endDay: number;
        progress: number;
      }>,
      phaseDuration: 0,
      targetDay: 150,
      startDate: null as string | null,
    };
  }

  const startDate = parseISO(cessation.startDate);
  const currentDay = differenceInDays(FIXED_NOW, startDate);
  const targetDay = 150;

  const currentPhase =
    CESSATION_PHASES.find(
      (p) => currentDay >= p.dayRange.start && currentDay <= p.dayRange.end
    ) || CESSATION_PHASES[CESSATION_PHASES.length - 1];

  const daysInPhase = currentDay - currentPhase.dayRange.start + 1;
  const phaseDuration = currentPhase.dayRange.end - currentPhase.dayRange.start + 1;

  const currentPhaseIndex = CESSATION_PHASES.findIndex(
    (p) => p.phase === currentPhase.phase
  );
  const nextPhase = CESSATION_PHASES[currentPhaseIndex + 1];
  const daysUntilNextPhase = nextPhase ? nextPhase.dayRange.start - currentDay : 0;

  const projectedCompletion = addDays(startDate, targetDay);

  const phaseProgress = CESSATION_PHASES.map((phase) => {
    let status: "completed" | "current" | "upcoming";
    let progress = 0;

    if (currentDay > phase.dayRange.end) {
      status = "completed";
      progress = 100;
    } else if (currentDay >= phase.dayRange.start) {
      status = "current";
      const elapsed = currentDay - phase.dayRange.start + 1;
      const total = phase.dayRange.end - phase.dayRange.start + 1;
      progress = Math.round((elapsed / total) * 100);
    } else {
      status = "upcoming";
      progress = 0;
    }

    return {
      phase: phase.phase,
      label: phase.label,
      status,
      startDay: phase.dayRange.start,
      endDay: phase.dayRange.end,
      progress,
    };
  });

  return {
    active: true,
    cessation,
    currentDay,
    currentPhase,
    daysInPhase,
    daysUntilNextPhase,
    projectedCompletion: projectedCompletion.toISOString(),
    phaseProgress,
    phaseDuration,
    targetDay,
    startDate: cessation.startDate,
  };
}

// 10. protocol/compare (default: P5→P6)
function captureProtocolCompare() {
  const versions = realProtocolVersions;

  const fromVersion = versions[versions.length - 2]; // P5
  const toVersion = versions[versions.length - 1];   // P6

  const changes = toVersion
    ? realProtocolChanges.filter((c) => c.versionId === toVersion.id)
    : [];

  const added = changes.filter((c) => c.changeType === "added");
  const removed = changes.filter((c) => c.changeType === "removed");
  const modified = changes.filter(
    (c) =>
      c.changeType === "dosage_changed" ||
      c.changeType === "timing_changed" ||
      c.changeType === "frequency_changed"
  );

  return {
    versions,
    fromVersion,
    toVersion,
    changes,
    added,
    removed,
    modified,
  };
}

// 11. insights/index
function captureInsightsIndex() {
  const topCorrelations = [...seedCorrelations]
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 5);

  const highImpactVariants = seedGeneticVariants.filter((v) => v.impact === "high");

  const variantsByCategory = seedGeneticVariants.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const strongCorrelations = seedCorrelations.filter((c) => c.significance === "strong");
  const significantCorrelations = seedCorrelations.filter((c) => c.pValue < 0.05);

  return {
    topCorrelations,
    highImpactVariants,
    variantsByCategory,
    stats: {
      totalCorrelations: seedCorrelations.length,
      strongCorrelations: strongCorrelations.length,
      significantCorrelations: significantCorrelations.length,
      totalVariants: seedGeneticVariants.length,
      confirmedVariants: seedGeneticVariants.filter((v) => v.confidence === "K1").length,
    },
  };
}

// 12. insights/correlations
function captureInsightsCorrelations() {
  const correlations = seedCorrelations;
  const supplements = seedSupplements;

  const bySuplement = correlations.reduce((acc, corr) => {
    if (!acc[corr.supplementName]) {
      acc[corr.supplementName] = [];
    }
    acc[corr.supplementName].push(corr);
    return acc;
  }, {} as Record<string, SupplementCorrelation[]>);

  const avgCorrelation =
    correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) /
    correlations.length;

  return {
    correlations,
    supplements,
    bySuplement,
    stats: {
      total: correlations.length,
      strong: correlations.filter((c) => c.significance === "strong").length,
      moderate: correlations.filter((c) => c.significance === "moderate").length,
      weak: correlations.filter((c) => c.significance === "weak").length,
      avgCorrelation: avgCorrelation.toFixed(2),
      significant: correlations.filter((c) => c.pValue < 0.05).length,
    },
  };
}

// 13. insights/genetics
function captureInsightsGenetics() {
  const variants = seedGeneticVariants;

  const byCategory = variants.reduce((acc, v) => {
    if (!acc[v.category]) {
      acc[v.category] = [];
    }
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, GeneticVariant[]>);

  const byConfidence = variants.reduce((acc, v) => {
    acc[v.confidence] = (acc[v.confidence] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byImpact = variants.reduce((acc, v) => {
    acc[v.impact] = (acc[v.impact] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    variants,
    byCategory,
    stats: {
      total: variants.length,
      byConfidence,
      byImpact,
      highImpact: variants.filter((v) => v.impact === "high").length,
      k1Confirmed: byConfidence["K1"] || 0,
    },
  };
}

// ── Run all captures ──────────────────────────────────────────────────────────

console.log(`[capture-fixtures] FIXED_NOW = ${FIXED_NOW.toISOString()}`);
console.log(`[capture-fixtures] Fixture params: category=${FIXTURE_PARAMS.category}, metricId=${FIXTURE_PARAMS.metricId}, version=${FIXTURE_PARAMS.version}`);
console.log(`[capture-fixtures] Writing to ${FIXTURES_DIR}`);

writeFixture("dashboard", captureDashboard());
writeFixture("metrics-index", captureMetricsIndex());
writeFixture("metrics-category", captureMetricsCategory());
writeFixture("metrics-detail", captureMetricsDetail());
writeFixture("protocol-index", captureProtocolIndex());
writeFixture("protocol-versions", captureProtocolVersions());
writeFixture("protocol-version-detail", captureProtocolVersionDetail());
writeFixture("protocol-supplements", captureProtocolSupplements());
writeFixture("protocol-cessation", captureProtocolCessation());
writeFixture("protocol-compare", captureProtocolCompare());
writeFixture("insights-index", captureInsightsIndex());
writeFixture("insights-correlations", captureInsightsCorrelations());
writeFixture("insights-genetics", captureInsightsGenetics());

console.log("");
console.log("[capture-fixtures] Done. 13 fixtures written to tests/fixtures/");
console.log("[capture-fixtures] REMINDER: These files are gitignored (PHI). Do NOT git-add them.");
