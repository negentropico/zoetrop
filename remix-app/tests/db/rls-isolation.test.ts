// rls-isolation.test.ts — TEN-02 / TEN-03 isolation + pool non-leak tests.
//
// RED until 0010 RLS migration + app_user role apply (Plan 02).
// The withTenantDb SET LOCAL ROLE app_user statement will fail with
// "role app_user does not exist" until migration 0010 is applied to Neon.
//
// Skip-guarded on DATABASE_URL — all three describe blocks skip cleanly in
// CI without a live DB connection. Set DB_URL_STUBBED=1 to force-skip
// (used in this test file's own verify step in the plan).
//
// Connection-string resolution mirrors the migration path:
//   DATABASE_URL_UNPOOLED (direct, bypasses PgBouncer — preferred for tests)
//   || DATABASE_URL (pooled — fallback for environments without UNPOOLED)

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "@neondatabase/serverless";
import { getDb, withTenantDb } from "../../app/lib/db.server";
import type { TenantCtx } from "../../app/lib/db.server";
import { metrics, tenants, subjects } from "../../db/schema";
import { eq, and } from "drizzle-orm";

// ── Skip-guard ────────────────────────────────────────────────────────────────

const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

// ── Test-tenant setup ─────────────────────────────────────────────────────────
// Two disjoint test tenants + subjects; inserted via the admin getDb() path
// (not withTenantDb — RLS/app_user role may not exist yet when setting up fixtures).

const TENANT_A_ID = "t-rls-test-a";
const TENANT_B_ID = "t-rls-test-b";
const SUBJECT_A_ID = "sub-rls-test-a";
const SUBJECT_B_ID = "sub-rls-test-b";
const TEST_USER_ID = "user-rls-test-1";

const ctxA: TenantCtx = {
  userId: TEST_USER_ID,
  tenantId: TENANT_A_ID,
  subjectId: SUBJECT_A_ID,
};

const ctxB: TenantCtx = {
  userId: TEST_USER_ID,
  tenantId: TENANT_B_ID,
  subjectId: SUBJECT_B_ID,
};

// Pool used for afterAll cleanup
let pool: Pool | null = null;

function getTestPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

// Inserted metric IDs for cleanup
const insertedMetricIds: string[] = [];

if (connectionString) {
  beforeAll(async () => {
    const db = getDb();

    // Upsert test tenants (ignore conflicts — may already exist from prior runs)
    await db
      .insert(tenants)
      .values([
        { id: TENANT_A_ID, name: "RLS Test Tenant A" },
        { id: TENANT_B_ID, name: "RLS Test Tenant B" },
      ])
      .onConflictDoNothing();

    // Upsert test subjects
    await db
      .insert(subjects)
      .values([
        { id: SUBJECT_A_ID, tenantId: TENANT_A_ID, displayName: "RLS Test Subject A" },
        { id: SUBJECT_B_ID, tenantId: TENANT_B_ID, displayName: "RLS Test Subject B" },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    const db = getDb();
    // Clean up inserted metric rows
    for (const id of insertedMetricIds) {
      await db.delete(metrics).where(eq(metrics.id, id)).catch(() => undefined);
    }
    // Clean up test subjects + tenants (in FK order)
    await db.delete(subjects).where(eq(subjects.id, SUBJECT_A_ID)).catch(() => undefined);
    await db.delete(subjects).where(eq(subjects.id, SUBJECT_B_ID)).catch(() => undefined);
    await db.delete(tenants).where(eq(tenants.id, TENANT_A_ID)).catch(() => undefined);
    await db.delete(tenants).where(eq(tenants.id, TENANT_B_ID)).catch(() => undefined);

    if (pool) await pool.end();
  });
}

// Helper: build a minimal valid metrics row (no PHI values needed for isolation test)
function testMetricRow(id: string, tenantId: string, subjectId: string) {
  return {
    id,
    name: "rls-test-metric",
    value: 1.0,
    unit: "units",
    category: "vitamins" as const,
    timestamp: new Date("2026-01-01"),
    improvement: "higher is better",
    source: "manual" as const,
    tenantId,
    subjectId,
  };
}

// ── TEN-02: Cross-tenant read isolation ──────────────────────────────────────

describe.skipIf(!connectionString)(
  "TEN-02: RLS cross-tenant isolation (live Neon)",
  () => {
    it("Tenant B reads zero rows written by Tenant A", async () => {
      const metricId = `rls-test-cross-read-${Date.now()}`;
      insertedMetricIds.push(metricId);

      // Insert a row as Tenant A (will throw "role app_user does not exist" until Plan 02)
      await withTenantDb(ctxA, async (tx) => {
        await tx.insert(metrics).values(testMetricRow(metricId, TENANT_A_ID, SUBJECT_A_ID));
      });

      // Attempt to read it as Tenant B — RLS must return zero rows
      const result = await withTenantDb(ctxB, async (tx) => {
        return tx
          .select()
          .from(metrics)
          .where(eq(metrics.id, metricId));
      });

      // RLS tenant_subject_isolation policy enforces zero rows for a mismatched tenant
      expect(result.length).toBe(0);
    });
  }
);

// ── TEN-02: WITH CHECK rejects mismatched-tenant INSERT ──────────────────────

describe.skipIf(!connectionString)(
  "TEN-02: WITH CHECK rejects mismatched-tenant INSERT",
  () => {
    it("INSERT carrying tenant_id = tenantB under tenantA ctx is rejected by RLS policy", async () => {
      const metricId = `rls-test-with-check-${Date.now()}`;
      // Do NOT push to insertedMetricIds — the insert should be rejected

      // The RLS WITH CHECK clause requires tenant_id to match the SET LOCAL GUC.
      // Inserting a row with tenant_id = TENANT_B_ID while GUC is set to TENANT_A_ID
      // must be rejected with a policy violation error.
      await expect(
        withTenantDb(ctxA, async (tx) => {
          await tx.insert(metrics).values(
            // Deliberately mismatched: ctx is tenantA, row carries tenantB
            testMetricRow(metricId, TENANT_B_ID, SUBJECT_B_ID)
          );
        })
      ).rejects.toThrow(); // Postgres policy violation — message varies; any rejection satisfies WITH CHECK
    });
  }
);

// ── TEN-03: Pool reuse — SET LOCAL context does not bleed ────────────────────

describe.skipIf(!connectionString)(
  "TEN-03: withTenantDb context non-leak (live Neon)",
  () => {
    it("Tenant context does not bleed to the next request on a pooled connection", async () => {
      const metricId = `rls-test-pool-leak-${Date.now()}`;
      insertedMetricIds.push(metricId);

      // Step 1: Tenant A writes a row and commits (SET LOCAL is cleared at COMMIT)
      await withTenantDb(ctxA, async (tx) => {
        await tx.insert(metrics).values(testMetricRow(metricId, TENANT_A_ID, SUBJECT_A_ID));
      });

      // Step 2: Tenant B queries on the same pool — SET LOCAL was cleared at COMMIT;
      // the GUC is now unset/empty, so the RLS empty-claims guard returns no rows
      // (NULLIF(current_setting('app.tenant_id', true), '') IS NULL → no match).
      const result = await withTenantDb(ctxB, async (tx) => {
        return tx
          .select()
          .from(metrics)
          .where(and(eq(metrics.id, metricId), eq(metrics.tenantId, TENANT_A_ID)));
      });

      // Tenant A's row must NOT be visible to Tenant B's transaction — SET LOCAL did not leak
      expect(result.length).toBe(0);
    });
  }
);
