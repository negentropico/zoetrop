/**
 * require-subject-ctx.test.ts — Unit tests for requireSubjectCtx (AUTH-03, CR-02)
 *
 * Pure unit tests — no DB required. Exercises the GATE that requireSubjectCtx
 * composes (assertSubjectAccess Gate 1/2) and asserts the export exists and
 * is a function.
 *
 * Background: React Router 7 child loaders run independently of _app/layout.tsx
 * (the layout gate only covers authentication, not role). Each PHI read loader
 * must gate itself via requireSubjectCtx, which calls assertSubjectAccess
 * (Gate 1: client → 403; Gate 2: cross-tenant → 403).
 */

import { describe, it, expect } from "vitest";
import { assertSubjectAccess } from "~/lib/authz.server";
import { requireSubjectCtx } from "~/lib/authz.server";

// Helper to call assertSubjectAccess and capture the HTTP status thrown
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

// Helper to check whether assertSubjectAccess admits the caller
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

describe("requireSubjectCtx gate — AUTH-03 CR-02 client-role PHI exposure", () => {
  const tenantId = "tenant-a";
  const subject = { tenantId, id: "subject-1" };

  // Test 1: client role + valid same-tenant subject → 403 (Gate 1 denies client)
  it("denies client role (Gate 1) — assertSubjectAccess throws 403 for client role", () => {
    const clientUser = { role: "client", id: "user-client-1" };
    expect(canAccess(clientUser, subject, tenantId)).toBe(false);
    expect(getStatus(clientUser, subject, tenantId)).toBe(403);
  });

  // Test 2: owner role + same-tenant subject → no throw (admitted)
  it("admits owner role on same-tenant subject — no throw", () => {
    const ownerUser = { role: "owner", id: "user-owner-1" };
    expect(canAccess(ownerUser, subject, tenantId)).toBe(true);
    expect(getStatus(ownerUser, subject, tenantId)).toBe(200);
  });

  // Test 3: practitioner role + same-tenant subject, no assignedSubjectIds → no throw
  // (PHI read loaders are owner-data surfaces; per-assignment scoping for WRITE
  //  surfaces is Plan 05's concern, not these read loaders)
  it("admits practitioner role on same-tenant subject (no assignedSubjectIds) — no throw", () => {
    const practUser = { role: "practitioner", id: "user-pract-1" };
    expect(canAccess(practUser, subject, tenantId)).toBe(true);
    expect(getStatus(practUser, subject, tenantId)).toBe(200);
  });

  // Test 4: any role + cross-tenant subject → 403 (Gate 2 denies cross-tenant)
  it("denies cross-tenant access for any role (Gate 2) — assertSubjectAccess throws 403", () => {
    const crossSubject = { tenantId: "tenant-b", id: "subject-99" };
    const ownerUser = { role: "owner", id: "user-owner-2" };
    const practUser = { role: "practitioner", id: "user-pract-2" };
    const clientUser = { role: "client", id: "user-client-2" };

    expect(canAccess(ownerUser, crossSubject, tenantId)).toBe(false);
    expect(getStatus(ownerUser, crossSubject, tenantId)).toBe(403);

    expect(canAccess(practUser, crossSubject, tenantId)).toBe(false);
    expect(getStatus(practUser, crossSubject, tenantId)).toBe(403);

    // Client cross-tenant also 403 (Gate 1 fires first, but result is same)
    expect(canAccess(clientUser, crossSubject, tenantId)).toBe(false);
    expect(getStatus(clientUser, crossSubject, tenantId)).toBe(403);
  });

  // Test 5: requireSubjectCtx is exported and is a function
  it("requireSubjectCtx is exported from authz.server and is a function", () => {
    expect(typeof requireSubjectCtx).toBe("function");
  });
});
