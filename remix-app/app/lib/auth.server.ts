import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "./db.server";
import * as schema from "../../db/schema";

// Mirror db.server.ts error-guard idiom for missing env vars.
// Better-Auth reads BETTER_AUTH_SECRET for session-cookie signing.
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Set it in your .env file or Vercel environment variables."
  );
}

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
  user: {
    additionalFields: {
      role: {
        type: ["owner", "practitioner", "client"] as const,
        required: false,
        defaultValue: "client",
        input: false, // users cannot POST a role at signup/profile update
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

  // D-01 / T-03-open-signup: invite-only gate — blocks /sign-up unless a valid
  // invite token is present. The seed script passes OWNER_INVITE_TOKEN to satisfy
  // this hook (Pitfall 5). Better-Auth owns password hashing + session token
  // generation — never hand-rolled (V6).
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // WR-06: fail closed against ANY sign-up surface (not just /sign-up/email),
      // and use a length-checked constant-time compare for the invite secret.
      if (ctx.path.startsWith("/sign-up")) {
        const body = ctx.body as Record<string, unknown>;
        const token = body?.inviteToken;
        const ownerToken = process.env.OWNER_INVITE_TOKEN;
        const ok =
          typeof token === "string" &&
          !!ownerToken &&
          token.length === ownerToken.length &&
          timingSafeEqual(Buffer.from(token), Buffer.from(ownerToken));
        if (!ok) {
          throw new APIError("FORBIDDEN", { message: "signup_disabled" });
        }
      }
    }),
  },
});
