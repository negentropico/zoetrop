/**
 * audit.server.ts — D-13 lifecycle audit logger for the lab ingest pipeline
 *
 * insertAuditLog writes an auditLog row capturing who did what to which entity.
 * SECURITY: The entry type MUST NOT contain PHI field values — only IDs and
 * metadata. No clinical value, analyte name, or lab result is ever logged.
 * This is enforced by the AuditLogEntry type definition below (D-13).
 *
 * Phase 7 withTenantDb retrofit (Plan 03 COMPLETE):
 *   Two exported paths:
 *
 *   insertAuditLog(entry) — session-bound path.
 *     Uses withTenantDb with ctx derived from entry fields. For writes that
 *     occur within a request-scoped session (upload action, consent action,
 *     review approve/reject actions). The audit_log INSERT policy (WITH CHECK
 *     on app.tenant_id) is satisfied by the app_user role set by withTenantDb.
 *
 *   insertAuditLogAdmin(entry) — background/no-session path.
 *     Uses getDb() admin path (neondb_owner). For contexts with no request-
 *     scoped subject — extractionWorker (waitUntil background job). The worker
 *     runs outside a request session; its subjectId comes from the doc row,
 *     not from a live session. The admin path bypasses RLS via neondb_owner.
 *     Also used for auth events (Plan 04) where no subjectId exists at sign-in.
 */

import { withTenantDb, getDb } from "./db.server";
import type { TenantCtx } from "./db.server";
import { auditLog } from "../../db/schema";
import type { AppRole } from "./authz.server";

// ── AuditLogEntry ──────────────────────────────────────────────────────────
//
// D-13: NO PHI value/name fields. Only IDs, role, action, table metadata,
// and entity IDs. A clinical result value or analyte name MUST NEVER appear
// in this type or in any call to insertAuditLog / insertAuditLogAdmin.

export interface AuditLogEntry {
  userId: string;
  role: AppRole;
  action: string;          // e.g. 'upload' | 'extraction-complete' | 'approve' | 'reject' | 'metric-insert'
  tableName?: string;      // e.g. 'lab_documents' | 'lab_extractions' | 'metrics'
  operation?: string;      // e.g. 'insert' | 'update'
  tenantId: string;
  subjectId: string;
  entityId?: string;       // ID of the affected row — NOT its value or name (D-13)
}

// ── insertAuditLog (session-bound path — withTenantDb) ─────────────────────
//
// Uses withTenantDb so the INSERT is RLS-governed for request-scoped sessions.
// The audit_log RLS policy allows INSERT for app_user (WITH CHECK on
// app.tenant_id); this path satisfies it.
//
// Called from: upload action, consent action, review approve/reject actions.

export async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
  const ctx: TenantCtx = {
    userId: entry.userId,
    tenantId: entry.tenantId,
    subjectId: entry.subjectId,
  };
  await withTenantDb(ctx, async (tx) => {
    await tx.insert(auditLog).values({
      userId: entry.userId,
      role: entry.role,
      action: entry.action,
      tableName: entry.tableName,
      operation: entry.operation,
      tenantId: entry.tenantId,
      subjectId: entry.subjectId,
      entityId: entry.entityId,
      timestamp: new Date(),
    });
  });
}

// ── insertAuditLogAdmin (background/no-session path — admin getDb()) ────────
//
// Uses getDb() (neondb_owner, BYPASSRLS) for contexts where no request-scoped
// session exists. The extractionWorker runs via waitUntil — it has no HTTP
// session; its subjectId comes from the doc row, not from a live session.
//
// Also used for auth events (Plan 04) where no subjectId exists at sign-in
// time (auth events use tenantId as the subjectId stub).
//
// WARNING: This path bypasses RLS. Only use for:
//   - Background jobs (extractionWorker) where no session context exists
//   - Auth events (sign-in, sign-out, invite-redeemed) from Better-Auth hooks

export async function insertAuditLogAdmin(entry: AuditLogEntry): Promise<void> {
  const db = getDb();
  await db.insert(auditLog).values({
    userId: entry.userId,
    role: entry.role,
    action: entry.action,
    tableName: entry.tableName,
    operation: entry.operation,
    tenantId: entry.tenantId,
    subjectId: entry.subjectId,
    entityId: entry.entityId,
    timestamp: new Date(),
  });
}

// ── insertAuthAuditLog (AUTH-04 — auth-event admin path) ────────────────────
//
// Writes a PHI-free auth-event row to the immutable audit_log.
// Uses the admin path (getDb() / neondb_owner, BYPASSRLS) because there is no
// subject context at sign-in/sign-out time — the session create/delete hooks
// only have userId + tenantId, never a clinical subjectId.
//
// PHI-free (D-13): only userId / action / tenantId / entityId. No clinical
// value, analyte name, or subject data ever appears in these rows.
//
// subjectId is NULL for auth events (migration 0013 made the column nullable):
// no clinical subject exists at auth time, and NULL is semantically honest.
// The original 07-PATTERNS.md "tenantId as subjectId stub" was IMPOSSIBLE —
// audit_log.subject_id has an FK to subjects(id) and no subjects row carries a
// tenant id (the INSERT violated audit_log_subject_id_subjects_id_fk; found at
// the Plan 04 checkpoint). RLS note: the audit_log SELECT/INSERT policies are
// keyed on app.tenant_id ONLY (no subject_id predicate), so NULL-subject rows
// remain visible to app_user tenant reads; compliance reads use the admin path
// regardless.
//
// Best-effort contract: each call site MUST be wrapped in try/catch so a
// logging failure never propagates into the auth flow (T-07-17).
//
// Called from: auth.server.ts databaseHooks (session.create, session.delete,
// user.create.after for sign-up / invite-redeemed).

export interface AuthAuditEntry {
  userId: string;
  action: 'sign-in' | 'sign-out' | 'sign-up' | 'invite-redeemed' | 'sign-in-failed' | 'role-changed';
  tenantId: string;
  entityId?: string;  // optional session id or invite id — NOT a PHI value
  role?: AppRole;     // actor's resolved role; defaults to 'owner' when unavailable (break-glass / role-unavailable path)
}

export async function insertAuthAuditLog(entry: AuthAuditEntry): Promise<void> {
  const db = getDb();
  await db.insert(auditLog).values({
    userId: entry.userId,
    role: entry.role ?? 'owner' as AppRole,  // actor's real role; falls back to 'owner' only when unavailable (break-glass / role-unavailable path)
    action: entry.action,
    tenantId: entry.tenantId,
    subjectId: null, // auth events have no clinical subject (nullable since migration 0013)
    entityId: entry.entityId,
    timestamp: new Date(),
    // tableName / operation intentionally omitted — not applicable for auth events
  });
}
