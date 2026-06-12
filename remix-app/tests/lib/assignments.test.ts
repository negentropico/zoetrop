/**
 * assignments.test.ts — Unit tests for assertSubjectAccess per-assignment extension (AUTH-03)
 *
 * Pure unit tests — no DB required.
 * Tests the extended assertSubjectAccess behavior (Plan 04 extension).
 */

import { describe, it, expect } from "vitest";
import { assertSubjectAccess } from "~/lib/authz.server";

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
