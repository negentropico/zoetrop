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
 *   - Pass OWNER_INVITE_TOKEN so the beforeSignUp break-glass hook passes.
 *   - CR-02: the hardened break-glass requires OWNER_TENANT_ID and first-user-only.
 *     This script sets process.env.OWNER_TENANT_ID = <freshly created tenant id>
 *     BEFORE signUpEmail, so the break-glass branch stashes role:"owner" + that
 *     tenant and the new account is USABLE the moment it is created (no tenant-less
 *     dead-end). The post-signup UPDATE below is now a belt-and-suspenders no-op
 *     (the hook already set role+tenant) kept for resilience/idempotency.
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

// CR-02: the hardened break-glass branch in auth.server.ts requires OWNER_TENANT_ID
// to mint a usable owner account. We set it to the freshly-created tenant id here,
// BEFORE signUpEmail reads it in the beforeSignUp hook, so the bootstrap account is
// created with role:"owner" + this tenant (no tenant-less dead-end).
process.env.OWNER_TENANT_ID = tenantId;

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

// ── 5. Ensure role "owner" + tenant (idempotent belt-and-suspenders) ─────────
//
// CR-02: with OWNER_TENANT_ID set above, the hardened break-glass hook ALREADY
// created this user as role:"owner" + tenantId. This UPDATE is now a no-op in the
// happy path, retained for resilience (e.g. if the hook's first-user check raced)
// and idempotency. additionalFields.role is input:false (server-side only).

await db
  .update(user)
  .set({ role: "owner", tenantId })
  .where(eq(user.email, OWNER_EMAIL));
console.log(`[seed-owner] Role confirmed "owner", tenantId=${tenantId} for ${OWNER_EMAIL}`);

// ── 6. Print IDs for manual verification ─────────────────────────────────────

console.log("");
console.log("[seed-owner] Seed complete. IDs for backfill verification:");
console.log(`  tenantId:  ${tenantId}`);
console.log(`  subjectId: ${subjectId}`);
console.log("");
console.log(
  "[seed-owner] Run 'npm run db:migrate' next to apply migrations 0003 (backfill) and 0004 (NOT NULL + index + constraint)."
);
