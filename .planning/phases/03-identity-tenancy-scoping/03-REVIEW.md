---
phase: 03-identity-tenancy-scoping
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - remix-app/app/lib/auth.server.ts
  - remix-app/app/lib/auth-client.ts
  - remix-app/app/routes/api.auth.$.ts
  - remix-app/app/routes/_app/layout.tsx
  - remix-app/app/routes/auth/login.tsx
  - remix-app/app/routes/auth/logout.tsx
  - remix-app/app/routes/landing.tsx
  - remix-app/app/routes/_app/dashboard.tsx
  - remix-app/app/routes.ts
  - remix-app/app/root.tsx
  - remix-app/db/schema.ts
  - remix-app/db/auth-schema.ts
  - remix-app/scripts/seed-owner.ts
  - remix-app/migrations/0001_better_auth_and_tenancy_spine.sql
  - remix-app/migrations/0002_tenancy_columns_nullable.sql
  - remix-app/migrations/0003_tenancy_backfill.sql
  - remix-app/migrations/0004_tenancy_not_null.sql
  - remix-app/app/test-setup.ts
  - remix-app/vite.config.ts
  - remix-app/tests/auth/session.test.ts
  - remix-app/tests/auth/role.test.ts
  - remix-app/tests/auth/invite.test.ts
  - remix-app/tests/routes/auth-layout.test.ts
  - remix-app/tests/db/schema-columns.test.ts
  - remix-app/tests/db/constraints.test.ts
findings:
  critical: 3
  warning: 6
  info: 4
  total: 13
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-06-09
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Phase 3 introduces Better-Auth email/password sign-in, an invite-only `beforeSignUp` gate, a `role` additional field with `input:false`, an authenticated layout loader, an owner seed script, and an expand-contract tenancy migration. The session-validation core (`getSession({ headers })`, the layout redirect, `input:false` on `role`, and the invite hook) is structurally sound and matches the asserted contracts.

However, three BLOCKERs were found: (1) **logout does not clear the browser session cookie**, leaving the user authenticated for up to the 5-minute cookie-cache window after sign-out; (2) the **expand-contract migration sequence deadlocks on the existing populated production DB** — `db:migrate` runs the backfill (0003) and `SET NOT NULL` (0004) in the same pass before the seed can run, so the `NOT NULL` constraint fails on un-backfilled rows; (3) the **owner seed script never loads `.env`**, so `npm run db:seed-owner` throws on every required-env-var guard despite the values existing in `.env`. The invite gate and role-elevation paths are otherwise correct. Warnings cover the seed's lack of transactional/atomic rollback, the wordmark linking authenticated users back to the public surface, and a backfill that silently no-ops when the spine is absent.

## Critical Issues

### CR-01: Logout does not clear the session cookie — user stays authenticated after sign-out

**File:** `remix-app/app/routes/auth/logout.tsx:8-9`
**Issue:** The action calls `auth.api.signOut({ headers: request.headers, asResponse: false })` and then issues its own `throw redirect("/login")`. With `asResponse: false`, Better-Auth returns the parsed result and the cookie-clearing `Set-Cookie` header it generates is **discarded** — the redirect response carries no `Set-Cookie`, so the browser keeps the signed session cookie. Combined with `session.cookieCache.enabled` + `maxAge: 60 * 5` in `auth.server.ts:43-46`, `getSession` trusts the still-present signed cookie for up to 5 minutes **without a DB lookup**. Result: after "logging out," a user who navigates back to `/dashboard` is treated as authenticated by the `_app/layout.tsx` loader for up to 5 minutes (and the cookie itself persists indefinitely in the browser even after the cache window, so the next `getSession` only fails once it falls through to the deleted DB row). This is a real auth defect — sign-out does not actually sign the user out of the browser. Contrast with `login.tsx:19-29`, which correctly uses `asResponse: true` and forwards `response.headers`.
**Fix:**
```ts
export async function action({ request }: ActionFunctionArgs) {
  const response = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  // Forward Better-Auth's cookie-clearing Set-Cookie header on the redirect.
  throw redirect("/login", { headers: response.headers });
}
```

### CR-02: Expand-contract migration deadlocks on the populated production DB — `SET NOT NULL` fails before the seed can backfill

