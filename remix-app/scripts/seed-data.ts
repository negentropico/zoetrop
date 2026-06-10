/**
 * Data seed script: inserts the owner's M0 health data into live Neon under
 * the owner's tenant/subject.
 *
 * Run from remix-app/:
 *   npm run db:seed-data
 *
 * Required env vars:
 *   DATABASE_URL  (pooled connection — same as dev/production)
 *   OWNER_EMAIL   (resolves tenant+subject; never hardcode IDs)
 *
 * Idempotent: if protocol_versions rows already exist for ownerTenantId,
 * exits early with "Already seeded. Nothing to do."
 *
 * FK dependency order:
 *   protocolVersions → supplements → protocolChanges → milestones
 *   → metrics → cessationLog → correlations → subjectGenotypes
 *
 * SECURITY (T-04-SEED-LOG): Logs only row COUNTS and tenant/subject IDs.
 * Never logs PHI field values (metric values, genetic data, etc.)
 */

import { getDb } from "../app/lib/db.server";
import { eq } from "drizzle-orm";
import {
  user,
  subjects,
  metrics,
  protocolVersions,
  protocolChanges,
  milestones,
  supplements,
  cessationLog,
  correlations,
  subjectGenotypes,
} from "../db/schema";

// Static source arrays (consumed here; deleted in Plan 05 after loaders are rewired)
import { getRealMetrics } from "../app/lib/real-data";
import {
  realProtocolVersions,
  realProtocolChanges,
  realSupplements,
  realMilestones,
  realCessationLog,
} from "../app/lib/protocol-data";
import {
  seedGeneticVariants,
  seedCorrelations as rawCorrelations,
} from "../app/lib/seed-data";

// ── 1. Validate required env vars ─────────────────────────────────────────────

const OWNER_EMAIL = process.env.OWNER_EMAIL;

if (!OWNER_EMAIL) {
  throw new Error(
    "OWNER_EMAIL env var is required — set it before running db:seed-data."
  );
}

// ── 2. Resolve owner IDs from DB (T-04-HARDID: never hardcode) ────────────────

const db = getDb();

const [ownerUser] = await db
  .select()
  .from(user)
  .where(eq(user.email, OWNER_EMAIL))
  .limit(1);

if (!ownerUser) {
  throw new Error(
    `Owner user not found for email=${OWNER_EMAIL}. Run db:seed-owner first.`
  );
}

const tenantId = ownerUser.tenantId!;
if (!tenantId) {
  throw new Error(
    `Owner user has no tenantId. Ensure db:seed-owner completed successfully.`
  );
}

const [subject] = await db
  .select()
  .from(subjects)
  .where(eq(subjects.tenantId, tenantId))
  .limit(1);

if (!subject) {
  throw new Error(
    `Owner subject not found for tenantId=${tenantId}. Run db:seed-owner first.`
  );
}

const subjectId = subject.id;

// ── 3. Idempotency check ──────────────────────────────────────────────────────

const existing = await db
  .select({ id: protocolVersions.id })
  .from(protocolVersions)
  .where(eq(protocolVersions.tenantId, tenantId))
  .limit(1);

if (existing.length > 0) {
  console.log("[seed-data] Already seeded. Nothing to do.");
  process.exit(0);
}

// ── 4. Per-table seed helpers ─────────────────────────────────────────────────

/**
 * Seed protocol versions (P0–P6).
 * Returns a map of static version string ("P0"..P6") → DB-assigned integer id
 * for use by seedProtocolChanges (Pitfall 4 analog).
 */
async function seedProtocolVersionsHelper(
  tenantId: string,
  subjectId: string
): Promise<Map<string, number>> {
  const rows = realProtocolVersions.map((v) => ({
    version: v.version,
    effectiveDate: new Date(v.effectiveDate),
    notes: v.notes,
    tenantId,
    subjectId,
    // id: omitted — generatedAlwaysAsIdentity; Postgres assigns
  }));

  const inserted = await db
    .insert(protocolVersions)
    .values(rows)
    .returning({ id: protocolVersions.id, version: protocolVersions.version });

  console.log(`[seed-data] protocol_versions seeded: ${inserted.length} rows`);

  // Build version-string → db id map for FK remapping
  const versionMap = new Map<string, number>();
  for (const row of inserted) {
    versionMap.set(row.version, row.id);
  }
  return versionMap;
}

/**
 * Seed supplements (P6 current protocol, 17 items).
 * Returns a name → DB id map for seedCorrelations (Pitfall 4).
 */
async function seedSupplementsHelper(
  tenantId: string,
  subjectId: string
): Promise<Map<string, number>> {
  const rows = realSupplements.map((s) => ({
    name: s.name,
    dosage: s.dosage,
    unit: s.unit,
    frequency: s.frequency,
    tier: s.tier as "tier1" | "tier2" | "tier3" | "as_needed",
    geneticBasis: s.geneticBasis ?? null,
    timing: s.timing ?? null,
    notes: s.notes ?? null,
    isActive: s.isActive,
    tenantId,
    subjectId,
    // id: omitted — generatedAlwaysAsIdentity
  }));

  const inserted = await db
    .insert(supplements)
    .values(rows)
    .returning({ id: supplements.id, name: supplements.name });

  console.log(`[seed-data] supplements seeded: ${inserted.length} rows`);

  // Build supplement name → db id map
  const nameMap = new Map<string, number>();
  for (const row of inserted) {
    nameMap.set(row.name, row.id);
  }
  return nameMap;
}

