/**
 * tests/lib/data.server.test.ts
 *
 * Unit tests for data.server.ts — verifies the exported function signatures
 * and module-level contracts (Phase 7 retrofit boundary: getDb isolated).
 *
 * These are static/structural tests that run in Node without a real DB —
 * they assert that all required exports exist and have the right shape.
 * Live-Neon integration tests for actual query behavior live in
 * tests/parity/loader-parity.test.ts (Plan 04).
 */

import { describe, it, expect } from "vitest";

describe("data.server.ts — module contract (DATA-01)", () => {
  it("exports all 9 required read functions", async () => {
    const mod = await import("../../app/lib/data.server");
    expect(typeof mod.getOwnerSubject).toBe("function");
    expect(typeof mod.getMetrics).toBe("function");
    expect(typeof mod.getProtocolVersions).toBe("function");
    expect(typeof mod.getProtocolChanges).toBe("function");
    expect(typeof mod.getMilestones).toBe("function");
    expect(typeof mod.getSupplements).toBe("function");
    expect(typeof mod.getCorrelations).toBe("function");
    expect(typeof mod.getCessationLog).toBe("function");
    expect(typeof mod.getSubjectGenotypes).toBe("function");
  });

  it("getOwnerSubject is an async function (returns a Promise)", async () => {
    const { getOwnerSubject } = await import("../../app/lib/data.server");
    // Calling with a fake tenantId will try to query — we stub the DB in test-setup.ts
    // so getDb() won't throw, but the query will fail at the network level.
    // We just verify it returns a Promise (is async), not the actual result.
    const result = getOwnerSubject("test-tenant-id");
    expect(result).toBeInstanceOf(Promise);
    // Swallow the expected network error from the stub DB
    await result.catch(() => {});
  });

  it("getMetrics is an async function", async () => {
    const { getMetrics } = await import("../../app/lib/data.server");
    const result = getMetrics("test-tenant-id", "test-subject-id");
    expect(result).toBeInstanceOf(Promise);
    await result.catch(() => {});
  });

  it("getMetrics accepts optional category parameter", async () => {
    const { getMetrics } = await import("../../app/lib/data.server");
    const result = getMetrics("test-tenant-id", "test-subject-id", "vitamins");
    expect(result).toBeInstanceOf(Promise);
    await result.catch(() => {});
  });
});