**File:** `remix-app/migrations/0003_tenancy_backfill.sql:11-12`, `remix-app/migrations/0004_tenancy_not_null.sql:12-27`, `remix-app/migrations/meta/_journal.json`
**Issue:** The journal bundles migrations `0001`→`0002`→`0003`→`0004` as pending. `npm run db:migrate` (`drizzle-kit migrate`) applies **all** pending migrations in a single invocation — there is no way to stop after `0002`. The documented intent (seed-owner.ts:124-126: "Run `npm run db:migrate` next to apply migrations 0003 (backfill) and 0004") requires the owner seed to run **between** `0002` and `0003` so the `tenants`/`subjects` spine rows exist. But the seed cannot run until `0001` creates the `user`/`tenants`/`subjects` tables, and once you invoke `db:migrate` it does not pause — it runs straight through `0004`.

On the existing **populated** production DB (migration `0000` already applied; real metrics/supplements/cessation data present — the dashboard loads it), the single `db:migrate` pass does: `0003` runs `SELECT id INTO v_tenant_id FROM tenants LIMIT 1` → returns `NULL` (no seed yet) → `UPDATE ... SET tenant_id = NULL ... WHERE tenant_id IS NULL` is a no-op → then `0004` runs `ALTER COLUMN tenant_id SET NOT NULL` on tables still full of NULLs → **migration aborts with a NOT NULL violation**. The expand-contract sequence cannot complete in one `db:migrate` on any DB that already holds data, which is precisely the n=1 production case this phase targets.
**Fix:** Decouple the contract step from the bundled run. Either (a) make the seed a migration step itself (a `0003a` data migration that creates the spine via SQL before backfill), or (b) split the run explicitly and document it as two commands the operator must run in order:
```bash
# 1. Apply schema-expand migrations only (stop before backfill).
npx drizzle-kit migrate --to 0002_tenancy_columns_nullable
# 2. Seed the spine + owner (now tables exist, no NOT NULL yet).
npm run db:seed-owner
# 3. Apply backfill + contract migrations.
npx drizzle-kit migrate
```
At minimum, `0004` must not be in the same journal-pending batch as `0003` unless the spine is guaranteed to exist first. The current seed-script note describes a sequence the tooling cannot execute as-is.

### CR-03: Owner seed script never loads `.env` — every run throws on the required-env-var guards

**File:** `remix-app/scripts/seed-owner.ts:34-49`, `remix-app/package.json` (`db:seed-owner`)
**Issue:** The seed reads `process.env.OWNER_EMAIL` / `OWNER_PASSWORD` / `OWNER_INVITE_TOKEN` and throws if any is unset. The values exist in `remix-app/.env`, but the npm script is `tsx scripts/seed-owner.ts` — `tsx` (4.x) does **not** auto-load `.env`, there is no `dotenv` dependency, and the script has no `import "dotenv/config"`. (Vite loads `.env` for `dev`/`build`, but a standalone `tsx` invocation does not.) So `npm run db:seed-owner` throws `OWNER_EMAIL env var is required` on a clean shell even though `.env` is fully populated, and the same applies to `BETTER_AUTH_SECRET` / `DATABASE_URL` consumed transitively via `auth.server.ts` and `db.server.ts`. The seed is non-functional as wired.
**Fix:** Load `.env` before reading any env var. Either add the flag to the script:
```jsonc
// package.json
"db:seed-owner": "tsx --env-file=.env scripts/seed-owner.ts",
```
or import a loader at the very top of `seed-owner.ts` (before the `getDb`/`auth` imports, since those also read env at module load):
```ts
import "dotenv/config"; // requires adding the dotenv dependency
```
Note ordering: `auth.server.ts:9` and `db.server.ts:15` evaluate env vars at **import time**, so the loader must run before those imports resolve — prefer the `--env-file` flag, which guarantees env is populated before any module evaluates.

## Warnings

### WR-01: Seed script is not atomic — a failure after spine creation leaves orphan tenant/subject rows and breaks idempotency

**File:** `remix-app/scripts/seed-owner.ts:71-103`
**Issue:** The script inserts the `tenants` row (71-75), then the `subjects` row (77-81), then calls `auth.api.signUpEmail` (96-103). These are separate statements with no transaction. If `signUpEmail` throws (e.g., invite-token mismatch, DB hiccup, password-policy rejection), the tenant and subject rows are already committed. On the next run, the idempotency check (55-64) only looks at `user.email` — it finds no user, so it proceeds to insert **another** tenant + subject pair, accumulating orphan spine rows. The backfill migration (`0003`) then does `SELECT id FROM tenants LIMIT 1` and may bind to the wrong (orphaned) tenant.
**Fix:** Wrap steps 3–5 in a single `db.transaction(async (tx) => { ... })` so a failure rolls back the spine. Alternatively, gate spine creation on the same idempotency check and resolve the existing spine if a partial run is detected.

