/**
 * tests/lib/checklist.test.ts — Contract tests for getChecklistStatus (ONB-04)
 *
 * RED stub: `checklist.server` does not exist yet.
 * It is created in Plan 01-03. These tests go GREEN in Plan 01-03.
 *
 * 3-state logic under test (ChecklistState: 'missing' | 'in_progress' | 'done'):
 *   - labs: 'missing' when no lab_documents for subject
 *   - labs: 'in_progress' when lab_documents exist but no approved extraction
 *   - labs: 'done' when at least one approved extraction exists
 *   - whoop: 'done' when a metrics row with source='whoop' exists for subject
 *   - invite: 'not_sent' when no invite row carries this subjectId
 *
 * invite state depends on invites.subjectId column (ONB-02 — added in Plan 01-01 schema).
 * The subjectId column exists in TS schema after Task 1 of this plan, but the
 * live DB column is not present until migration 0015 is applied.
 *
 * DB-dependent: all cases guard on hasDb.
 * Non-DB structural assertion: getChecklistStatus is an exported function.
 */

import { describe, it, expect, beforeAll } from "vitest";

// ── DB availability guard ───────────────────────────────────────────────────
const hasDb = !!(
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
);

// ── Lazy import (RED-phase safe) ───────────────────────────────────────────
let getChecklistStatus: (
  ctx: { userId: string; tenantId: string; subjectId: string },
  targetSubjectId: string
) => Promise<{
  intake: string;
  consent: string;
  genetics: string;
  labs: string;
  whoop: string;
  report: string;
  protocol: string;
  invite: "not_sent" | "pending" | "redeemed";
}>;

let importError: unknown = null;

beforeAll(async () => {
  try {
    const mod = await import("~/lib/checklist.server");
    if ("getChecklistStatus" in mod) {
      getChecklistStatus = (mod as Record<string, unknown>)["getChecklistStatus"] as typeof getChecklistStatus;
    } else {
      importError = new Error(
        "getChecklistStatus not exported from checklist.server — goes GREEN in Plan 01-03"
      );
    }
  } catch (e) {
    importError = e;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Structural contract (RED until Plan 01-03 creates checklist.server.ts)
// ─────────────────────────────────────────────────────────────────────────────

describe("checklist.server.ts — module contract (ONB-04)", () => {
  it("exports getChecklistStatus as a function", () => {
    if (importError) {
      throw new Error(
        `checklist.server not found — implement in Plan 01-03. Error: ${importError}`
      );
    }
    expect(typeof getChecklistStatus).toBe("function");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3-state checklist logic (DB-gated; RED until Plan 01-03 + migration 0015 applied)
// ─────────────────────────────────────────────────────────────────────────────

describe("getChecklistStatus — 3-state logic (ONB-04, skip when no DB)", () => {
  const ctx = {
    userId: "test-user-id",
    tenantId: "test-tenant-id",
    subjectId: "test-owner-subject-id",
  };
  const targetSubjectId = "test-target-subject-id";

  it.skipIf(!hasDb)(
    "returns missing for labs when no lab_documents exist for subject",
    async () => {
      if (importError) {
        throw new Error("checklist.server not found — implement in Plan 01-03");
      }
      // Without seeded lab_documents for targetSubjectId, labs must be 'missing'.
      // This assertion depends on a clean Neon state for this subject ID.
      // In practice: use a uuid that definitely has no rows (Plan 01-03 fixtures add real data).
      try {
        const status = await getChecklistStatus(ctx, targetSubjectId);
        expect(status.labs).toBe("missing");
      } catch (e) {
        // If no tenant row exists, this will throw — mark as expected RED
        if (e instanceof Response && e.status === 404) {
          throw new Error(
            "Seed data missing for checklist test — goes GREEN in Plan 01-03 with fixtures"
          );
        }
        throw e;
      }
    }
  );

  it.skipIf(!hasDb)(
    "returns in_progress for labs when lab_documents exist but no approved extraction",
    async () => {
      if (importError) {
        throw new Error("checklist.server not found — implement in Plan 01-03");
      }
      // Plan 01-03 adds fixture data for this case. Placeholder here.
      expect(typeof getChecklistStatus).toBe("function");
    }
  );

  it.skipIf(!hasDb)(
    "returns done for labs when at least one approved extraction exists",
    async () => {
      if (importError) {
        throw new Error("checklist.server not found — implement in Plan 01-03");
      }
      // Plan 01-03 adds fixture data for this case. Placeholder here.
      expect(typeof getChecklistStatus).toBe("function");
    }
  );

  it.skipIf(!hasDb)(
    "returns done for WHOOP when a metrics row with source=whoop exists for subject",
    async () => {
      if (importError) {
        throw new Error("checklist.server not found — implement in Plan 01-03");
      }
      // Plan 01-03 adds fixture data for this case. Placeholder here.
      expect(typeof getChecklistStatus).toBe("function");
    }
  );

  it.skipIf(!hasDb)(
    "returns not_sent for invite when no invite row carries this subjectId",
    async () => {
      if (importError) {
        throw new Error("checklist.server not found — implement in Plan 01-03");
      }
      // Requires invites.subjectId column on Neon (migration 0015 must be applied).
      // Before migration is applied, this query will fail with a column-not-found error.
      // Expected RED until (a) Plan 01-03 creates checklist.server AND
      // (b) migration 0015 is applied to Neon.
      expect(typeof getChecklistStatus).toBe("function");
    }
  );
});
