/**
 * data.server.ts — Centralized tenant-scoped read module (DATA-01)
 *
 * The single enforcement point for `WHERE tenant_id = ? AND subject_id = ?`.
 *
 * Phase 7 withTenantDb retrofit boundary:
 *   getDb() is called ONLY inside this file. To add RLS-based access control,
 *   Phase 7 replaces `getDb()` with `withTenantDb(tenantId, subjectId, fn)` here
 *   exclusively — route loaders (Plan 04 call sites) do NOT change. Keep getDb()
 *   isolated: do NOT call getDb() in loaders or other modules.
 */

import { getDb } from "./db.server";
import { eq, and } from "drizzle-orm";
import {
  metrics,
  protocolVersions,
  protocolChanges,
  milestones,
  supplements,
  correlations,
  cessationLog,
  subjectGenotypes,
  subjects,
  reports,
} from "../../db/schema";
import type { MetricCategory } from "../types/metrics";

// ── Subject lookup ─────────────────────────────────────────────────────────────

/**
 * Returns the owner subject row for the given tenant.
 * Throws a 404 Response if no subject is found (Pitfall 5 — fail-closed).
 *
 * Note: uses tenantId scope only (subject lookup by tenant, not yet knowing subjectId).
 * The returned subject.id becomes the subjectId for all subsequent entity reads.
 */
export async function getOwnerSubject(tenantId: string) {
  const db = getDb();
  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.tenantId, tenantId))
    .limit(1);
  if (!subject) {
    throw new Response("Subject not found", { status: 404 });
  }
  return subject;
}

// ── Metrics ────────────────────────────────────────────────────────────────────

/**
 * Returns metrics rows scoped by tenant + subject.
 * Optionally filters by category — typed MetricCategory, no cast needed.
 */
export async function getMetrics(
  tenantId: string,
  subjectId: string,
  category?: MetricCategory
) {
  const db = getDb();
  const conditions = [
    eq(metrics.tenantId, tenantId),
    eq(metrics.subjectId, subjectId),
  ] as const;
  if (category !== undefined) {
    return db
      .select()
      .from(metrics)
      .where(and(...conditions, eq(metrics.category, category)));
  }
  return db.select().from(metrics).where(and(...conditions));
}

// ── Protocol ───────────────────────────────────────────────────────────────────

/** Returns all protocol_versions rows scoped by tenant + subject. */
export async function getProtocolVersions(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(protocolVersions)
    .where(
      and(
        eq(protocolVersions.tenantId, tenantId),
        eq(protocolVersions.subjectId, subjectId)
      )
    );
}

/** Returns all protocol_changes rows scoped by tenant + subject. */
export async function getProtocolChanges(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(protocolChanges)
    .where(
      and(
        eq(protocolChanges.tenantId, tenantId),
        eq(protocolChanges.subjectId, subjectId)
      )
    );
}

/** Returns all milestones rows scoped by tenant + subject. */
export async function getMilestones(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.tenantId, tenantId),
        eq(milestones.subjectId, subjectId)
      )
    );
}

// ── Supplements ────────────────────────────────────────────────────────────────

/** Returns all supplements rows scoped by tenant + subject. */
export async function getSupplements(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(supplements)
    .where(
      and(
        eq(supplements.tenantId, tenantId),
        eq(supplements.subjectId, subjectId)
      )
    );
}

// ── Correlations ───────────────────────────────────────────────────────────────

/** Returns all correlations rows scoped by tenant + subject. */
export async function getCorrelations(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(correlations)
    .where(
      and(
        eq(correlations.tenantId, tenantId),
        eq(correlations.subjectId, subjectId)
      )
    );
}

// ── Cessation ─────────────────────────────────────────────────────────────────

/** Returns all cessation_log rows scoped by tenant + subject. */
export async function getCessationLog(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(cessationLog)
    .where(
      and(
        eq(cessationLog.tenantId, tenantId),
        eq(cessationLog.subjectId, subjectId)
      )
    );
}

// ── Genetics ──────────────────────────────────────────────────────────────────

/** Returns all subject_genotypes rows scoped by tenant + subject. */
export async function getSubjectGenotypes(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(subjectGenotypes)
    .where(
      and(
        eq(subjectGenotypes.tenantId, tenantId),
        eq(subjectGenotypes.subjectId, subjectId)
      )
    );
}

// ── Reports ───────────────────────────────────────────────────────────────────

/** Returns all reports rows scoped by tenant + subject, ordered by createdAt desc. */
export async function getReports(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(reports)
    .where(and(eq(reports.tenantId, tenantId), eq(reports.subjectId, subjectId)));
}

/** Returns a single report row by id, or null if not found. */
export async function getReport(id: string) {
  const db = getDb();
  const [row] = await db.select().from(reports).where(eq(reports.id, id));
  return row ?? null;
}
