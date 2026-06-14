/**
 * subjects.server.ts — Subject CRUD service (server-only, ONB-01)
 *
 * Admin path (`getDb()`, not `withTenantDb`) — subject rows are written before
 * TenantCtx can be constructed (same rationale as `getOwnerSubject` in data.server.ts).
 * Defense-in-depth: every query is scoped by tenantId even on the admin path.
 *
 * Threat model (01-03-PLAN.md T-01-subject-write-scope):
 *   - createSubject trusts its caller to have already passed requireRole gate.
 *   - All writes carry the caller-supplied tenantId; no cross-tenant write is possible
 *     through this service — the tenantId comes from the authenticated session.
 *
 * Security: keep the `.server.ts` suffix — uses getDb() and MUST NOT leak to the
 * client bundle (build-gate T-01-server-leak).
 */

import { getDb } from "./db.server";
import { subjects } from "../../db/schema";
import { eq, and, ne } from "drizzle-orm";

// ── createSubject ─────────────────────────────────────────────────────────────

export interface CreateSubjectData {
  id: string;
  tenantId: string;
  displayName: string;
  dob?: Date | null;
  biologicalSex?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  goals?: string | null;
  intakeNotes?: string | null;
  programType?: string | null;
  programStartDate?: Date | null;
}

/**
 * Inserts a new subject row with all intake fields and returns the created row.
 *
 * Uses the admin DB path (`getDb()`) intentionally — the subject row is created
 * before a valid TenantCtx (with subjectId) can be formed. Always scopes the
 * write to the caller-supplied tenantId (defense-in-depth, D-11).
 *
 * @throws Response(500) if the insert fails (e.g., FK violation on tenantId).
 */
export async function createSubject(data: CreateSubjectData) {
  const db = getDb();
  const [row] = await db.insert(subjects).values(data).returning();
  return row;
}

// ── listClientSubjects ────────────────────────────────────────────────────────

/**
 * Returns all subjects in the tenant EXCLUDING the owner subject.
 *
 * "Client subjects" are every subject that is NOT the owner (first-created)
 * subject for the tenant. The owner is excluded by its id (`ownerSubjectId`).
 *
 * D-02: one practice tenant; subjects within it (no tenant-per-client).
 * Scoped by tenantId + ne(id, ownerSubjectId) (defense-in-depth, D-11).
 */
export async function listClientSubjects(tenantId: string, ownerSubjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(subjects)
    .where(and(eq(subjects.tenantId, tenantId), ne(subjects.id, ownerSubjectId)));
}

// ── listSubjectsForTenant ─────────────────────────────────────────────────────

/**
 * Returns ALL subjects in the tenant (including the owner).
 *
 * Used by the SubjectChip loader and any surface that needs the full subject list.
 * Scoped by tenantId (defense-in-depth, D-11).
 */
export async function listSubjectsForTenant(tenantId: string) {
  const db = getDb();
  return db.select().from(subjects).where(eq(subjects.tenantId, tenantId));
}

// ── getSubjectById ────────────────────────────────────────────────────────────

/**
 * Returns a single subject by id within the tenant, or `null` if not found.
 *
 * Returns null (not a throw) so callers can distinguish "not found" from
 * server errors. The Response(404) throw idiom is the caller's responsibility
 * when needed (e.g., route loaders), consistent with getOwnerSubject in data.server.ts.
 *
 * Scoped by both id AND tenantId (IDOR guard, D-11).
 */
export async function getSubjectById(id: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}
