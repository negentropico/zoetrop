/**
 * checklist.server.ts — Onboarding 3-state checklist status (server-only, ONB-04)
 *
 * Returns an honest per-dimension status for the onboarding checklist.
 * "Honest" means labs/genetics are only 'done' when a review-approved record
 * exists — no false 'done' while extractions sit unreviewed (D-10).
 *
 * 3-state: "missing" | "in_progress" | "done"
 * Invite state: "not_sent" | "pending" | "redeemed" (informational)
 *
 * PHI reads run inside withTenantDb (RLS-governed via app_user role).
 * Invite lookup uses admin path (getDb()) — invites table is tenant-scoped
 * and subject-scoped by explicit WHERE; no RLS on invites for this access pattern.
 * Both are server-only; the .server.ts suffix is the build-gate guard (T-01-server-leak).
 *
 * Defense-in-depth (D-11): every query is scoped by BOTH tenantId AND targetSubjectId.
 * consentLog is the exception — it has no tenantId column; subjectId-only scope is correct.
 *
 * Threat model (01-03-PLAN.md T-01-checklist-bleed / T-01-false-done):
 *   - Every query filters BOTH tenantId AND targetSubjectId where available.
 *   - PHI reads additionally RLS-governed via withTenantDb.
 *   - Labs require status='approved' (not mere presence) to reach 'done'.
 */

import { withTenantDb, getDb } from "./db.server";
import type { TenantCtx } from "./db.server";
import {
  labDocuments,
  labExtractions,
  subjectGenotypes,
  metrics,
  reports,
  protocolVersions,
  consentLog,
  invites,
  subjects,
} from "../../db/schema";
import { eq, and, count } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChecklistState = "missing" | "in_progress" | "done";

export interface ChecklistStatus {
  intake: ChecklistState;
  consent: ChecklistState;
  genetics: ChecklistState;
  labs: ChecklistState;
  whoop: ChecklistState;
  report: ChecklistState;
  protocol: ChecklistState;
  invite: "not_sent" | "pending" | "redeemed";
}

// ── getChecklistStatus ────────────────────────────────────────────────────────

/**
 * Returns the onboarding checklist status for `targetSubjectId`.
 *
 * All PHI reads run inside a single withTenantDb transaction (RLS-governed).
 * The invites read uses the admin path (getDb()) because the invites table
 * is NOT subject-scoped under RLS — we filter explicitly by tenantId + subjectId.
 *
 * Per-dimension derivation (D-10):
 *   - intake: done when dob + biologicalSex present AND consent exists;
 *             in_progress when some but not all; missing otherwise
 *   - consent: done when consentLog row exists; missing otherwise
 *   - genetics: done when subjectGenotypes count > 0; missing otherwise
 *               (Phase-2 review-gate refinement noted: currently presence-based)
 *   - labs: done when ≥1 approved labExtractions row exists;
 *           in_progress when labDocuments exist but none approved;
 *           missing when no labDocuments at all
 *   - whoop: done when metrics row with source='whoop' exists; missing otherwise
 *   - report: done when reports row exists; missing otherwise
 *   - protocol: done when protocolVersions row exists; missing otherwise
 *   - invite: redeemed when consumedAt set; pending when invite row exists unconsumed;
 *             not_sent when no invite row carries this subjectId
 */
