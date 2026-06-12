import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { defineRequestState } from "@better-auth/core/context";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "./db.server";
import * as schema from "../../db/schema";
import { user as userTable, invites } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  resolveInviteByToken,
  consumeInviteByToken,
  hashToken,
} from "./invites.server";
import { insertAuthAuditLog } from "./audit.server";

// Mirror db.server.ts error-guard idiom for missing env vars.
// Better-Auth reads BETTER_AUTH_SECRET for session-cookie signing.
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Set it in your .env file or Vercel environment variables."
  );
}

// ── Request-scoped pending-invite state (CR-01) ───────────────────────────────
//
// Better-Auth wraps every endpoint dispatch in `runWithRequestState(new WeakMap())`
// (api/to-auth-endpoints.mjs) — so the beforeSignUp middleware hook AND the
// databaseHooks.user.create.before/after hooks all execute inside the SAME
// AsyncLocalStorage scope for a single sign-up request. `defineRequestState` gives
// us a genuinely request-scoped slot (no module-global Map, no email-key landmine,
// no cross-instance bleed): the validated invite is threaded from the gate to the
// user-write step within one request and is impossible to read from another.
//
// We stash the RAW token (validated, not yet burned) plus the resolved role+tenant.
// The actual single-use burn happens in user.create.before — adjacent to the user
// row write — so a signup that fails (duplicate email, write error) never burns the
// token, and a resolved-but-unburnable invite fails closed (the hook throws).
interface PendingInvite {
  // Raw token to burn at write time. Empty string for the break-glass path
  // (break-glass injects role/tenant directly without burning a DB invite row).
  rawToken: string;
  role: string;
  tenantId: string;
  // true → break-glass bootstrap (no DB invite row to burn or attribute).
  breakGlass: boolean;
}
const pendingInvite = defineRequestState<PendingInvite | null>(() => null);

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

  // ── Database hooks: atomic consume + role/tenant injection (CR-01/WR-01) ─────
  //
  // create.before: BURN the invite adjacent to the user-row write, then inject the
  //   invite's role + tenantId onto the user. This is the ONLY path that can set a
  //   non-"client" role (role/tenantId are input:false — parseUserInput strips any
  //   client-supplied value, so the value MUST come from the consumed invite row,
  //   T-031-INV-4). Fail-closed: if a token was presented (pendingInvite set) but
  //   the burn returns null (raced/expired between validate and write), THROW
  //   FORBIDDEN so NO user is created — never a client/null-tenant fallthrough (CR-01).
  //
  // create.after: backfill consumedBy with the freshly-created user id (WR-01) — the
  //   id only exists post-create. Single-use integrity is already guaranteed by the
  //   create.before burn; this is the audit-attribution backfill.
  //   AUTH-04: also writes a 'sign-up' or 'invite-redeemed' auth event (best-effort).
  //
  // session.create.after: AUTH-04 — writes a 'sign-in' event (best-effort try/catch).
  // session.delete.after: AUTH-04 — writes a 'sign-out' event (best-effort try/catch).
  databaseHooks: {
    session: {
      create: {
        async after(session) {
          // AUTH-04: sign-in audit event. Resolve the user's tenantId via admin path.
          // Best-effort: a logging failure MUST NOT fail the auth flow (T-07-17).
          try {
            const db = getDb();
            const rows = await db
              .select({ tenantId: userTable.tenantId })
              .from(userTable)
              .where(eq(userTable.id, session.userId))
              .limit(1);
            const tenantId = rows[0]?.tenantId;
            if (tenantId) {
              await insertAuthAuditLog({
                userId: session.userId,
                action: 'sign-in',
                tenantId,
                entityId: session.id, // session token id — not a PHI value
              });
            }
          } catch {
            // Audit best-effort: never propagate into auth flow (T-07-17)
          }
        },
      },
      delete: {
        async after(session) {
          // AUTH-04: sign-out audit event. Best-effort — logging failure must not fail sign-out.
          try {
            const db = getDb();
            const rows = await db
              .select({ tenantId: userTable.tenantId })
              .from(userTable)
              .where(eq(userTable.id, session.userId))
              .limit(1);
            const tenantId = rows[0]?.tenantId;
            if (tenantId) {
              await insertAuthAuditLog({
                userId: session.userId,
                action: 'sign-out',
                tenantId,
                entityId: session.id,
              });
            }
          } catch {
            // Audit best-effort: never propagate into auth flow (T-07-17)
          }
        },
      },
    },
    user: {
      create: {
        async before(user) {
          const pending = await pendingInvite.get();
          if (!pending) {
            // No invite presented for this signup (non-sign-up create, or a
            // sign-up the gate already rejected). Leave role/tenant at defaults.
            return undefined;
          }

          // Break-glass (CR-02): no DB invite row to burn — inject the explicit
          // owner role + tenant directly. The gate already enforced first-user-only
          // and the presence of OWNER_TENANT_ID, so this is a usable account.
          if (pending.breakGlass) {
            return {
              data: {
                ...user,
                role: pending.role,
                tenantId: pending.tenantId,
              },
            };
          }

          // CR-01: burn the invite HERE, adjacent to the user-row write, so consume
          // and role-injection commit/abort together. A failed signup never burns.
          const burned = await consumeInviteByToken(pending.rawToken);
          if (!burned) {
            // Resolved earlier but unburnable now (concurrent redeem, just-expired,
            // just-revoked) → fail closed: abort the create entirely (T-031-INV-6).
            throw new APIError("FORBIDDEN", { message: "signup_disabled" });
          }

          return {
            data: {
              ...user,
              role: burned.role,
              tenantId: burned.tenantId,
            },
          };
        },
        async after(user) {
          // WR-01: attribute the consumed invite to the new user id (audit trail).
          // The id only exists post-create; single-use was already enforced by the
          // create.before burn, so this is a best-effort attribution backfill.
          const pending = await pendingInvite.get();
          // Clear the slot so a later create in the same request can't re-run this.
          await pendingInvite.set(null);

          const id =
            user && typeof (user as { id?: unknown }).id === "string"
              ? (user as { id: string }).id
              : null;

          // AUTH-04: write sign-up / invite-redeemed audit event (best-effort).
          // tenantId comes from the pending invite resolved in beforeSignUp.
          // Break-glass also has a tenantId (OWNER_TENANT_ID), so we can always log.
          try {
            // Primary tenantId source: the pending invite (set in beforeSignUp).
            // Fallback: the user row (Better-Auth injects tenantId via additionalFields).
            const userAny = user as unknown as Record<string, unknown>;
            const tenantId =
              pending?.tenantId ??
              (typeof userAny?.["tenantId"] === "string" ? userAny["tenantId"] : null);
            if (id && tenantId) {
              const action = pending && !pending.breakGlass && pending.rawToken
                ? 'invite-redeemed'
                : 'sign-up';
              await insertAuthAuditLog({ userId: id, action, tenantId });
            }
          } catch {
            // Audit best-effort — never fail the signup over it (T-07-17)
          }

          // Break-glass has no DB invite row to attribute.
          if (!pending || pending.breakGlass || !pending.rawToken) return;
          if (!id) return;

          try {
            const db = getDb();
            // Target the just-consumed invite by its token hash; only set consumedBy
            // when still NULL (idempotent, never clobbers an existing attribution).
            await db
              .update(invites)
              .set({ consumedBy: id })
              .where(
                and(
                  eq(invites.tokenHash, hashToken(pending.rawToken)),
                  isNull(invites.consumedBy)
                )
              );
          } catch {
            // Audit backfill is best-effort — never fail the signup over it.
          }
        },
      },
    },
  },

  // ── beforeSignUp hook (D-07/D-01/T-03-open-signup, CR-01/CR-02) ──────────────
  //
  // Validates (does NOT burn) the invite up front. The burn happens later in
  // user.create.before so a failed signup never wastes the token (CR-01).
  //
  // Flow:
  //   1. BREAK-GLASS (D-07/CR-02): OWNER_INVITE_TOKEN is bootstrap-only and now
  //      HARDENED — it requires OWNER_TENANT_ID and only fires when no users exist
  //      yet (true first-user bootstrap). On success it stashes role:"owner" + that
  //      tenant so the account is actually usable. If OWNER_TENANT_ID is missing or
  //      users already exist, the break-glass token is REFUSED (fail-closed) — it
  //      can never mint a tenant-less dead-end account.
  //   2. Otherwise: resolveInviteByToken() (non-mutating). null → FORBIDDEN.
  //      Valid → stash { rawToken, role, tenantId } in request state for the
  //      create hooks to consume atomically.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // WR-06: fail closed against ANY sign-up surface (not just /sign-up/email).
      if (ctx.path.startsWith("/sign-up")) {
        const body = ctx.body as Record<string, unknown>;
        const token = body?.inviteToken;
        const ownerToken = process.env.OWNER_INVITE_TOKEN;

        // ── Step 1: Break-glass bootstrap (D-07/CR-02 hardened) ─────────────────
        if (
          typeof token === "string" &&
          !!ownerToken &&
          token.length === ownerToken.length &&
          timingSafeEqual(Buffer.from(token), Buffer.from(ownerToken))
        ) {
          const ownerTenantId = process.env.OWNER_TENANT_ID;

          // CR-02 (a): break-glass MUST have an explicit tenant. Without it the
          // account would be tenant-less and unusable — refuse rather than mint it.
          if (!ownerTenantId) {
            throw new APIError("FORBIDDEN", { message: "signup_disabled" });
          }

          // CR-02 (b): first-user-only. Break-glass is a bootstrap mechanism; once
          // any user exists it must not mint more accounts off a static secret.
          try {
            const db = getDb();
            const existing = await db
              .select({ id: userTable.id })
              .from(userTable)
              .limit(1);
            if (existing.length > 0) {
              throw new APIError("FORBIDDEN", { message: "signup_disabled" });
            }
          } catch (err) {
            // Re-throw FORBIDDEN; any DB error here also fails closed (T-031-INV-6).
            if (err instanceof APIError) throw err;
            throw new APIError("FORBIDDEN", { message: "signup_disabled" });
          }

          // Usable bootstrap account: role "owner" + the explicit owner tenant.
          // breakGlass:true tells create.before to inject directly (no DB invite
          // row to burn or attribute).
          await pendingInvite.set({
            rawToken: "",
            role: "owner",
            tenantId: ownerTenantId,
            breakGlass: true,
          });
          return;
        }

        // ── Step 2: Per-invite hashed token — VALIDATE only (CR-01) ─────────────
        // resolveInviteByToken does the full fail-closed check (unknown / consumed /
        // revoked / expired → null) WITHOUT marking the invite consumed. The burn
        // happens later in user.create.before so a failed signup never wastes it.
        let invite: { role: string; tenantId: string } | null = null;
        if (typeof token === "string") {
          try {
            invite = await resolveInviteByToken(token);
          } catch {
            throw new APIError("FORBIDDEN", { message: "signup_disabled" });
          }
        }

        if (!invite) {
          // Unknown, consumed, revoked, expired, or no token → fail closed.
          throw new APIError("FORBIDDEN", { message: "signup_disabled" });
        }

        // Stash the validated invite (raw token + resolved role/tenant) request-scoped.
        await pendingInvite.set({
          rawToken: token as string,
          role: invite.role,
          tenantId: invite.tenantId,
          breakGlass: false,
        });
      }
    }),
  },
});
