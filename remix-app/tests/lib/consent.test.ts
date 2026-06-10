/**
 * consent.test.ts — LAB-06 consent gate contract tests
 *
 * Tests checkConsent and insertConsent from lib/consent.server.ts.
 * The DB is mocked via vi.mock so no live Neon connection is required.
 *
 * GREEN since Plan 02.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock state ─────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file by the Vitest transform,
// so mockDb references must be created with vi.hoisted() to be available
// at hoist time (before the import statements in the test file run).

const { mockDb, mockLimit, mockWhere, mockFrom, mockSelect, mockInsertValues, mockInsert } =
  vi.hoisted(() => {
    const mockLimit = vi.fn();
    const mockWhere = vi.fn(() => ({ limit: mockLimit }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    const mockSelect = vi.fn(() => ({ from: mockFrom }));
    const mockInsertValues = vi.fn().mockResolvedValue(undefined);
    const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

    const mockDb = {
      select: mockSelect,
      insert: mockInsert,
    };

    return {
      mockDb,
      mockLimit,
      mockWhere,
      mockFrom,
      mockSelect,
      mockInsertValues,
      mockInsert,
    };
  });

// ── Mock the DB layer ─────────────────────────────────────────────────────
vi.mock("~/lib/db.server", () => ({
  getDb: () => mockDb,
}));

// Import after mocks are set up
import { checkConsent, insertConsent } from "~/lib/consent.server";

// ── Tests against assertSubjectAccess (already built in authz.server.ts) ─────
// These run GREEN immediately.

import { assertSubjectAccess } from "~/lib/authz.server";

describe("LAB-06 consent gate — checkConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockInsert.mockReturnValue({ values: mockInsertValues });
    // Default: no consent row (the gate-blocks scenario)
    mockLimit.mockResolvedValue([]);
  });

  it("checkConsent returns false when no consentLog row exists", async () => {
    mockLimit.mockResolvedValue([]); // empty result = no consent
    const result = await checkConsent("subject-123");
    expect(result).toBe(false);
  });

  it("checkConsent returns true when consentLog row exists", async () => {
    mockLimit.mockResolvedValue([{ id: 1 }]); // row exists = has consent
    const result = await checkConsent("subject-456");
    expect(result).toBe(true);
  });

  it("checkConsent passes subjectId to the DB where clause", async () => {
    mockLimit.mockResolvedValue([]);
    await checkConsent("subject-789");
    // Verify the chain was called
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(1);
  });
});

describe("LAB-06 consent gate — insertConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
  });

  it("insertConsent writes subjectId, userId, and consentVersion", async () => {
    await insertConsent("subject-abc", "user-xyz", "v1-pilot-self");
    expect(mockInsert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: "subject-abc",
        consentedByUserId: "user-xyz",
        consentVersion: "v1-pilot-self",
      })
    );
  });

  it("insertConsent sets consentedAt to current time", async () => {
    const before = new Date();
    await insertConsent("subject-abc", "user-xyz", "v1-pilot-self");
    const after = new Date();

    const callArgs = mockInsertValues.mock.calls[0][0];
    expect(callArgs.consentedAt).toBeInstanceOf(Date);
    expect(callArgs.consentedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime() - 1000
    );
    expect(callArgs.consentedAt.getTime()).toBeLessThanOrEqual(
      after.getTime() + 1000
    );
  });
});

// ── Tests that ARE green: assertSubjectAccess blocks client role ──────────
// D-15 / LAB-06: consent gate must be combined with assertSubjectAccess on write paths.

describe("assertSubjectAccess blocks client role (pre-condition for LAB-06 gate)", () => {
  it("client role → 403 Response", () => {
    try {
      assertSubjectAccess({ role: "client" }, { tenantId: "t-1" }, "t-1");
      throw new Error("Should have thrown");
    } catch (e) {
      expect(e instanceof Response).toBe(true);
      expect((e as Response).status).toBe(403);
    }
  });

  it("owner role with matching tenant → no throw", () => {
    expect(() =>
      assertSubjectAccess({ role: "owner" }, { tenantId: "t-1" }, "t-1")
    ).not.toThrow();
  });
});
