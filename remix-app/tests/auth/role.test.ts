import { describe, it, expect } from "vitest";

// AUTH-02 — role additional-field contract.
//
// RED until Plan 03 creates remix-app/app/lib/auth.server.ts. Asserts the
// Better-Auth config exposes a `role` additionalField whose allowed values are
// exactly owner|practitioner|client and which is `input: false` so users cannot
// self-assign a role at sign-up / profile update (T-03-role-self-assign).
//
// Source: 03-RESEARCH.md § Pattern 1 (user.additionalFields.role:
//   { type: ["owner","practitioner","client"], input: false }).

import { auth } from "~/lib/auth.server";

describe("AUTH-02 role additional-field contract", () => {
  it("declares a role additionalField on the user config", () => {
    const role = auth.options.user.additionalFields.role;
    expect(role).toBeDefined();
  });

  it("allows exactly the owner|practitioner|client roles", () => {
    const role = auth.options.user.additionalFields.role;
    const allowed = role.type as readonly string[];
    expect(Array.isArray(allowed)).toBe(true);
    expect([...allowed].sort()).toEqual(
      ["client", "owner", "practitioner"]
    );
  });

  it("marks role input:false so users cannot self-assign", () => {
    const role = auth.options.user.additionalFields.role;
    expect(role.input).toBe(false);
  });
});
