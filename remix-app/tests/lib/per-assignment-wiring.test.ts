/**
 * per-assignment-wiring.test.ts — Unit tests pinning the per-assignment gate matrix
 *
 * Pure unit tests (no DB) that lock the contract the route wiring must satisfy.
 *
 * They model the "route resolves assignedIds, then calls assertSubjectAccess"
 * decision as a small local helper so the matrix is proven independently of
 * HTTP/runtime.
 *
 * AUTH-03, D-07: listAssignedSubjectIds → assertSubjectAccess (4th arg)
 *
 * Run: DB_URL_STUBBED=1 npx vitest run tests/lib/per-assignment-wiring.test.ts
 */

import { describe, it, expect } from "vitest";
import { assertSubjectAccess } from "~/lib/authz.server";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns true if assertSubjectAccess passes (no throw). */
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

/** Returns the HTTP status thrown by assertSubjectAccess, or 200 if it passes. */
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

/**
 * resolveAssignedIds — documents the exact conditional every route uses.
 *
 * Given role 'practitioner', returns the looked-up ids (as if
 * listAssignedSubjectIds returned them). Given any other role (owner), returns
 * undefined so that Gate 3 is skipped and tenant-wide access is retained (D-07).
 *
 * This is the pattern used in every practitioner-admitting route:
 *   const assignedIds = user.role === "practitioner"
 *     ? await listAssignedSubjectIds(ctx, user.id)
 *     : undefined;
 */
function resolveAssignedIds(
  role: string | null | undefined,
  ids: string[]
): string[] | undefined {
  return role === "practitioner" ? ids : undefined;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("per-assignment-wiring — Gate 3 route contract", () => {
  const tenantId = "tenant-a";
  const subjectWithId = { tenantId, id: "subject-1" };

  // ── Test 1: practitioner with empty assigned set → 403 ────────────────────
  it("Test 1: practitioner with empty assigned set (unassigned) is denied 403", () => {
    const user = { role: "practitioner", id: "prac-1" };
    expect(canAccess(user, subjectWithId, tenantId, [])).toBe(false);
    expect(getStatus(user, subjectWithId, tenantId, [])).toBe(403);
  });

  // ── Test 2: practitioner assigned to different subjects → 403 ─────────────
  it("Test 2: practitioner with assigned set NOT containing subject.id is denied 403", () => {
    const user = { role: "practitioner", id: "prac-1" };
    const otherSubjects = ["subject-99", "subject-100"];
    expect(canAccess(user, subjectWithId, tenantId, otherSubjects)).toBe(false);
    expect(getStatus(user, subjectWithId, tenantId, otherSubjects)).toBe(403);
  });

  // ── Test 3: practitioner assigned to subject.id → passes ──────────────────
  it("Test 3: practitioner with assigned set containing subject.id passes", () => {
    const user = { role: "practitioner", id: "prac-1" };
    const assignedSet = ["subject-1", "subject-99"];
    expect(canAccess(user, subjectWithId, tenantId, assignedSet)).toBe(true);
    expect(getStatus(user, subjectWithId, tenantId, assignedSet)).toBe(200);
  });

  // ── Test 4: owner with undefined assignedIds → passes any same-tenant subject
  it("Test 4: owner with assignedIds undefined (role-conditional yields undefined) passes for any same-tenant subject", () => {
    const user = { role: "owner", id: "owner-1" };
    // resolveAssignedIds returns undefined for owner role — Gate 3 skipped
    const assignedIds = resolveAssignedIds(user.role, []);
    expect(assignedIds).toBeUndefined();
    expect(canAccess(user, subjectWithId, tenantId, assignedIds)).toBe(true);
    expect(getStatus(user, subjectWithId, tenantId, assignedIds)).toBe(200);
  });

  // ── Test 5: subject WITHOUT id, practitioner with non-empty set → 403 ──────
  it("Test 5: subject object with no id, practitioner with non-empty assigned set → 403 (proves review.tsx action / detail.tsx loader must pass subject.id)", () => {
    const user = { role: "practitioner", id: "prac-1" };
    // Subject missing id — simulates the bug in review.tsx action / reports/detail.tsx
    // before this plan's fix: { tenantId: extraction.tenantId } with no id field.
    const subjectNoId = { tenantId }; // no id
    const assignedSet = ["subject-1", "subject-99"];
    // Gate 3: subject.id is undefined → !subject.id → denied
    expect(canAccess(user, subjectNoId, tenantId, assignedSet)).toBe(false);
    expect(getStatus(user, subjectNoId, tenantId, assignedSet)).toBe(403);
  });

  // ── Test 6: resolveAssignedIds — role-conditional helper ──────────────────
  describe("Test 6: resolveAssignedIds role-conditional", () => {
    it("returns the looked-up ids for role 'practitioner'", () => {
      const ids = ["subject-1", "subject-2"];
      expect(resolveAssignedIds("practitioner", ids)).toEqual(ids);
    });

    it("returns undefined for role 'owner' (owner skips Gate 3, retains tenant-wide access)", () => {
      const ids = ["subject-1"];
      expect(resolveAssignedIds("owner", ids)).toBeUndefined();
    });

    it("returns undefined for null role", () => {
      expect(resolveAssignedIds(null, ["subject-1"])).toBeUndefined();
    });

    it("returns undefined for undefined role", () => {
      expect(resolveAssignedIds(undefined, ["subject-1"])).toBeUndefined();
    });
  });
});
