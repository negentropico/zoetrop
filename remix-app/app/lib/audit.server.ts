/**
 * audit.server.ts — D-13 lifecycle audit logger for the lab ingest pipeline
 *
 * insertAuditLog writes an auditLog row capturing who did what to which entity.
 * SECURITY: The entry type MUST NOT contain PHI field values — only IDs and
 * metadata. No clinical value, analyte name, or lab result is ever logged.
 * This is enforced by the AuditLogEntry type definition below (D-13).
 *
 * Phase 7 withTenantDb retrofit boundary:
 *   getDb() is isolated here. Phase 7 replaces it with withTenantDb() if RLS
 *   is enforced.
 */

import { getDb } from "./db.server";
import { auditLog } from "../../db/schema";
import type { AppRole } from "./authz.server";

// ── AuditLogEntry ──────────────────────────────────────────────────────────
//
// D-13: NO PHI value/name fields. Only IDs, role, action, table metadata,
// and entity IDs. A clinical result value or analyte name MUST NEVER appear
// in this type or in any call to insertAuditLog.

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

// ── insertAuditLog ─────────────────────────────────────────────────────────
//
// Inserts an auditLog row with a server-generated timestamp.
// Called from the upload action, extractionWorker, and the approve action.

export async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
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
