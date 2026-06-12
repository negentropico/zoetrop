// auth-audit.test.ts — AUTH-04 live regression: insertAuthAuditLog writes a real row.
//
// REGRESSION GUARD (Plan 07-04 checkpoint finding): the original insertAuthAuditLog
// used "tenantId as subjectId stub" — which violated audit_log_subject_id_subjects_id_fk
// against the live schema (no subjects row carries a tenant id). The best-effort
// try/catch in the auth hooks swallowed the violation and the unit tests mocked the
// DB, so AUTH-04 silently wrote ZERO rows. Migration 0013 made subject_id nullable;
// insertAuthAuditLog now writes subjectId: null. This test calls the real function
// against the live DB so a future FK/constraint regression cannot hide again.
//
// Skip-guarded on DATABASE_URL (same pattern as rls-isolation.test.ts):
//   DATABASE_URL_UNPOOLED || DATABASE_URL; DB_URL_STUBBED=1 forces skip.
//
// Cleanup note: audit_log DELETE is denied to app_user (immutability), but the
// admin path (getDb() / neondb_owner) CAN delete — used here for test-row cleanup only.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../../app/lib/db.server";
import { insertAuthAuditLog } from "../../app/lib/audit.server";
import { auditLog, tenants } from "../../db/schema";
import { user as userTable } from "../../db/auth-schema";
import { eq, and } from "drizzle-orm";

// ── Skip-guard ────────────────────────────────────────────────────────────────

const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

// ── Test fixtures ─────────────────────────────────────────────────────────────

const TENANT_ID = "t-auth-audit-test";
const USER_ID = "user-auth-audit-test-1";

if (connectionString) {
  beforeAll(async () => {
    const db = getDb();
    // Tenant row (audit_log.tenant_id FK)
    await db
      .insert(tenants)
      .values([{ id: TENANT_ID, name: "Auth Audit Test Tenant" }])
      .onConflictDoNothing();
    // User row (audit_log.user_id FK)
    await db
      .insert(userTable)
      .values([
        {
          id: USER_ID,
          name: "Auth Audit Test User",
          email: "auth-audit-test@example.invalid",
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          role: "owner",
          tenantId: TENANT_ID,
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    const db = getDb();
    // Admin-path cleanup (neondb_owner bypasses the app_user immutability policies;
    // test rows only — production audit rows are never deleted)
    await db
      .delete(auditLog)
      .where(eq(auditLog.userId, USER_ID))
      .catch(() => undefined);
    await db
      .delete(userTable)
      .where(eq(userTable.id, USER_ID))
      .catch(() => undefined);
    await db
      .delete(tenants)
      .where(eq(tenants.id, TENANT_ID))
      .catch(() => undefined);
  });
}

// ── AUTH-04 live regression ──────────────────────────────────────────────────

describe.skipIf(!connectionString)(
  "AUTH-04: insertAuthAuditLog writes a real audit_log row (live Neon)",
  () => {
    it("sign-in event lands with NULL subject_id (no FK violation)", async () => {
      const entityId = `auth-audit-test-session-${Date.now()}`;

      // Call the REAL function — no mocks. If the schema/FK regresses
      // (e.g. subject_id NOT NULL returns), this throws instead of
      // being silently swallowed by the auth hooks' try/catch.
      await insertAuthAuditLog({
        userId: USER_ID,
        action: "sign-in",
        tenantId: TENANT_ID,
        entityId,
      });

      // Assert the row actually landed (admin-path read)
      const db = getDb();
      const rows = await db
        .select({
          userId: auditLog.userId,
          action: auditLog.action,
          tenantId: auditLog.tenantId,
          subjectId: auditLog.subjectId,
          entityId: auditLog.entityId,
        })
        .from(auditLog)
        .where(
          and(eq(auditLog.userId, USER_ID), eq(auditLog.entityId, entityId))
        );

      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      expect(row.action).toBe("sign-in");
      expect(row.tenantId).toBe(TENANT_ID);
      expect(row.subjectId).toBeNull(); // nullable since migration 0013 — no stub
      expect(row.entityId).toBe(entityId);
    });

    it("sign-out event lands too (same admin path)", async () => {
      const entityId = `auth-audit-test-signout-${Date.now()}`;

      await insertAuthAuditLog({
        userId: USER_ID,
        action: "sign-out",
        tenantId: TENANT_ID,
        entityId,
      });

      const db = getDb();
      const rows = await db
        .select({ action: auditLog.action })
        .from(auditLog)
        .where(
          and(eq(auditLog.userId, USER_ID), eq(auditLog.entityId, entityId))
        );

      expect(rows).toHaveLength(1);
      expect(rows[0]!.action).toBe("sign-out");
    });
  }
);