/**
 * Seed protocol changes.
 * Remaps static versionId (which is just the array index in realProtocolVersions)
 * to the DB-assigned id using the versionMap built from seedProtocolVersions.
 * (T-04-FKMAP: never trust static ids)
 */
async function seedProtocolChangesHelper(
  tenantId: string,
  subjectId: string,
  versionMap: Map<string, number>
): Promise<void> {
  // The static realProtocolChanges use versionId 2-7 which correspond to the
  // static realProtocolVersions[].id values (1-7, matching P0=1..P6=7).
  // We need to remap these to DB ids via the version string.
  // Build a static-id → version-string lookup from realProtocolVersions.
  const staticIdToVersion = new Map<number, string>();
  for (const v of realProtocolVersions) {
    staticIdToVersion.set(v.id, v.version);
  }

  const rows = realProtocolChanges.map((c) => {
    const versionString = staticIdToVersion.get(c.versionId);
    if (!versionString) {
      throw new Error(
        `No version string found for static versionId=${c.versionId}`
      );
    }
    const dbVersionId = versionMap.get(versionString);
    if (dbVersionId === undefined) {
      throw new Error(
        `No DB id found for version string "${versionString}" — versionMap miss`
      );
    }
    return {
      versionId: dbVersionId,
      supplementName: c.supplementName,
      changeType: c.changeType as
        | "added"
        | "removed"
        | "dosage_changed"
        | "timing_changed"
        | "frequency_changed",
      oldDosage: c.oldDosage ?? null,
      newDosage: c.newDosage ?? null,
      rationale: c.rationale ?? null,
      tenantId,
      subjectId,
      // id: omitted — generatedAlwaysAsIdentity
    };
  });

  await db.insert(protocolChanges).values(rows);
  console.log(`[seed-data] protocol_changes seeded: ${rows.length} rows`);
}

/**
 * Seed milestones (8 named events with optional biometricSnapshot).
 */
async function seedMilestonesHelper(
  tenantId: string,
  subjectId: string
): Promise<void> {
  const rows = realMilestones.map((m) => ({
    date: new Date(m.date),
    description: m.description,
    protocolVersion: m.protocolVersion ?? null,
    biometricSnapshot: m.biometricSnapshot ?? null,
    tenantId,
    subjectId,
    // id: omitted — generatedAlwaysAsIdentity
  }));

  await db.insert(milestones).values(rows);
  console.log(`[seed-data] milestones seeded: ${rows.length} rows`);
}

/**
 * Seed metrics — all 4 arrays from real-data.ts (M1 blood work, M2 blood work,
 * body composition, autonomic). Uses static Metric.id strings as the varchar PK.
 * Flattens referenceRange/optimalRange to referenceMin/Max + optimalMin/Max.
 */
async function seedMetricsHelper(
  tenantId: string,
  subjectId: string
): Promise<void> {
  const allMetrics = getRealMetrics();

  const rows = allMetrics.map((m) => ({
    id: m.id,
    name: m.name,
    value: m.value,
    unit: m.unit,
    category: m.category as
      | "vitamins"
      | "minerals"
      | "inflammatory"
      | "metabolic"
      | "hormones"
      | "autonomic"
      | "bodyComposition"
      | "lipids"
      | "hematology",
    subcategory: m.subcategory ?? null,
    timestamp: new Date(m.timestamp),
    description: m.description ?? null,
    improvement: m.improvement,
    referenceMin: m.referenceRange?.min ?? null,
    referenceMax: m.referenceRange?.max ?? null,
    optimalMin: m.optimalRange?.min ?? null,
    optimalMax: m.optimalRange?.max ?? null,
    source: m.source as
      | "manual"
      | "whoop"
      | "dexa"
      | "bloodwork"
      | "csv"
      | "vault",
    tenantId,
    subjectId,
  }));

  await db.insert(metrics).values(rows);
  console.log(`[seed-data] metrics seeded: ${rows.length} rows`);
}

/**
 * Seed cessation log (1 active entry).
 */
async function seedCessationLogHelper(
  tenantId: string,
  subjectId: string
): Promise<void> {
  const rows = realCessationLog.map((c) => ({
    startDate: new Date(c.startDate),
    currentPhase: c.currentPhase as
      | "acute"
      | "stabilization"
      | "clearing"
      | "optimization",
    endDate: null,
    notes: c.notes ?? null,
    tenantId,
    subjectId,
    // id: omitted — generatedAlwaysAsIdentity
  }));

  await db.insert(cessationLog).values(rows);
  console.log(`[seed-data] cessation_log seeded: ${rows.length} rows`);
}

