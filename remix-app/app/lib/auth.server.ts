import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "./db.server";
import * as schema from "../../db/schema";
import { consumeInviteByToken } from "./invites.server";

// Mirror db.server.ts error-guard idiom for missing env vars.
// Better-Auth reads BETTER_AUTH_SECRET for session-cookie signing.
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Set it in your .env file or Vercel environment variables."
  );
}

// ── Invite role/tenant registry ───────────────────────────────────────────────
//
// The beforeSignUp hook validates and consumes an invite token, then stashes the
// resolved { role, tenantId } in this Map keyed by the normalised email.
// The databaseHooks.user.create.before hook reads from this Map and injects the
// correct role + tenantId onto the user record before it is written to Postgres.
//
// This two-step dance is required because role has input:false — Better-Auth's
// parseUserInput() explicitly blocks any role value arriving in ctx.body, so the
// only way to set a non-default role at creation time is through a databaseHook
// that fires after parseUserInput() has already run (admin plugin uses the same
// pattern). The Map is keyed by email (lowercase), which is always unique at the
// moment of creation and is cleaned up immediately after use.
//
// Thread-safety: Node.js is single-threaded; Map access here is safe.
const pendingInviteRoles = new Map<string, { role: string; tenantId: string }>();

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema, // MUST include Better-Auth tables (user/session/account/verification) — Pitfall 2
  }),

  // AUTH-01: email/password sign-in enabled; invite-only gate enforced by the
  // beforeSignUp hook below (not disableSignUp, which blocks the owner seed).
  emailAndPassword: {
    enabled: true,
  },

  // AUTH-02: role additional field — users cannot self-assign (input:false closes T-03-role-self-assign).
  // Role and tenantId are assigned from the invite row server-side (T-031-INV-4):
  // the client-scoped token cannot mint a practitioner/owner; role comes from the
  // invite record, never from user input.
  user: {
    additionalFields: {
      role: {
        type: ["owner", "practitioner", "client"] as const,
        required: false,
        defaultValue: "client",
        input: false, // users cannot POST a role at signup/profile update
      },
      tenantId: {
        type: "string" as const,
        required: false,
        defaultValue: null,
        input: false, // users cannot POST a tenantId
      },
    },
  },

  // AUTH-01: stay signed in ~30 days; cookie cache reduces DB hits per request.
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // refresh session daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // cache for 5 minutes
    },
  },

  // ── Database hooks: inject invite-resolved role + tenantId ──────────────────
  //
  // Fires before any user row is written. Reads the pendingInviteRoles Map
  // (populated by the beforeSignUp hook below) and overrides the default
  // role ("client") + tenantId (null) with the values from the consumed invite.
  //
  // This is the ONLY path that can set a non-"client" role at signup:
  //   1. The role MUST come from the invite row (server-side, T-031-INV-4).
  //   2. The break-glass OWNER_INVITE_TOKEN path defaults to "client" (D-07/T-031-INV-7).
  //   3. A client-scoped token can never mint practitioner/owner.
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          const email =
            typeof user.email === "string" ? user.email.toLowerCase() : null;
          if (!email) return undefined;

          const pending = pendingInviteRoles.get(email);
          if (!pending) return undefined;

          // Clean up immediately — one-time use
          pendingInviteRoles.delete(email);

          return {
            data: {
              ...user,
              role: pending.role,
              tenantId: pending.tenantId,
            },
          };
        },
      },
    },
  },

  // ── beforeSignUp hook (D-07/D-01/T-03-open-signup) ───────────────────────────
  //
  // Rewritten: resolves per-invite hashed tokens instead of the single shared
  // OWNER_INVITE_TOKEN (Plan 03.1-02).
  //
  // Flow:
  //   1. BREAK-GLASS first (D-07): if OWNER_INVITE_TOKEN is set and the token
  //      timing-safe-equals it (bootstrap-only, no role escalation — T-031-INV-7).
  //      Role defaults to "client" on this path; no non-owner privilege opens.
  //   2. Otherwise: consume the invite token via consumeInviteByToken().
  //      If null (unknown / consumed / revoked / expired) → FORBIDDEN (fail-closed).
  //   3. On a valid invite: stash role + tenantId in pendingInviteRoles keyed by
  //      the normalised email; the databaseHook above injects them at creation time.
  //
  // Role assignment MUST go through the server hook (T-031-INV-4): the role comes
  // from the invite row, never from user input (ctx.body.role is blocked by input:false).
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // WR-06: fail closed against ANY sign-up surface (not just /sign-up/email).
      if (ctx.path.startsWith("/sign-up")) {
        const body = ctx.body as Record<string, unknown>;
        const token = body?.inviteToken;
        const ownerToken = process.env.OWNER_INVITE_TOKEN;

        // ── Step 1: Break-glass bootstrap fallback (D-07/T-031-INV-7) ──────────
        // Retained for bootstrap-only: an already-seeded owner can use this token
        // to permit a single additional signup. The role stays at its default
        // ("client") — this path NEVER mints a non-owner account with elevated role.
        // The break-glass check is timing-safe (length-checked + timingSafeEqual).
        if (
          typeof token === "string" &&
          !!ownerToken &&
          token.length === ownerToken.length &&
          timingSafeEqual(Buffer.from(token), Buffer.from(ownerToken))
        ) {
          // Bootstrap allowed — role defaults to "client" (no escalation). Return.
          return;
        }

        // ── Step 2: Per-invite hashed token lookup (D-07) ───────────────────────
        // consumeInviteByToken: hashes the token, queries the DB for a matching
        // un-consumed, un-revoked, non-expired row, marks it consumed (single-use),
        // and returns { role, tenantId } — or null on any failure (fail-closed).
        // Any exception inside consumeInviteByToken is caught internally and
        // returns null (T-031-INV-6: fail-closed on lookup error).
        let invite: { role: string; tenantId: string } | null = null;
        if (typeof token === "string") {
          try {
            invite = await consumeInviteByToken(token);
          } catch {
            // Re-throw as FORBIDDEN — never allow-through on error (T-031-INV-6)
            throw new APIError("FORBIDDEN", { message: "signup_disabled" });
          }
        }

        if (!invite) {
          // Unknown, consumed, revoked, expired, or no token provided → fail closed
          throw new APIError("FORBIDDEN", { message: "signup_disabled" });
        }

        // ── Step 3: Stash role + tenantId for the databaseHook ─────────────────
        // Role assignment MUST happen server-side via the databaseHook (T-031-INV-4).
        // We stash by normalised email; the databaseHook reads and deletes this entry.
        const email =
          typeof body.email === "string" ? body.email.toLowerCase() : null;
        if (email) {
          pendingInviteRoles.set(email, {
            role: invite.role,
            tenantId: invite.tenantId,
          });
        }
      }
    }),
  },
});
