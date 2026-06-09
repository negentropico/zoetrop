import { describe, it, expect } from "vitest";

// D-01 — invite-only signup gate.
//
// RED until Plan 03 wires the beforeSignUp hook in auth.server.ts. Asserts that
// driving sign-up with a bogus inviteToken is rejected with a 403-shaped error
// (Better-Auth APIError FORBIDDEN). The hook validates ctx.body.inviteToken
// against process.env.OWNER_INVITE_TOKEN; a wrong/absent token is forbidden
// (T-03-open-signup). The real OWNER_INVITE_TOKEN is never embedded here — the
// contract is that a *wrong* token is refused, which holds regardless of the
// real secret's value.
//
// Source: 03-RESEARCH.md § Code Examples (Invite-Only Gate Hook),
//   § Pattern 1 (createAuthMiddleware before hook → APIError "FORBIDDEN").

// @ts-expect-error — ~/lib/auth.server does not exist until Plan 03 (Wave-0 red contract)
import { auth } from "~/lib/auth.server";

interface ForbiddenShape {
  status?: string | number;
  statusCode?: number;
  body?: { message?: string };
}

describe("D-01 invite-only signup gate", () => {
  it("rejects sign-up carrying a bogus invite token with a 403-shaped error", async () => {
    let thrown: unknown;
    try {
      await auth.api.signUpEmail({
        body: {
          email: "intruder@example.com",
          password: "not-a-real-password-123",
          name: "Intruder",
          // Deliberately wrong token — must never match OWNER_INVITE_TOKEN.
          inviteToken: "definitely-not-the-owner-invite-token",
        },
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeDefined();

    const e = thrown as ForbiddenShape;
    // Better-Auth APIError("FORBIDDEN") surfaces a 403 status / FORBIDDEN code.
    const is403 =
      e.status === "FORBIDDEN" ||
      e.status === 403 ||
      e.statusCode === 403;
    expect(is403).toBe(true);
  });
});