/**
 * Seed correlations.
 * Resolves supplementName → DB supplement id via the nameMap built after
 * supplements are inserted (T-04-FKMAP: Pitfall 4 — never trust static ids).
 *
 * The static seedCorrelations use supplementName strings that map to
 * supplement names in realSupplements. Some names in seedCorrelations differ
 * slightly from realSupplements names — we use a best-effort lookup with
 * fallback to a partial-match to handle the naming differences.
 */
async function seedCorrelationsHelper(
  tenantId: string,
  subjectId: string,
  supplementNameMap: Map<string, number>
): Promise<void> {
  // Re-fetch inserted supplements from DB to build a fresh name→id map
  const seededSupplements = await db
    .select({ id: supplements.id, name: supplements.name })
    .from(supplements)
    .where(eq(supplements.tenantId, tenantId));

  const dbNameMap = new Map<string, number>();
  for (const s of seededSupplements) {
    dbNameMap.set(s.name.toLowerCase(), s.id);
  }

  // Mapping from seedCorrelations supplementName to realSupplements name
  // The seedCorrelations use slightly different names for some supplements.
  const SUPP_NAME_ALIAS: Record<string, string | null> = {
    "Vitamin D3": "Vitamin D3 + K2",
    "Omega-3 (EPA/DHA)": "Omega-3 EPA/DHA",
    "Magnesium Glycinate": "Magnesium Glycinate",
    "Vitamin E": "Vitamin E (mixed tocopherols)",
    Methylfolate: "Methylfolate",
    Creatine: "Creatine Monohydrate",
    Selenium: "Selenium",
    CoQ10: null, // Not in realSupplements — skip
  };

  const rows = rawCorrelations
    .map((c) => {
      // Try exact match first
      let suppId = dbNameMap.get(c.supplementName.toLowerCase());

      // Try alias lookup
      if (suppId === undefined) {
        const alias = SUPP_NAME_ALIAS[c.supplementName];
        if (alias === null) {
          // Explicitly skipped (e.g. CoQ10 not in realSupplements)
          return null;
        }
        if (alias) {
          suppId = dbNameMap.get(alias.toLowerCase());
        }
      }

      // Partial match fallback: check if any DB supplement name starts with
      // the first word of the correlation supplementName
      if (suppId === undefined) {
        const firstWord = c.supplementName.split(" ")[0].toLowerCase();
        for (const [dbName, dbId] of dbNameMap.entries()) {
          if (dbName.startsWith(firstWord)) {
            suppId = dbId;
            break;
          }
        }
      }

      if (suppId === undefined) {
        throw new Error(
          `[seed-data] No DB supplement id found for supplementName="${c.supplementName}" — update SUPP_NAME_ALIAS or add to realSupplements`
        );
      }

      return {
        supplementId: suppId,
        metricName: c.metricName,
        correlation: c.correlation,
        lagDays: c.lagDays,
        sampleSize: c.sampleSize,
        pValue: c.pValue,
        tenantId,
        subjectId,
        // id: omitted — generatedAlwaysAsIdentity
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await db.insert(correlations).values(rows);
  console.log(`[seed-data] correlations seeded: ${rows.length} rows`);
}

/**
 * Seed subject genotypes (16 genetic variants — PHI plane only).
 * gene/rsid/genotype from seedGeneticVariants; assaySource from notes field.
 */
async function seedSubjectGenotypesHelper(
  tenantId: string,
  subjectId: string
): Promise<void> {
  const rows = seedGeneticVariants.map((v) => ({
    gene: v.gene,
    rsid: v.rsid ?? null,
    genotype: v.genotype,
    assaySource: v.notes ? v.notes.slice(0, 100) : null,
    tenantId,
    subjectId,
    // id: omitted — generatedAlwaysAsIdentity
  }));

  await db.insert(subjectGenotypes).values(rows);
  console.log(`[seed-data] subject_genotypes seeded: ${rows.length} rows`);
}

// ── 5. Run seed in FK dependency order ────────────────────────────────────────

console.log("[seed-data] Starting M0 data seed...");
console.log(`[seed-data] tenantId: ${tenantId}`);
console.log(`[seed-data] subjectId: ${subjectId}`);

const versionMap = await seedProtocolVersionsHelper(tenantId, subjectId);
const supplementNameMap = await seedSupplementsHelper(tenantId, subjectId);
await seedProtocolChangesHelper(tenantId, subjectId, versionMap);
await seedMilestonesHelper(tenantId, subjectId);
await seedMetricsHelper(tenantId, subjectId);
await seedCessationLogHelper(tenantId, subjectId);
await seedCorrelationsHelper(tenantId, subjectId, supplementNameMap);
await seedSubjectGenotypesHelper(tenantId, subjectId);

// ── 6. Summary ────────────────────────────────────────────────────────────────

console.log("");
console.log("[seed-data] Seed complete.");
console.log(`  tenantId:  ${tenantId}`);
console.log(`  subjectId: ${subjectId}`);
