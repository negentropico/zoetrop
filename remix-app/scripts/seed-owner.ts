/**
 * Owner seed script: creates the tenancy spine (tenant + subject) and the owner
 * user account in the live Neon DB.
 *
 * Run from remix-app/:
 *   npm run db:seed-owner
 *
 * Required env vars:
 *   DATABASE_URL (or DATABASE_URL_UNPOOLED / NETLIFY_DATABASE_URL)
 *   OWNER_EMAIL
 *   OWNER_PASSWORD
 *   OWNER_INVITE_TOKEN
 *   OWNER_NAME (optional, defaults to "Owner")
 *
 * Idempotent: if a user with OWNER_EMAIL already exists, the script exits
 * early without modifying anything.
 *
 * CONFIRMED seed path (03-RESEARCH Open Questions Q1, RESOLVED):
 *   - Do NOT hand-insert raw password hashes into user/account.
 *   - Use auth.api.signUpEmail() so Better-Auth owns password hashing +
 *     the user/account write (V6 — never hand-roll cryptography).
 *   - Pass OWNER_INVITE_TOKEN so the beforeSignUp invite hook (Pitfall 5) passes.
 *   - Elevate role to "owner" via a direct Drizzle UPDATE after sign-up
 *     (additionalFields default is 'client'; input:false blocks self-assignment).
 */

import { getDb } from "../app/lib/db.server";
import { auth } from "../app/lib/auth.server";
import { tenants, subjects, user } from "../db/schema";
import { eq } from "drizzle-orm";

// ── 1. Validate required env vars ────────────────────────────────────────────

const OWNER_EMAIL = process.env.OWNER_EMAIL;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD;
const OWNER_INVITE_TOKEN = process.env.OWNER_INVITE_TOKEN;
const OWNER_NAME = process.env.OWNER_NAME ?? "Owner";

if (!OWNER_EMAIL) {
  throw new Error("OWNER_EMAIL env var is required — set it before running db:seed-owner.");
}
if (!OWNER_PASSWORD) {
  throw new Error("OWNER_PASSWORD env var is required — set it before running db:seed-owner.");
}
if (!OWNER_INVITE_TOKEN) {
  throw new Error(
    "OWNER_INVITE_TOKEN env var is required — set it before running db:seed-owner (satisfies the invite-only gate, Pitfall 5)."
  );
}

// ── 2. Idempotency check ──────────────────────────────────────────────────────

const db = getDb();

const existingUsers = await db
  .select({ id: user.id, email: user.email })
  .from(user)
  .where(eq(user.email, OWNER_EMAIL))
  .limit(1);

if (existingUsers.length > 0) {
  console.log(`[seed-owner] Owner already exists (email=${OWNER_EMAIL}). Nothing to do.`);
  process.exit(0);
}

// ── 3. Create tenancy spine ───────────────────────────────────────────────────

const tenantId = crypto.randomUUID();
const subjectId = crypto.randomUUID();

await db.insert(tenants).values({
  id: tenantId,
  name: "Owner Tenant",
});
console.log(`[seed-owner] Tenant created: id=${tenantId}`);

await db.insert(subjects).values({
  id: subjectId,
  tenantId,
  displayName: OWNER_NAME,
});
console.log(`[seed-owner] Subject created: id=${subjectId}, tenantId=${tenantId}`);

// ── 4. Create the owner USER through Better-Auth ─────────────────────────────
//
// auth.api.signUpEmail() is the CONFIRMED path — Better-Auth owns:
//   • Password hashing (argon2 / bcrypt)
//   • The `user` row write
//   • The matching `account` row write (providerId="credential")
// Passing inviteToken satisfies the beforeSignUp hook (Pitfall 5).

// The signUpEmail body type is a Zod intersection with ZodRecord<string, any>,
// which accepts arbitrary extra fields at runtime (the hook reads `inviteToken`
// from ctx.body). The TypeScript metadata type narrows to known fields only, so
// we cast the body to include inviteToken without losing other type safety.
await auth.api.signUpEmail({
  body: {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    name: OWNER_NAME,
    ...({ inviteToken: OWNER_INVITE_TOKEN } as Record<string, unknown>), // satisfies invite-only gate (D-01, Pitfall 5)
  },
});
console.log(`[seed-owner] Owner user created via Better-Auth: email=${OWNER_EMAIL}`);

// ── 5. Elevate role to "owner" ────────────────────────────────────────────────
//
// additionalFields.role defaults to 'client'; input:false blocks self-assignment
// (T-03-owner-elevation accepted: server-side only, not reachable via HTTP).

await db
  .update(user)
  .set({ role: "owner", tenantId })
  .where(eq(user.email, OWNER_EMAIL));
console.log(`[seed-owner] Role elevated to "owner", tenantId set to ${tenantId} for ${OWNER_EMAIL}`);

// ── 6. Print IDs for manual verification ─────────────────────────────────────

console.log("");
console.log("[seed-owner] Seed complete. IDs for backfill verification:");
console.log(`  tenantId:  ${tenantId}`);
console.log(`  subjectId: ${subjectId}`);
console.log("");
console.log(
  "[seed-owner] Run 'npm run db:migrate' next to apply migrations 0003 (backfill) and 0004 (NOT NULL + index + constraint)."
);
