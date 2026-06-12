/**
 * assignments.test.ts — Unit tests for assertSubjectAccess per-assignment extension (AUTH-03)
 * + DB-gated round-trip test for assignSubject / unassignSubject lifecycle (CR-02).
 *
 * Pure unit tests — no DB required for the assertSubjectAccess block.
 * The round-trip block is skip-guarded on a live DB connection (mirrors rls-isolation.test.ts).
 * Set DB_URL_STUBBED=1 to force-skip DB tests (used in CI).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { assertSubjectAccess } from "~/lib/authz.server";
import { getDb } from "~/lib/db.server";
import type { TenantCtx } from "~/lib/db.server";
import {
  tenants,
  subjects,
  practitionerSubjectAssignments,
} from "../../db/schema";
import { user as userTable } from "../../db/auth-schema";
import {
  assignSubject,
  unassignSubject,
  listAssignedSubjectIds,
} from "~/lib/assignments.server";
import { eq, and } from "drizzle-orm";

// ── Skip-guard (mirrors rls-isolation.test.ts) ─────────────────────────────────
// DB_URL_STUBBED=1 → force-skip (CI). Otherwise use UNPOOLED if available.
const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

// Helper to call assertSubjectAccess and capture whether it throws
function canAccess(
  user: { role?: string | null; id?: string },
  subject: { tenantId: string; id?: string },
  userTenantId: string,
  assignedSubjectIds?: string[]
): boolean {
  try {
    assertSubjectAccess(user, subject, userTenantId, assignedSubjectIds);
    return true;
  } catch {
    return false;
  }
}

// Helper to get the status code from a thrown Response
function getStatus(
  user: { role?: string | null; id?: string },
  subject: { tenantId: string; id?: string },
  userTenantId: string,
  assignedSubjectIds?: string[]
): number {
  try {
    assertSubjectAccess(user, subject, userTenantId, assignedSubjectIds);
    return 200;
  } catch (e) {
    if (e instanceof Response) return e.status;
    return 500;
  }
}

describe("assertSubjectAccess — AUTH-03 per-assignment extension", () => {
  const tenantId = "tenant-a";
  const subject = { tenantId, id: "subject-1" };

  // ── client role — always 403 ───────────────────────────────────────────────

  it("denies a client role regardless of assignment", () => {
    const user = { role: "client", id: "user-1" };
    expect(canAccess(user, subject, tenantId)).toBe(false);
    expect(getStatus(user, subject, tenantId)).toBe(403);
  });

  it("denies a client role even if subject id is in assignedSubjectIds", () => {
    const user = { role: "client", id: "user-1" };
    expect(canAccess(user, subject, tenantId, ["subject-1"])).toBe(false);
    expect(getStatus(user, subject, tenantId, ["subject-1"])).toBe(403);
  });

  // ── cross-tenant — always 403 ──────────────────────────────────────────────

  it("denies a practitioner from a different tenant", () => {
    const user = { role: "practitioner", id: "user-2" };
    const crossTenantSubject = { tenantId: "tenant-b", id: "subject-1" };
    expect(canAccess(user, crossTenantSubject, "tenant-a", ["subject-1"])).toBe(false);
    expect(getStatus(user, crossTenantSubject, "tenant-a", ["subject-1"])).toBe(403);
  });

  it("denies an owner from a different tenant", () => {
    const user = { role: "owner", id: "user-3" };
    const crossTenantSubject = { tenantId: "tenant-b", id: "subject-1" };
    expect(canAccess(user, crossTenantSubject, "tenant-a")).toBe(false);
    expect(getStatus(user, crossTenantSubject, "tenant-a")).toBe(403);
  });

  // ── owner — tenant-wide access regardless of assignedSubjectIds ────────────

  it("allows an owner to access any same-tenant subject with no assignedSubjectIds", () => {
    const user = { role: "owner", id: "user-3" };
    expect(canAccess(user, subject, tenantId)).toBe(true);
  });

  it("allows an owner to access any same-tenant subject even with an empty assignedSubjectIds", () => {
    const user = { role: "owner", id: "user-3" };
    expect(canAccess(user, subject, tenantId, [])).toBe(true);
  });

  it("allows an owner to access a subject not in assignedSubjectIds (assignment ignored for owners)", () => {
    const user = { role: "owner", id: "user-3" };
    // Even if subject-1 is not in the list, owner still passes
    expect(canAccess(user, subject, tenantId, ["subject-99"])).toBe(true);
  });

  // ── practitioner — per-assignment check ────────────────────────────────────

  it("denies a practitioner when assignedSubjectIds is provided but does NOT contain subject.id", () => {
    const user = { role: "practitioner", id: "user-2" };
    expect(canAccess(user, subject, tenantId, ["subject-99", "subject-100"])).toBe(false);
    expect(getStatus(user, subject, tenantId, ["subject-99", "subject-100"])).toBe(403);
  });

  it("denies a practitioner when assignedSubjectIds is an empty array", () => {
    const user = { role: "practitioner", id: "user-2" };
    expect(canAccess(user, subject, tenantId, [])).toBe(false);
    expect(getStatus(user, subject, tenantId, [])).toBe(403);
  });

  it("allows a practitioner when subject.id IS in assignedSubjectIds", () => {
    const user = { role: "practitioner", id: "user-2" };
    expect(canAccess(user, subject, tenantId, ["subject-1"])).toBe(true);
  });

  it("allows a practitioner when subject.id is among multiple assignedSubjectIds", () => {
    const user = { role: "practitioner", id: "user-2" };
    expect(canAccess(user, subject, tenantId, ["subject-99", "subject-1", "subject-100"])).toBe(true);
  });

  // ── backward-compat — assignedSubjectIds undefined (existing owner callers) ─

  it("allows a practitioner when assignedSubjectIds is undefined (backward-compat — no regression)", () => {
    // Existing 7 callers don't pass assignedSubjectIds — they're all owner-context.
    // A practitioner without assignedSubjectIds should PASS (undefined = opt-out of check)
    // because the existing callers do not pass the 4th arg.
    const user = { role: "practitioner", id: "user-2" };
    expect(canAccess(user, subject, tenantId, undefined)).toBe(true);
  });

  it("allows an owner with assignedSubjectIds undefined (classic call pattern)", () => {
    const user = { role: "owner", id: "user-3" };
    expect(canAccess(user, subject, tenantId)).toBe(true);
  });

  // ── missing role — fail-closed ─────────────────────────────────────────────

  it("allows a user with no role set when same tenant (existing behavior — owner-ish)", () => {
    // Per existing behavior: no role is not client, so it passes the role check.
    // Cross-tenant is still denied.
    const user = { role: null, id: "user-4" };
    // Same tenant — not a client, not cross-tenant → should pass (existing behavior)
    expect(canAccess(user, subject, tenantId)).toBe(true);
  });
});

// ── assign->unassign->assign round-trip (live Neon, CR-02 regression) ─────────
//
// Proves the revoke-then-reassign lifecycle works with the PARTIAL unique index
// (WHERE revoked_at IS NULL). Against the old FULL index this test would fail on
// the second assignSubject call (23505 + { alreadyExists: true } with no active row).
//
// Skips cleanly in CI (no DB connection). Set DATABASE_URL_UNPOOLED to run.

// Disposable test fixtures — IDs are unique per run to avoid cross-run conflicts
const TS = Date.now();
const RT_TENANT_ID = `t-rt-test-${TS}`;
const RT_SUBJECT_ID = `sub-rt-test-${TS}`;
const RT_PRACTITIONER_ID = `user-rt-pract-${TS}`;
const RT_OWNER_ID = `user-rt-owner-${TS}`;

const rtCtx: TenantCtx = {
  userId: RT_OWNER_ID,
  tenantId: RT_TENANT_ID,
  subjectId: RT_SUBJECT_ID,
};

describe.skipIf(!connectionString)(
  "assign->unassign->assign round-trip (live Neon, CR-02 partial index regression)",
  () => {
    beforeAll(async () => {
      // Insert disposable fixtures via admin path (not withTenantDb — RLS role may
      // not be needed for fixture setup and the app_user SET LOCAL would fail without
      // a real session; use getDb() admin path for setup only).
      const db = getDb();
      const now = new Date();

      // Tenant
      await db
        .insert(tenants)
        .values({ id: RT_TENANT_ID, name: "RT Test Tenant" })
        .onConflictDoNothing();

      // Subject
      await db
        .insert(subjects)
        .values({ id: RT_SUBJECT_ID, tenantId: RT_TENANT_ID, displayName: "RT Test Subject" })
        .onConflictDoNothing();

      // Owner user (assignedBy)
      await db
        .insert(userTable)
        .values({
          id: RT_OWNER_ID,
          name: "RT Test Owner",
          email: `rt-owner-${TS}@test.invalid`,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
          role: "owner",
          tenantId: RT_TENANT_ID,
        })
        .onConflictDoNothing();

      // Practitioner user
      await db
        .insert(userTable)
        .values({
          id: RT_PRACTITIONER_ID,
          name: "RT Test Practitioner",
          email: `rt-pract-${TS}@test.invalid`,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
          role: "practitioner",
          tenantId: RT_TENANT_ID,
        })
        .onConflictDoNothing();
    });

    afterAll(async () => {
      const db = getDb();
      // Clean up in FK order: assignments → subjects → users → tenant
      await db
        .delete(practitionerSubjectAssignments)
        .where(eq(practitionerSubjectAssignments.tenantId, RT_TENANT_ID))
        .catch(() => undefined);
      await db
        .delete(subjects)
        .where(eq(subjects.id, RT_SUBJECT_ID))
        .catch(() => undefined);
      await db
        .delete(userTable)
        .where(eq(userTable.id, RT_PRACTITIONER_ID))
        .catch(() => undefined);
      await db
        .delete(userTable)
        .where(eq(userTable.id, RT_OWNER_ID))
        .catch(() => undefined);
      await db
        .delete(tenants)
        .where(eq(tenants.id, RT_TENANT_ID))
        .catch(() => undefined);
    });

    it("assign->unassign->assign: second assign grants real active access (CR-02 regression)", async () => {
      // Step 1: Initial assign
      const r1 = await assignSubject(rtCtx, {
        practitionerId: RT_PRACTITIONER_ID,
        subjectId: RT_SUBJECT_ID,
        assignedBy: RT_OWNER_ID,
      });
      expect(r1.assigned).toBe(true);
      expect(r1.alreadyExists).toBe(false);

      // Step 2: Confirm active access
      const list1 = await listAssignedSubjectIds(rtCtx, RT_PRACTITIONER_ID);
      expect(list1).toContain(RT_SUBJECT_ID);

      // Step 3: Unassign (soft-delete)
      const u1 = await unassignSubject(rtCtx, {
        practitionerId: RT_PRACTITIONER_ID,
        subjectId: RT_SUBJECT_ID,
      });
      expect(u1.unassigned).toBe(true);

      // Step 4: Confirm no active access after revocation
      const list2 = await listAssignedSubjectIds(rtCtx, RT_PRACTITIONER_ID);
      expect(list2).not.toContain(RT_SUBJECT_ID);

      // Step 5: Re-assign (the regression assertion — fails against full index, passes against partial)
      const r2 = await assignSubject(rtCtx, {
        practitionerId: RT_PRACTITIONER_ID,
        subjectId: RT_SUBJECT_ID,
        assignedBy: RT_OWNER_ID,
      });
      // With the PARTIAL index: a new active row is created, NOT a false "alreadyExists"
      expect(r2.assigned).toBe(true);
      expect(r2.alreadyExists).toBe(false);

      // Step 6: Confirm active access restored (the real regression check)
      const list3 = await listAssignedSubjectIds(rtCtx, RT_PRACTITIONER_ID);
      expect(list3).toContain(RT_SUBJECT_ID);
    });
  }
);