### WR-02: Backfill silently binds to an arbitrary tenant/subject and no-ops when the spine is missing

**File:** `remix-app/migrations/0003_tenancy_backfill.sql:11-21`
**Issue:** `SELECT id INTO v_tenant_id FROM tenants LIMIT 1` (no `ORDER BY`) picks an arbitrary tenant; with the WR-01 orphan scenario there can be more than one. If no tenant exists (seed not run), `v_tenant_id`/`v_subject_id` are `NULL` and every `UPDATE ... WHERE tenant_id IS NULL` sets `tenant_id = NULL` — a silent no-op that gives no signal that the backfill accomplished nothing (the failure only surfaces later in `0004` as a NOT NULL violation, per CR-02). The migration also assumes the single-subject n=1 case implicitly (`subjects WHERE tenant_id = v_tenant_id LIMIT 1`).
**Fix:** Add a guard that fails loudly if the spine is absent, so the operator learns the seed must run first:
```sql
IF v_tenant_id IS NULL OR v_subject_id IS NULL THEN
  RAISE EXCEPTION 'Tenancy spine not found — run db:seed-owner before this backfill migration.';
END IF;
```

### WR-03: Authenticated wordmark links to the public landing page, not the dashboard

**File:** `remix-app/app/components/ui/Wordmark.tsx:10`
**Issue:** `Wordmark` (rendered inside `AppShell` → `TopNav`, which only wraps authenticated `_app` routes) links `to="/"`. Route `/` is now the **public** `routes/landing.tsx` (per `routes.ts:5`), which has no loader and no AppShell. An authenticated user clicking the brand wordmark is dropped onto the unauthenticated marketing page instead of `/dashboard`. Pre-Phase-3 `/` was the app home; the home→dashboard move was not reflected in this in-shell link. (`landing.tsx` also has no loader to bounce already-authenticated users to `/dashboard`, compounding the dead-end.)
**Fix:** Point the in-shell wordmark at the dashboard: `to="/dashboard"`. Optionally add a loader to `landing.tsx` that redirects authenticated sessions to `/dashboard` for consistency with `login.tsx:7-9`.

### WR-04: Login action does not validate that email/password are present before calling Better-Auth

**File:** `remix-app/app/routes/auth/login.tsx:14-22`
**Issue:** `formData.get("email") as string` / `formData.get("password") as string` cast to `string` but `FormData.get` returns `string | File | null`. If the fields are absent (a crafted POST bypassing the HTML form, which only enforces `required` client-side), these are `null` cast to `string`. `signInEmail` is then called with `{ email: null, password: null }`. Behavior depends on Better-Auth's input validation; at best it returns a non-ok response (handled), at worst it throws an unhandled error that escapes the action (no try/catch) and surfaces as a 500 rather than the intended "Invalid credentials". The `as string` assertion hides the `null` case from the type checker.
**Fix:** Validate before the call:
```ts
const email = formData.get("email");
const password = formData.get("password");
if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
  return { error: "Invalid credentials" };
}
```
Also consider wrapping `signInEmail` in try/catch so a thrown auth error returns the friendly error instead of a 500.

### WR-05: `redirectTo` from query/form is an open-redirect vector — unvalidated before `redirect()`

**File:** `remix-app/app/routes/auth/login.tsx:17,29` and `_app/layout.tsx:15`
**Issue:** The login action redirects to `redirectTo` taken verbatim from the `redirect` form field, which is populated from the `?redirect=` query param (`login.tsx:35`, set by the layout loader at `_app/layout.tsx:15`). While the layout loader only ever writes `url.pathname` (a same-origin path), the **login action trusts whatever arrives in the form field** — an attacker can craft `https://zoetrop.vercel.app/login?redirect=https://evil.example/phish`, the value round-trips through the hidden input, and the post-login `throw redirect(redirectTo)` sends the freshly-authenticated user off-site (open redirect / phishing handoff). The layout loader writing only `pathname` does not protect the action, which is independently reachable.
**Fix:** Allow only same-origin absolute paths:
```ts
const raw = (formData.get("redirect") as string) || "/dashboard";
const redirectTo = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
```

### WR-06: Invite hook reads `inviteToken` with a non-constant-time comparison and a brittle path check

