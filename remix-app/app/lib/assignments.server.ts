/**
 * assignments.server.ts — Practitioner→subject assignment service (AUTH-03, D-07)
 *
 * Manages the practitioner_subject_assignments table: assign, unassign, list.
 * All queries run via withTenantDb (RLS-governed app_user path, tenant-scoped).
 *
 * SECURITY contracts:
 *   - All mutations/reads go through withTenantDb: the psa RLS policy (tenant-only
 *     isolation) is active. An app_user cannot read or write a row from another tenant.
 *   - unassignSubject is a soft delete (revokedAt = now()). Hard deletes are not used.
 *   - assignSubject is idempotent against the PARTIAL unique active index (unique on
 *     tenant_id + practitioner_id + subject_id WHERE revoked_at IS NULL). On
 *     23505 unique_violation (structured code check), returns
 *     { assigned: true, alreadyExists: true } — the caller treats this as success.
 *     With the partial index, revoke-then-reassign works: a revoked row no longer
 *     blocks a fresh active assignment (CR-02).
 *   - Fail-closed: a no-op UPDATE (0 rows changed) in unassignSubject is reported
 *     as { unassigned: false } — the caller can surface "not found" rather than
 *     treating silence as success (mirrors revokeInvite pattern, WR-02).
 *
 * Note: invites.server.ts uses getDb() (admin path) for all its queries. This
 * service intentionally uses withTenantDb for all its queries — assignments are
 * tenant-PHI-adjacent (they map practitioners to subjects) and must be
 * RLS-governed. The caller (owner action) provides a valid TenantCtx.
 */

import { withTenantDb } from "./db.server";
import type { TenantCtx } from "./db.server";
import { practitionerSubjectAssignments } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";

// ── assignSubject ──────────────────────────────────────────────────────────────
//
// Creates an active assignment between a practitioner and a subject in the tenant.
// Idempotent: if an active assignment already exists (23505 unique_violation), returns
// { assigned: true, alreadyExists: true } — not an error.
// With the PARTIAL index (WHERE revoked_at IS NULL), 23505 fires only for a genuinely
// active duplicate — a previously revoked row does NOT block re-assignment (CR-02).
// The id is a random UUID; revokedAt is null (active).

export interface AssignSubjectOpts {
  practitionerId: string;
  subjectId: string;
  assignedBy: string; // owner's user.id
}

export async function assignSubject(
  ctx: TenantCtx,
  opts: AssignSubjectOpts
): Promise<{ assigned: boolean; alreadyExists: boolean }> {
  if (!opts.practitionerId || !opts.subjectId || !opts.assignedBy) {
    throw new Response("Invalid assignment parameters.", { status: 400 });
  }
  try {
    await withTenantDb(ctx, async (tx) => {
      await tx.insert(practitionerSubjectAssignments).values({
        id: crypto.randomUUID(),
        tenantId: ctx.tenantId,
        practitionerId: opts.practitionerId,
        subjectId: opts.subjectId,
        assignedBy: opts.assignedBy,
        // assignedAt defaults to NOW(), revokedAt NULL = active
      });
    });
    return { assigned: true, alreadyExists: false };
  } catch (err) {
    // Structured Postgres error-code check: 23505 = unique_violation.
    // With the PARTIAL index (WHERE revoked_at IS NULL), this fires ONLY for a
    // genuinely active duplicate — a revoked row no longer occupies the unique key,
    // so a revoke-then-reassign cycle never triggers this path (CR-02).
    // All other errors are re-thrown (fail-closed).
    if ((err as { code?: string }).code === '23505') {
      return { assigned: true, alreadyExists: true };
    }
    throw err;
  }
}

// ── unassignSubject ────────────────────────────────────────────────────────────
//
// Soft-deletes an active assignment by setting revokedAt = now().
// Tenant-scoped via withTenantDb (RLS + explicit WHERE tenant_id).
// Returns { unassigned: boolean } — false = no active assignment found (WR-02).

export interface UnassignSubjectOpts {
  practitionerId: string;
  subjectId: string;
}

export async function unassignSubject(
  ctx: TenantCtx,
  opts: UnassignSubjectOpts
): Promise<{ unassigned: boolean }> {
  if (!opts.practitionerId || !opts.subjectId) {
    throw new Response("Invalid unassignment parameters.", { status: 400 });
  }
  const changed = await withTenantDb(ctx, async (tx) => {
    return tx
      .update(practitionerSubjectAssignments)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(practitionerSubjectAssignments.tenantId, ctx.tenantId),
          eq(practitionerSubjectAssignments.practitionerId, opts.practitionerId),
          eq(practitionerSubjectAssignments.subjectId, opts.subjectId),
          isNull(practitionerSubjectAssignments.revokedAt) // only revoke active assignments
        )
      )
      .returning({ id: practitionerSubjectAssignments.id });
  });
  // WR-02: 0 rows changed = assignment not found or already revoked
  return { unassigned: changed.length > 0 };
}

// ── listAssignments ────────────────────────────────────────────────────────────
//
// Returns all ACTIVE (revokedAt IS NULL) assignments for the tenant.
// Used by the /settings/assignments loader to build the management UI.

export interface AssignmentRow {
  id: string;
  practitionerId: string;
  subjectId: string;
  assignedBy: string;
  assignedAt: Date | null;
}

export async function listAssignments(ctx: TenantCtx): Promise<AssignmentRow[]> {
  return withTenantDb(ctx, async (tx) => {
    return tx
      .select({
        id: practitionerSubjectAssignments.id,
        practitionerId: practitionerSubjectAssignments.practitionerId,
        subjectId: practitionerSubjectAssignments.subjectId,
        assignedBy: practitionerSubjectAssignments.assignedBy,
        assignedAt: practitionerSubjectAssignments.assignedAt,
      })
      .from(practitionerSubjectAssignments)
      .where(
        and(
          eq(practitionerSubjectAssignments.tenantId, ctx.tenantId),
          isNull(practitionerSubjectAssignments.revokedAt) // active only
        )
      );
  });
}

// ── listAssignedSubjectIds ─────────────────────────────────────────────────────
//
// Returns the subjectIds a specific practitioner is actively assigned to within
// the tenant. Used by assertSubjectAccess callers to populate the per-assignment
// check (AUTH-03):
//
//   const assignedIds = await listAssignedSubjectIds(ctx, user.id);
//   assertSubjectAccess(user, subject, user.tenantId!, assignedIds);

export async function listAssignedSubjectIds(
  ctx: TenantCtx,
  practitionerId: string
): Promise<string[]> {
  const rows = await withTenantDb(ctx, async (tx) => {
    return tx
      .select({ subjectId: practitionerSubjectAssignments.subjectId })
      .from(practitionerSubjectAssignments)
      .where(
        and(
          eq(practitionerSubjectAssignments.tenantId, ctx.tenantId),
          eq(practitionerSubjectAssignments.practitionerId, practitionerId),
          isNull(practitionerSubjectAssignments.revokedAt) // active only
        )
      );
  });
  return rows.map((r) => r.subjectId);
}
