/**
 * invites-consume.test.ts — Behavioral contracts for the invite consume/resolve/revoke
 * path, verified against a mocked Drizzle db (no live DB required).
 *
 * These tests assert the CR-01 / WR-01 / WR-02 fixes at the unit seam:
 *   (a) resolveInviteByToken does a SELECT only — NEVER an UPDATE (no consume)
 *   (b) consumeInviteByToken writes consumedBy when a consuming user id is passed (WR-01)
 *   (c) revokeInvite returns { revoked: true } when a row changed, { revoked: false } when none (WR-02)
 *
 * The Drizzle query builder is mocked so we can observe which operations (select vs
 * update) run and capture the `.set()` payload + `.returning()` shape without a DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the Drizzle db ───────────────────────────────────────────────────────
// We record every select()/update() call and let the test control the rows each
// terminal (.limit / .returning) resolves to.
//
// The state + mockDb live inside vi.hoisted so they are initialised BEFORE the
// hoisted vi.mock factory runs (auth.server.ts calls getDb() at module load).

interface MockState {
  selectRows: unknown[];
  updateReturning: unknown[];
  updateSetPayloads: Record<string, unknown>[];
  selectCalls: number;
  updateCalls: number;
}

const { state, mockDb } = vi.hoisted(() => {
  const state: MockState = {
    selectRows: [],
    updateReturning: [],
    updateSetPayloads: [],
    selectCalls: 0,
    updateCalls: 0,
  };

  function makeSelectChain() {
    state.selectCalls += 1;
    const chain = {
      from: () => chain,
      where: () => chain,
      orderBy: () => Promise.resolve(state.selectRows),
      limit: () => Promise.resolve(state.selectRows),
    };
    return chain;
  }

  function makeUpdateChain() {
    state.updateCalls += 1;
    const chain = {
      set: (payload: Record<string, unknown>) => {
        state.updateSetPayloads.push(payload);
        return chain;
      },
      where: () => chain,
      returning: () => Promise.resolve(state.updateReturning),
    };
    return chain;
  }

  const mockDb = {
    select: () => makeSelectChain(),
    update: () => makeUpdateChain(),
    insert: () => ({ values: () => Promise.resolve(undefined) }),
  };

  return { state, mockDb };
});

vi.mock("~/lib/db.server", () => ({
  getDb: () => mockDb,
}));

// Import AFTER the mock is registered.
import {
  resolveInviteByToken,
  consumeInviteByToken,
  revokeInvite,
} from "~/lib/invites.server";

beforeEach(() => {
  state.selectRows = [];
  state.updateReturning = [];
  state.updateSetPayloads = [];
  state.selectCalls = 0;
  state.updateCalls = 0;
});

// ─────────────────────────────────────────────────────────────────────────────
// (a) resolveInviteByToken — NON-consuming
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveInviteByToken — validates without consuming (CR-01)", () => {
  it("returns the invite's role + tenantId on a valid token, with NO update (no consume)", async () => {
    state.selectRows = [{ role: "practitioner", tenantId: "tenant-xyz", subjectId: null }];

    const result = await resolveInviteByToken("some-valid-raw-token");

    expect(result).toEqual({ role: "practitioner", tenantId: "tenant-xyz", subjectId: null });
    // The critical assertion: resolve NEVER burns the token — zero UPDATE calls.
    expect(state.updateCalls).toBe(0);
    expect(state.selectCalls).toBe(1);
  });

  it("returns null (fail-closed) for an unknown/expired/consumed/revoked token, still no update", async () => {
    state.selectRows = []; // no matching row

    const result = await resolveInviteByToken("unknown-token");

    expect(result).toBeNull();
    expect(state.updateCalls).toBe(0);
  });

  it("CR-01 invariant: resolve-then-fail leaves the token still consumable (resolve never burns)", async () => {
    // Simulate the beforeSignUp gate: VALIDATE the token (resolve), then a downstream
    // signup failure — the token must NOT have been burned, so a later consume succeeds.
    state.selectRows = [{ role: "client", tenantId: "tenant-q", subjectId: "subj-1" }];

    const resolved = await resolveInviteByToken("token-q");
    expect(resolved).toEqual({ role: "client", tenantId: "tenant-q", subjectId: "subj-1" });
    expect(state.updateCalls).toBe(0); // resolve did NOT burn

    // Now the (retried) signup reaches the user-write step and consumes for real.
    state.updateReturning = [{ id: "invite-q" }];
    const burned = await consumeInviteByToken("token-q", "user-q");
    expect(burned).toEqual({ role: "client", tenantId: "tenant-q", subjectId: "subj-1" });
    expect(state.updateCalls).toBe(1); // exactly one burn, at write time
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (b) consumeInviteByToken — writes consumedBy (WR-01)
// ─────────────────────────────────────────────────────────────────────────────

describe("consumeInviteByToken — records consumedBy (WR-01)", () => {
  it("sets consumedAt AND consumedBy when a consuming user id is supplied", async () => {
    state.selectRows = [{ role: "client", tenantId: "tenant-abc", subjectId: "subj-abc" }];
    state.updateReturning = [{ id: "invite-1" }]; // guarded UPDATE matched 1 row

    const result = await consumeInviteByToken("valid-token", "new-user-id-123");

    expect(result).toEqual({ role: "client", tenantId: "tenant-abc", subjectId: "subj-abc" });
    // One guarded UPDATE ran, and its payload recorded consumedBy + consumedAt.
    expect(state.updateCalls).toBe(1);
    const payload = state.updateSetPayloads[0];
    expect(payload).toBeDefined();
    expect(payload.consumedBy).toBe("new-user-id-123");
    expect(payload.consumedAt).toBeInstanceOf(Date);
  });

  it("still consumes (consumedAt) when no user id is supplied, leaving consumedBy unset", async () => {
    state.selectRows = [{ role: "client", tenantId: "tenant-abc", subjectId: null }];
    state.updateReturning = [{ id: "invite-2" }];

    const result = await consumeInviteByToken("valid-token");

    expect(result).toEqual({ role: "client", tenantId: "tenant-abc", subjectId: null });
    const payload = state.updateSetPayloads[0];
    expect(payload.consumedAt).toBeInstanceOf(Date);
    // consumedBy omitted (undefined) when no id is provided.
    expect(payload.consumedBy).toBeUndefined();
  });

  it("returns null when the guarded UPDATE matches 0 rows (concurrent double-redeem)", async () => {
    state.selectRows = [{ role: "client", tenantId: "tenant-abc", subjectId: null }];
    state.updateReturning = []; // race: another request already consumed it

    const result = await consumeInviteByToken("valid-token", "user-x");

    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (c) revokeInvite — returns whether a row actually changed (WR-02)
// ─────────────────────────────────────────────────────────────────────────────

describe("revokeInvite — reports actual row change (WR-02)", () => {
  it("returns { revoked: true } when a row was updated", async () => {
    state.updateReturning = [{ id: "invite-1" }];

    const result = await revokeInvite({ id: "invite-1", tenantId: "tenant-a" });

    expect(result).toEqual({ revoked: true });
  });

  it("returns { revoked: false } when NO row matched (wrong/empty tenant — no silent success)", async () => {
    state.updateReturning = []; // tenant mismatch → 0 rows changed

    const result = await revokeInvite({ id: "invite-1", tenantId: "wrong-tenant" });

    expect(result).toEqual({ revoked: false });
  });
});