**File:** `remix-app/app/lib/auth.server.ts:54-63`
**Issue:** Two sub-issues. (1) `token !== ownerToken` is a plain string compare; while the invite token is a deployment secret rather than a per-request credential, a timing-safe compare (`crypto.timingSafeEqual`) is the defensible default for any secret equality check on a network-reachable path. (2) The hook gates only `ctx.path === "/sign-up/email"`. If Better-Auth exposes any alternate sign-up surface (e.g., a future social/OAuth sign-up, magic-link, or admin-create path), it is **not** covered by this exact-path check, so the invite-only guarantee is only as airtight as this one string. The current config enables only email/password, so this is latent rather than active, but the gate should fail closed against unknown sign-up paths.
**Fix:** Use a length-checked timing-safe compare, and assert the allowed sign-up surface explicitly:
```ts
import { timingSafeEqual } from "crypto";
// ...
if (ctx.path.startsWith("/sign-up")) {
  const token = (ctx.body as Record<string, unknown>)?.inviteToken;
  const ownerToken = process.env.OWNER_INVITE_TOKEN;
  const ok =
    typeof token === "string" &&
    !!ownerToken &&
    token.length === ownerToken.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(ownerToken));
  if (!ok) throw new APIError("FORBIDDEN", { message: "signup_disabled" });
}
```

## Info

### IN-01: `role` column nullable in DB but the additional-field default is non-null — drift risk

**File:** `remix-app/db/auth-schema.ts:20` and `remix-app/app/lib/auth.server.ts:33-36`
**Issue:** The Drizzle `user.role` column is `text('role').default('client')` (nullable — no `.notNull()`), while the Better-Auth additional field declares `required: false, defaultValue: "client"`. Better-Auth applies the default on insert, so new rows get `'client'`, but any row created outside that path (a raw insert, or a future migration) could carry `NULL role`, which downstream role checks may not anticipate. Consider `.notNull().default('client')` for defense-in-depth, consistent with the `app_role` enum intent.
**Fix:** `role: text('role').notNull().default('client')` (and a backfill `UPDATE user SET role='client' WHERE role IS NULL` if any null rows exist).

### IN-02: `appRoleEnum` is declared but the `role` column uses `text`, not the enum

**File:** `remix-app/db/schema.ts:73` and `remix-app/db/auth-schema.ts:20`
**Issue:** `appRoleEnum = pgEnum('app_role', ['owner','practitioner','client'])` and the `0001` migration creates the `app_role` Postgres type, but `user.role` is typed `text` (Better-Auth requires the additional-field column to be plain text-compatible). The enum type is created in the DB and never referenced by any column — dead schema. Either wire it to the column (if Better-Auth tolerates it) or drop the enum to avoid an unused type that implies a constraint that does not exist (a `text` column accepts any string, so DB-level role validation is absent — only the app's `input:false` and the seed's elevation gate it).
**Fix:** Remove the unused `appRoleEnum` + its `CREATE TYPE`, or add a `CHECK (role IN ('owner','practitioner','client'))` constraint to enforce the value set at the DB layer.

### IN-03: `auth-layout.test.ts` passes a non-standard `unstable_pattern` loader arg and only asserts the unauthenticated path

**File:** `remix-app/tests/routes/auth-layout.test.ts:23`
**Issue:** The test invokes `loader({ request, params: {}, context: {}, unstable_pattern: "/dashboard" })`. `unstable_pattern` is not part of the loader-args contract the loader reads (it only uses `request`), so it is inert padding. More importantly, the suite asserts **only** the no-session redirect; there is no test proving the loader returns `{ user }` and allows through **when** a session is present, so a regression that always-redirects (or never-redirects) is only half-covered. The airtight-redirect claim rests on a single negative case.
**Fix:** Add a positive-path test with a mocked `auth.api.getSession` returning a session, asserting the loader returns `{ user }` and does not throw. Drop the unused `unstable_pattern` arg.

### IN-04: Dashboard `loader` is unauthenticated-safe only by parent gating — no defense if route nesting changes

**File:** `remix-app/app/routes/_app/dashboard.tsx:61-124`
**Issue:** The dashboard loader reads/returns all metric, correlation, and genetic data with no session check of its own; it relies entirely on the parent `_app/layout.tsx` loader running first. React Router does run parent loaders before child loaders, so this is correct **today**. But the data exposure is total if the route is ever re-parented out of `_app/` (the same class of mistake the phase's Pitfall 3 warns about for AppShell). This is structural fragility, not an active leak — noting for defense-in-depth, not as a blocker.
**Fix:** No change required while nesting holds. If/when per-subject scoping lands, the loader should derive `subjectId` from the session (`session.user`) rather than assuming the single n=1 subject, which will also make the auth dependency explicit at the data layer.

---

_Reviewed: 2026-06-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
