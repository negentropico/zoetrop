/**
 * data.server.ts — Centralized tenant-scoped read module (DATA-01)
 *
 * The single enforcement point for `WHERE tenant_id = ? AND subject_id = ?`.
 *
 * Phase 7 withTenantDb retrofit boundary:
 *   Phase 7 COMPLETE: reads run inside withTenantDb(ctx). getOwnerSubject is the
 *   only exception — it bootstraps subjectId from tenantId alone and must run before
 *   TenantCtx can be constructed. All other entity reads are RLS-governed via
 *   withTenantDb (app_user role, SET LOCAL GUCs). Defense-in-depth WHERE clauses
 *   are preserved (D-11) — RLS is the DB backstop; app-layer WHERE is explicit.
 *
 * getOwnerSubject stays on the admin path because:
 *   1. It runs before subjectId is known (bootstraps the subjectId for ctx construction).
 *   2. subjects has a tenant-only RLS policy — the lookup is tenant-scoped by WHERE.
 *   3. Without subjectId we cannot construct a valid TenantCtx for withTenantDb.
 */

import { withTenantDb, getDb } from "./db.server";
import type { TenantCtx } from "./db.server";
import { eq, and, desc } from "drizzle-orm";
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

// Re-export TenantCtx so call sites can import it from one place.
export type { TenantCtx };

// ── Subject lookup (admin path — bootstraps ctx) ──────────────────────────────
//
// getOwnerSubject intentionally uses the admin db path (neondb_owner):
// subjectId is unknown at call time — this function's return value is
// what populates ctx.subjectId. A valid TenantCtx cannot be constructed until
// after this call resolves. Keep on admin path; the WHERE clause is the guard.

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
 * RLS enforces tenant+subject isolation at DB layer; WHERE clauses are defense-in-depth (D-11).
 */
export async function getMetrics(
  ctx: TenantCtx,
  category?: MetricCategory
) {
  return withTenantDb(ctx, async (tx) => {
    const conditions = [
      eq(metrics.tenantId, ctx.tenantId),
      eq(metrics.subjectId, ctx.subjectId),
    ] as const;
    if (category !== undefined) {
      return tx
        .select()
        .from(metrics)
        .where(and(...conditions, eq(metrics.category, category)));
    }
    return tx.select().from(metrics).where(and(...conditions));
  });
}

// ── Protocol ───────────────────────────────────────────────────────────────────

/** Returns all protocol_versions rows scoped by tenant + subject. */
export async function getProtocolVersions(ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select()
      .from(protocolVersions)
      .where(
        and(
          eq(protocolVersions.tenantId, ctx.tenantId),
          eq(protocolVersions.subjectId, ctx.subjectId)
        )
      );
  });
}

/** Returns all protocol_changes rows scoped by tenant + subject. */
export async function getProtocolChanges(ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select()
      .from(protocolChanges)
      .where(
        and(
          eq(protocolChanges.tenantId, ctx.tenantId),
          eq(protocolChanges.subjectId, ctx.subjectId)
        )
      );
  });
}

/** Returns all milestones rows scoped by tenant + subject. */
export async function getMilestones(ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.tenantId, ctx.tenantId),
          eq(milestones.subjectId, ctx.subjectId)
        )
      );
  });
}

// ── Supplements ────────────────────────────────────────────────────────────────

/** Returns all supplements rows scoped by tenant + subject. */
export async function getSupplements(ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select()
      .from(supplements)
      .where(
        and(
          eq(supplements.tenantId, ctx.tenantId),
          eq(supplements.subjectId, ctx.subjectId)
        )
      );
  });
}

// ── Correlations ───────────────────────────────────────────────────────────────

/** Returns all correlations rows scoped by tenant + subject. */
export async function getCorrelations(ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select()
      .from(correlations)
      .where(
        and(
          eq(correlations.tenantId, ctx.tenantId),
          eq(correlations.subjectId, ctx.subjectId)
        )
      );
  });
}

// ── Cessation ─────────────────────────────────────────────────────────────────

/** Returns all cessation_log rows scoped by tenant + subject. */
export async function getCessationLog(ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select()
      .from(cessationLog)
      .where(
        and(
          eq(cessationLog.tenantId, ctx.tenantId),
          eq(cessationLog.subjectId, ctx.subjectId)
        )
      );
  });
}

// ── Genetics ──────────────────────────────────────────────────────────────────

/** Returns all subject_genotypes rows scoped by tenant + subject. */
export async function getSubjectGenotypes(ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select()
      .from(subjectGenotypes)
      .where(
        and(
          eq(subjectGenotypes.tenantId, ctx.tenantId),
          eq(subjectGenotypes.subjectId, ctx.subjectId)
        )
      );
  });
}

// ── Reports ───────────────────────────────────────────────────────────────────

/** Returns all reports rows scoped by tenant + subject, ordered by createdAt desc. */
export async function getReports(ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select()
      .from(reports)
      .where(and(eq(reports.tenantId, ctx.tenantId), eq(reports.subjectId, ctx.subjectId)))
      .orderBy(desc(reports.createdAt));
  });
}

/** Returns a single report row by id, scoped to tenant (defense-in-depth — CR-01), or null if not found. */
export async function getReport(id: string, ctx: TenantCtx) {
  return withTenantDb(ctx, async (tx) => {
    const [row] = await tx
      .select()
      .from(reports)
      .where(and(eq(reports.id, id), eq(reports.tenantId, ctx.tenantId)));
    return row ?? null;
  });
}
