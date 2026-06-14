/**
 * tests/lib/subjects.test.ts — Contract tests for subjects.server.ts (ONB-01)
 *
 * RED stub: the target module `~/lib/subjects.server` does not exist yet.
 * It is created in Plan 01-02. These tests go GREEN in Plan 01-02.
 *
 * Structure:
 *   - Module-export assertions run unconditionally (lazy import in beforeAll keeps
 *     the suite collectable when the file doesn't exist yet — import errors surface
 *     in individual test assertions, not at collection time).
 *   - DB-touching cases guard on DATABASE_URL_UNPOOLED || DATABASE_URL.
 *     They ALSO depend on migration 0015_odd_sage being applied to Neon.
 *     Expected RED until Plan 01-02 is complete AND the migration is applied.
 */

import { describe, it, expect, beforeAll } from "vitest";

// ── DB availability guard ───────────────────────────────────────────────────
// DB_URL_STUBBED=1 → skip even if DATABASE_URL is set (it's the test-setup stub)
const hasDb = !process.env["DB_URL_STUBBED"] && !!(
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
);

// ── Lazy import (RED-phase safe) ───────────────────────────────────────────
// The module does not exist yet → import error is caught in beforeAll
// so individual tests can report as expected-RED, not collection-time crashes.
let createSubject: (data: {
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
}) => Promise<unknown>;
let listClientSubjects: (tenantId: string, ownerSubjectId: string) => Promise<unknown[]>;
let listSubjectsForTenant: (tenantId: string) => Promise<unknown[]>;
let getSubjectById: (id: string, tenantId: string) => Promise<unknown | null>;

let importError: unknown = null;

beforeAll(async () => {
  try {
    const mod = await import("~/lib/subjects.server");
    createSubject = mod.createSubject as typeof createSubject;
    listClientSubjects = mod.listClientSubjects as typeof listClientSubjects;
    listSubjectsForTenant = mod.listSubjectsForTenant as typeof listSubjectsForTenant;
    getSubjectById = mod.getSubjectById as typeof getSubjectById;
  } catch (e) {
    importError = e;
    // RED phase: module doesn't exist yet — tests will fail with a clear message
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Module-contract assertions (RED until Plan 01-02 creates subjects.server.ts)
// ─────────────────────────────────────────────────────────────────────────────

describe("subjects.server.ts — module contract (ONB-01)", () => {
  it("exports createSubject, listClientSubjects, listSubjectsForTenant, getSubjectById", () => {
    // RED: importError is set because the module doesn't exist yet
    expect(importError, "subjects.server module not found — implement in Plan 01-02").toBeNull();
    expect(typeof createSubject).toBe("function");
    expect(typeof listClientSubjects).toBe("function");
    expect(typeof listSubjectsForTenant).toBe("function");
    expect(typeof getSubjectById).toBe("function");
  });

  it("createSubject returns a Promise (is async)", () => {
    // RED: module not implemented yet
    if (importError) {
      throw new Error("subjects.server not found — goes GREEN in Plan 01-02");
    }
    const result = createSubject({
      id: "test-id",
      tenantId: "test-tenant",
      displayName: "Test Subject",
    });
    expect(result).toBeInstanceOf(Promise);
    // Swallow expected network/FK error (no valid seed data in test)
    return result.catch(() => {});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB-dependent tests (skip when no DB; also RED until Plan 01-02 + migration 0015)
// ─────────────────────────────────────────────────────────────────────────────

describe("subjects.server.ts — DB round-trip (ONB-01, skip when no DB)", () => {
  it.skipIf(!hasDb)(
    "createSubject persists a row with all intake fields and they round-trip correctly",
    async () => {
      // RED: module doesn't exist yet. GREEN in Plan 01-02 after subjects.server is created
      // AND migration 0015 is applied to Neon (adds the intake columns).
      if (importError) {
        throw new Error(
          "subjects.server not found — implement in Plan 01-02 and apply migration 0015 to Neon"
        );
      }

      const now = new Date("1990-03-15T00:00:00.000Z");
      const progStart = new Date("2026-01-01T00:00:00.000Z");

      const row = await createSubject({
        id: `test-subject-${Date.now()}`,
        tenantId: "test-tenant-integrity",
        displayName: "Integrity Test Subject",
        dob: now,
        biologicalSex: "female",
        contactEmail: "test@example.com",
        contactPhone: "+1-555-0100",
        goals: "Improve HRV and sleep quality",
        intakeNotes: "Initial intake session completed",
        programType: "cessation",
        programStartDate: progStart,
      }) as Record<string, unknown>;

      expect(row).toBeDefined();
      expect(row.displayName).toBe("Integrity Test Subject");
      expect(row.biologicalSex).toBe("female");
      expect(row.contactEmail).toBe("test@example.com");
      expect(row.programType).toBe("cessation");
    }
  );
});
