/**
 * authz.test.ts — Fail-closed authorization helpers
 *
 * Tests the requireRole, assertSubjectAccess, can, and CAPABILITIES exports from
 * app/lib/authz.server.ts. Covers every behavior case in the plan threat model
 * (T-031-AZ-1 through T-031-AZ-3).
 *
 * Node environment (no jsdom pragma) — authz helpers are server-only.
 */
import { describe, it, expect } from "vitest";
import {
  requireRole,
  assertSubjectAccess,
  CAPABILITIES,
  can,
} from "~/lib/authz.server";

// ─── requireRole ─────────────────────────────────────────────────────────────

describe("requireRole", () => {
  it("throws 403 Response when user.role is 'client' and only 'owner' is allowed", async () => {
    let thrown: unknown;
    try {
      requireRole({ role: "client" }, ["owner"]);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
  });

  it("returns void (no throw) when user.role is 'practitioner' and ['owner','practitioner'] are allowed", () => {
    expect(() =>
      requireRole({ role: "practitioner" }, ["owner", "practitioner"])
    ).not.toThrow();
  });

  it("throws 403 when user.role is null (fail-closed on missing role) — T-031-AZ-1", async () => {
    let thrown: unknown;
    try {
      requireRole({ role: null }, ["owner"]);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
  });

  it("throws 403 when user.role is undefined (fail-closed on missing role)", async () => {
    let thrown: unknown;
    try {
      requireRole({ role: undefined }, ["owner"]);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
  });

  it("returns void when user.role === 'owner' and 'owner' is in allowed list", () => {
    expect(() => requireRole({ role: "owner" }, ["owner"])).not.toThrow();
  });
});

// ─── assertSubjectAccess ──────────────────────────────────────────────────────

describe("assertSubjectAccess", () => {
  const tenantA = "tenant-a";
  const tenantB = "tenant-b";

  it("throws 403 when user.role is 'client' — clients cannot access subjects", async () => {
    let thrown: unknown;
    try {
      assertSubjectAccess({ role: "client" }, { tenantId: tenantA }, tenantA);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
  });

  it("throws 403 when subject.tenantId differs from userTenantId — no IDOR / cross-tenant — T-031-AZ-2", async () => {
    let thrown: unknown;
    try {
      assertSubjectAccess(
        { role: "practitioner" },
        { tenantId: tenantB },
        tenantA
      );
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
  });

  it("returns void for a practitioner whose tenant matches the subject's tenant", () => {
    expect(() =>
      assertSubjectAccess(
        { role: "practitioner" },
        { tenantId: tenantA },
        tenantA
      )
    ).not.toThrow();
  });

  it("returns void for an owner whose tenant matches the subject's tenant", () => {
    expect(() =>
      assertSubjectAccess({ role: "owner" }, { tenantId: tenantA }, tenantA)
    ).not.toThrow();
  });
});

// ─── CAPABILITIES + can ───────────────────────────────────────────────────────

describe("CAPABILITIES and can()", () => {
  it("owner can invite:practitioner", () => {
    expect(can({ role: "owner" }, "invite:practitioner")).toBe(true);
  });

  it("practitioner cannot invite:practitioner (only clients)", () => {
    expect(can({ role: "practitioner" }, "invite:practitioner")).toBe(false);
  });

  it("client cannot invite:client (no invite capability)", () => {
    expect(can({ role: "client" }, "invite:client")).toBe(false);
  });

  it("fails closed for unknown role: { role: undefined } has no admin:settings — T-031-AZ-3", () => {
    expect(can({ role: undefined }, "admin:settings")).toBe(false);
  });

  it("owner has all three capabilities (invite:practitioner, invite:client, admin:settings)", () => {
    expect(CAPABILITIES.owner).toContain("invite:practitioner");
    expect(CAPABILITIES.owner).toContain("invite:client");
    expect(CAPABILITIES.owner).toContain("admin:settings");
  });

  it("practitioner can invite:client and has admin:settings", () => {
    expect(CAPABILITIES.practitioner).toContain("invite:client");
    expect(CAPABILITIES.practitioner).toContain("admin:settings");
  });

  it("client has empty capabilities array", () => {
    expect(CAPABILITIES.client).toHaveLength(0);
  });
});
