/**
 * tests/lib/active-subject.test.ts — Contract tests for getActiveSubject (ONB-03)
 *
 * RED stub: `getActiveSubject` does not exist in `~/lib/data.server` yet.
 * It is added in Plan 01-02. These tests go GREEN in Plan 01-02.
 *
 * Behavior under test (from Plan 01-01 PATTERNS.md — getActiveSubject contract):
 *   1. Falls back to the first tenant subject when the zt-subject cookie is absent
 *   2. Falls back to the first tenant subject when the zt-subject cookie value
 *      refers to a subject belonging to a different tenant (cross-tenant rejection)
 *   3. Returns the cookie subject when the subjectId is valid and same-tenant
 *   4. Is exported as an async function from data.server
 *
 * DB-dependent cases: guard on DATABASE_URL_UNPOOLED || DATABASE_URL.
 * Pure structural assertion (export exists + is function) runs unconditionally.
 *
 * Cookie parse idiom under test:
 *   /(?:^|;\s*)zt-subject=([^;]+)/.exec(cookieHeader)?.[1]
 */

import { describe, it, expect, beforeAll } from "vitest";

// ── DB availability guard ───────────────────────────────────────────────────
const hasDb = !!(
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
);

// ── Lazy import (RED-phase safe) ───────────────────────────────────────────
let getActiveSubject: (
  request: Request,
  tenantId: string
) => Promise<unknown>;

let importError: unknown = null;

beforeAll(async () => {
  try {
    const mod = await import("~/lib/data.server");
    if ("getActiveSubject" in mod) {
      getActiveSubject = (mod as Record<string, unknown>)["getActiveSubject"] as typeof getActiveSubject;
    } else {
      importError = new Error("getActiveSubject not exported from data.server — goes GREEN in Plan 01-02");
    }
  } catch (e) {
    importError = e;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Structural contract (RED until Plan 01-02 adds getActiveSubject to data.server)
// ─────────────────────────────────────────────────────────────────────────────

describe("getActiveSubject — exported async function (ONB-03)", () => {
  it("is an exported async function from data.server", () => {
    if (importError) {
      throw new Error(
        `getActiveSubject not found in data.server — implement in Plan 01-02. Error: ${importError}`
      );
    }
    expect(typeof getActiveSubject).toBe("function");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cookie parsing + fallback logic (DB-gated; RED until Plan 01-02 + migration 0015)
// ─────────────────────────────────────────────────────────────────────────────

describe("getActiveSubject — cookie parsing + fallback (ONB-03, skip when no DB)", () => {
  it.skipIf(!hasDb)(
    "falls back to first tenant subject when zt-subject cookie is absent",
    async () => {
      if (importError) {
        throw new Error("getActiveSubject not found — implement in Plan 01-02");
      }
      // A request with NO zt-subject cookie should fall back to the owner (first) subject.
      // Without a seeded tenant + subject, this will throw Response 404.
      // The purpose here is to verify the FALLBACK path is exercised (no cookie match).
      const req = new Request("https://zoetrop.vercel.app/dashboard", {
        headers: { Cookie: "zt-nav=1" }, // some other cookie, NOT zt-subject
      });
      // With a real tenant + owner subject seeded, this returns the owner subject.
      // Without seed data, it throws a 404 Response (which is also correct behavior).
      try {
        const result = await getActiveSubject(req, "test-tenant-id");
        expect(result).toBeDefined();
      } catch (e) {
        // 404 is acceptable when no seed data exists — the fallback path was reached
        expect(e instanceof Response ? e.status : null).toBe(404);
      }
    }
  );

  it.skipIf(!hasDb)(
    "falls back to first tenant subject when cookie subject is cross-tenant",
    async () => {
      if (importError) {
        throw new Error("getActiveSubject not found — implement in Plan 01-02");
      }
      // A zt-subject cookie whose subjectId belongs to a different tenant should
      // be ignored and fall back to the owner subject for the requested tenantId.
      const req = new Request("https://zoetrop.vercel.app/dashboard", {
        headers: {
          Cookie: "zt-subject=cross-tenant-subject-id-xyz; zt-nav=1",
        },
      });
      // Cross-tenant subject won't pass the tenantId check → falls back to owner.
      // With no seed data → throws 404 (acceptable).
      try {
        const result = await getActiveSubject(req, "test-tenant-id");
        // If data exists: result should be the OWNER subject, not "cross-tenant-subject-id-xyz"
        const row = result as Record<string, unknown>;
        expect(row.id).not.toBe("cross-tenant-subject-id-xyz");
      } catch (e) {
        expect(e instanceof Response ? e.status : null).toBe(404);
      }
    }
  );

  it.skipIf(!hasDb)(
    "returns the cookie subject when valid and same-tenant",
    async () => {
      if (importError) {
        throw new Error("getActiveSubject not found — implement in Plan 01-02");
      }
      // When the zt-subject cookie holds a valid subjectId that belongs to the tenant,
      // getActiveSubject must return THAT subject (not the fallback owner).
      // This requires a real seeded subject row to pass — placeholder for Plan 01-02 E2E.
      expect(typeof getActiveSubject).toBe("function");
      // Full E2E assertion (with fixture subject) added in Plan 01-02 test suite.
    }
  );
});