export async function getChecklistStatus(
  ctx: TenantCtx,
  targetSubjectId: string
): Promise<ChecklistStatus> {
  return withTenantDb(ctx, async (tx) => {
    // Run all PHI reads + the admin-path invite read in parallel.
    // consentLog has no tenantId column — scope by subjectId only.
    const [
      consentRows,
      genotypeCount,
      labDocRows,
      approvedLabRows,
      whoopRows,
      reportRows,
      protocolRows,
      subjectRow,
      inviteRows,
    ] = await Promise.all([
      // Consent (no tenantId column on consent_log — subjectId scope is sufficient)
      tx
        .select()
        .from(consentLog)
        .where(eq(consentLog.subjectId, targetSubjectId))
        .limit(1),

      // Genetics — count rows (presence-based; Phase-2 will add review-gate)
      tx
        .select({ count: count() })
        .from(subjectGenotypes)
        .where(
          and(
            eq(subjectGenotypes.subjectId, targetSubjectId),
            eq(subjectGenotypes.tenantId, ctx.tenantId)
          )
        ),

      // Lab documents — presence determines in_progress baseline
      tx
        .select()
        .from(labDocuments)
        .where(
          and(
            eq(labDocuments.subjectId, targetSubjectId),
            eq(labDocuments.tenantId, ctx.tenantId)
          )
        )
        .limit(1),

      // Approved extractions — determines labs 'done' (D-10: approval-gated)
      tx
        .select()
        .from(labExtractions)
        .where(
          and(
            eq(labExtractions.subjectId, targetSubjectId),
            eq(labExtractions.tenantId, ctx.tenantId),
            eq(labExtractions.status, "approved") // D-10: approved only, not mere presence
          )
        )
        .limit(1),

      // WHOOP metrics
      tx
        .select()
        .from(metrics)
        .where(
          and(
            eq(metrics.subjectId, targetSubjectId),
            eq(metrics.tenantId, ctx.tenantId),
            eq(metrics.source, "whoop")
          )
        )
        .limit(1),

      // Reports
      tx
        .select()
        .from(reports)
        .where(
          and(
            eq(reports.subjectId, targetSubjectId),
            eq(reports.tenantId, ctx.tenantId)
          )
        )
        .limit(1),

      // Protocol versions
      tx
        .select()
        .from(protocolVersions)
        .where(
          and(
            eq(protocolVersions.subjectId, targetSubjectId),
            eq(protocolVersions.tenantId, ctx.tenantId)
          )
        )
        .limit(1),

      // Subject row (for dob + biologicalSex intake check)
      tx
        .select()
        .from(subjects)
        .where(
          and(
            eq(subjects.id, targetSubjectId),
            eq(subjects.tenantId, ctx.tenantId)
          )
        )
        .limit(1),

      // Invite lookup — admin path (no RLS on invites for this access pattern;
      // filter explicitly by tenantId + subjectId as defense-in-depth, D-11).
      // PATTERNS Build-Gate note 2: mixing withTenantDb tx with getDb() is intentional;
      // both are server-only.
      getDb()
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.tenantId, ctx.tenantId),
            eq(invites.subjectId, targetSubjectId) // requires invites.subjectId (D-01, Plan 01-01)
          )
        )
        .limit(1),
    ]);

    // ── Derive per-dimension states ──────────────────────────────────────────

    // intake: done when dob + biologicalSex present AND consent exists
    const s = subjectRow[0];
    const intakeDemographicDone = !!(s?.dob && s?.biologicalSex);
    const consentDone = consentRows.length > 0;
    const intake: ChecklistState =
      intakeDemographicDone && consentDone
        ? "done"
        : intakeDemographicDone || consentDone
        ? "in_progress"
        : "missing";

    const consent: ChecklistState = consentDone ? "done" : "missing";

    // genetics: presence-based in Phase 1; Phase-2 may add review-gate refinement
    const genCount = genotypeCount[0]?.count ?? 0;
    const genetics: ChecklistState = genCount > 0 ? "done" : "missing";

    // labs: done only when approved extraction exists (D-10 honest 3-state)
    const hasLabDocs = labDocRows.length > 0;
    const hasApproved = approvedLabRows.length > 0;
    const labs: ChecklistState = hasApproved
      ? "done"
      : hasLabDocs
      ? "in_progress"
      : "missing";

    const whoop: ChecklistState = whoopRows.length > 0 ? "done" : "missing";
    const report: ChecklistState = reportRows.length > 0 ? "done" : "missing";
    const protocol: ChecklistState = protocolRows.length > 0 ? "done" : "missing";

    // invite: redeemed > pending > not_sent
    const inv = inviteRows[0];
    const invite: ChecklistStatus["invite"] = !inv
      ? "not_sent"
      : inv.consumedAt
      ? "redeemed"
      : "pending";

    return {
      intake,
      consent,
      genetics,
      labs,
      whoop,
      report,
      protocol,
      invite,
    };
  });
}
