---
phase: 03-identity-tenancy-scoping
verified: 2026-06-09T19:35:00Z
status: human_needed
score: 3/3 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Session persists across a full browser restart"
    expected: "After signing in as the owner, closing and reopening the browser, /dashboard still renders inside AppShell without re-login (AUTH-01 'stay signed in')."
    why_human: "Cookie persistence across browser restart requires a real browser. The mechanism is code-verified (30-day persistent cookie, CR-01 logout cookie-clearing fix) but the live end-to-end behavior cannot be grepped."
  - test: "Delete PILOT_BASIC_AUTH from Vercel env and confirm prod returns HTTP 200"
    expected: "curl -I https://zoetrop.vercel.app/ returns 200 after branch is deployed to production and the env var is deleted from Vercel Production + Preview."
    why_human: "D-05's code removal is complete (root.tsx is clean). The Vercel env-var deletion is blocked on branch deployment — documented in .planning/todos/pending/delete-pilot-basic-auth-post-deploy.md. The deployed branch (003-remix-foundation) has not yet been merged to main/production."
---

# Phase 3: Identity + Tenancy Scoping — Verification Report

**Phase Goal:** Ship Better-Auth roles, tenants/users/subjects tables, and add tenantId/subjectId columns + composite index + per-subject protocol-version uniqueness to all 8 data tables. RLS enable+policies, the SET LOCAL wrapper, and cross-tenant isolation tests are deferred to Phase 7.
**Verified:** 2026-06-09T19:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All three roadmap success criteria are code-verified. Two human checks remain (browser session persistence and Vercel env-var deletion) — neither is a gap in what was built.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A user can sign in with email + password via Better-Auth and stay signed in; their role is readable from the session and gates route access | VERIFIED | `auth.server.ts`: `betterAuth(emailAndPassword:enabled, additionalFields.role input:false, session 30-day)`; `_app/layout.tsx` loader throws redirect on no session; `login.tsx` action calls `signInEmail`, `logout.tsx` uses `asResponse:true` + forwards cookie-clearing headers (CR-01 fixed); local curl smoke test confirmed sign-in→dashboard→logout→redirect |
| 2 | All 8 data tables have non-nullable tenantId/subjectId columns backfilled with owner's IDs, composite (tenant_id, subject_id) index confirmed | VERIFIED | `schema.ts`: 8 tables each have `.notNull()` tenantId + subjectId; `0004_tenancy_not_null.sql`: 8x `SET NOT NULL` + 8x `CREATE INDEX`; execution facts: live Neon DB introspection confirmed 16 NOT NULL columns + 8 composite indexes; `tests/db/schema-columns.test.ts` passes green against live Neon |
| 3 | Protocol version lineage is unique on (tenantId, subjectId, version); old global UNIQUE(version) is absent | VERIFIED | `0004_tenancy_not_null.sql`: `ADD CONSTRAINT protocol_versions_tenant_subject_version_unique UNIQUE ("tenant_id", "subject_id", "version")`; `0002_tenancy_columns_nullable.sql` drops the old `protocol_versions_version_unique`; `schema.ts` line 102 has no `.unique()` on version; `tests/db/constraints.test.ts` passes green against live Neon; execution facts confirm live DB |

**Score:** 3/3 truths verified

### Deferred Items

Items correctly excluded from this phase per the roadmap contract.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | RLS enable + policies + SET LOCAL wrapper + cross-tenant isolation tests | Phase 7 | ROADMAP.md: "Deferred to Phase 7: atomic RLS enable+policies, the withTenantDb SET LOCAL transaction wrapper + pool-leak test, the cross-tenant isolation test (TEN-02, TEN-03)" |
| 2 | Practitioner subject-scoping (AUTH-03) and immutable audit log (AUTH-04) | Phase 7 | REQUIREMENTS.md traceability: AUTH-03/AUTH-04 mapped to Phase 7 |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `remix-app/db/auth-schema.ts` | Better-Auth user/session/account/verification tables | VERIFIED | 4 pgTable definitions; text PKs; session/account userId FKs with cascade; `role text('role').default('client')` |
| `remix-app/db/schema.ts` | appRoleEnum + tenants/subjects + 8 tables with notNull tenantId/subjectId + barrel export | VERIFIED | `appRoleEnum = pgEnum('app_role', ...)` line 73; tenants/subjects tables; 8 data tables each have `.notNull().references(() => tenants.id)` / `.references(() => subjects.id)`; `export * from './auth-schema'` line 257 |
| `remix-app/migrations/0001_better_auth_and_tenancy_spine.sql` | CREATE TYPE app_role + CREATE TABLE user/session/account/verification/tenants/subjects | VERIFIED | File exists; 6 CREATE TABLE + 1 CREATE TYPE confirmed |
| `remix-app/migrations/0002_tenancy_columns_nullable.sql` | 8x ADD nullable tenant_id/subject_id + DROP protocol_versions_version_unique | VERIFIED | File exists in journal |
| `remix-app/migrations/0003_tenancy_backfill.sql` | DO $$ block UPDATEs all 8 tables with owner IDs | VERIFIED | 8 UPDATE statements confirmed; idempotent (WHERE tenant_id IS NULL) |
| `remix-app/migrations/0004_tenancy_not_null.sql` | 8x SET NOT NULL + 8x CREATE INDEX + UNIQUE(tenant_id, subject_id, version) | VERIFIED | 8 SET NOT NULL + 8 CREATE INDEX + 1 UNIQUE constraint; no CONCURRENTLY |
| `remix-app/app/lib/auth.server.ts` | betterAuth singleton (email/password + drizzleAdapter + role input:false + invite hook + session config) | VERIFIED | `betterAuth(` confirmed; drizzleAdapter(getDb()); role input:false; 30-day session; invite hook with timingSafeEqual (WR-06 fixed); APIError FORBIDDEN |
| `remix-app/app/lib/auth-client.ts` | createAuthClient browser client | VERIFIED | `createAuthClient` from `better-auth/react`; no .server suffix; no server-only imports |
| `remix-app/app/routes/api.auth.$.ts` | catch-all loader+action delegating to auth.handler(request) | VERIFIED | 2x `auth.handler(request)`; no default export; imports from `~/lib/auth.server` |
| `remix-app/app/routes/_app/layout.tsx` | authenticated layout loader (session redirect) wrapping AppShell | VERIFIED | `auth.api.getSession({ headers: request.headers })`; `throw redirect('/login?redirect=...')`; `<AppShell><Outlet /></AppShell>` |
| `remix-app/app/routes/auth/login.tsx` | sign-in form + action via signInEmail | VERIFIED | action calls signInEmail with asResponse:true; validates email/password presence (WR-04 fixed); same-origin redirect guard (WR-05 fixed); loader redirects authenticated users |
| `remix-app/app/routes/auth/logout.tsx` | action calling signOut + clearing cookie | VERIFIED | `signOut({ asResponse: true })` + `redirect('/login', { headers: response.headers })` (CR-01 fixed) |
| `remix-app/app/routes/landing.tsx` | public landing page (no AppShell) | VERIFIED | File exists; no auth import; public surface |
| `remix-app/app/routes.ts` | public routes + authenticated _app/ layout wrapper | VERIFIED | `index("routes/landing.tsx")`; `layout("routes/_app/layout.tsx", [...])`; all 4 section layouts + dashboard nested inside; `route("api/auth/*", ...)` |
| `remix-app/app/root.tsx` | bare Outlet; no PILOT_BASIC_AUTH, no loader, no AppShell | VERIFIED | 0 matches for PILOT_BASIC_AUTH; 0 loader exports; 0 headers exports; AppShell only in a comment (not imported/rendered) |
| `remix-app/scripts/seed-owner.ts` | owner seed (signUpEmail + role elevation + idempotency) | VERIFIED | insert(tenants) + insert(subjects) + signUpEmail + role='owner' UPDATE; no hashPassword; OWNER_INVITE_TOKEN passed; idempotency check on email |
| `remix-app/tests/auth/session.test.ts` | AUTH-01 getSession contract | VERIFIED | Real assertions; imports auth from ~/lib/auth.server; asserts null for no-cookie; asserts handler is function |
| `remix-app/tests/auth/role.test.ts` | AUTH-02 role field contract | VERIFIED | Asserts additionalFields.role; input:false; type contains owner/practitioner/client |
| `remix-app/tests/auth/invite.test.ts` | D-01 invite gate contract | VERIFIED | Asserts wrong token rejected |
| `remix-app/tests/routes/auth-layout.test.ts` | AUTH-02 layout redirect contract | VERIFIED | Asserts loader throws 302 redirect to /login with no session |
| `remix-app/tests/db/schema-columns.test.ts` | TEN-01 column/index introspection | VERIFIED | Real assertions; skip-guard when no DATABASE_URL; passes green against live Neon (execution facts) |
| `remix-app/tests/db/constraints.test.ts` | TEN-04 constraint-swap introspection | VERIFIED | Real assertions; skip-guard when no DATABASE_URL; passes green against live Neon (execution facts) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `auth.server.ts` | `db.server.ts` | `drizzleAdapter(getDb(), { schema })` | WIRED | `drizzleAdapter(getDb(), { provider: "pg", schema })` line 17; reuses the singleton pool |
| `auth.server.ts` | `db/schema` (barrel) | `import * as schema from "../../db/schema"` | WIRED | Line 6; schema barrel includes auth-schema via `export * from './auth-schema'` (Pitfall 2 satisfied) |
| `api.auth.$.ts` | `auth.handler` | loader/action delegation | WIRED | Both `loader` and `action` return `auth.handler(request)`; 2x confirmed |
| `_app/layout.tsx` | `auth.api.getSession` | loader session check + redirect | WIRED | `auth.api.getSession({ headers: request.headers })` line 12; Pitfall 4 satisfied |
| `login.tsx` | `auth.api.signInEmail` | action | WIRED | `auth.api.signInEmail({ body: { email, password }, asResponse: true })` line 37 |
| `logout.tsx` | `auth.api.signOut` | action | WIRED | `auth.api.signOut({ headers: request.headers, asResponse: true })` line 11 |
| `schema.ts` → auth-schema | barrel re-export | `export * from './auth-schema'` | WIRED | Line 257; drizzleAdapter can locate Better-Auth tables |
| `0004_tenancy_not_null.sql` | protocol_versions | composite unique add | WIRED | `UNIQUE ("tenant_id", "subject_id", "version")` — TEN-04 contract |
| `routes.ts` | `_app/layout.tsx` | `layout(...)` nesting all app routes | WIRED | All 4 section layouts + dashboard nested inside `layout("routes/_app/layout.tsx", [...])` |
| `root.tsx` | `<Outlet />` | bare render | WIRED | `App()` returns `<Outlet />` only; no AppShell, no loader, no PILOT_BASIC_AUTH |

---

### Data-Flow Trace (Level 4)

Not applicable to this phase. Phase 3 delivers the identity/tenancy layer (auth, schema, migrations), not data-rendering components. Route loaders do not yet read live health data from the DB (that is Phase 4). The `_app/layout.tsx` loader does read from DB (via getSession) and the data flow is confirmed: `auth.api.getSession` → Better-Auth reads the session table via drizzleAdapter → returns user or null → redirect branch.

---

### Behavioral Spot-Checks

The execution facts establish: local curl smoke test confirmed the full auth flow end-to-end: `/` public → `/dashboard` gated → sign-in → `/dashboard` in AppShell → sign-out → `/login`. The test suite (82 passing / 18 skipped) runs green including the 6 Wave-0 contract tests (auth/role/invite/auth-layout pass; DB tests green-skip without DATABASE_URL, pass against live Neon per execution facts).

| Behavior | Result | Status |
|----------|--------|--------|
| Local test suite: 82 tests pass, 18 skip (DB tests without env) | `Test Files 11 passed | 2 skipped (13); Tests 82 passed | 18 skipped` | PASS |
| auth.server.ts: betterAuth configured correctly | betterAuth + drizzleAdapter + role input:false + invite hook all present | PASS |
| migrations journal: 0000–0004 all registered | `_journal.json` has 5 entries idx 0–4 | PASS |
| 0004 migration: 8 SET NOT NULL + 8 CREATE INDEX + 1 UNIQUE constraint | Counts confirmed by grep | PASS |
| root.tsx: PILOT_BASIC_AUTH removed, no loader, no AppShell | 0 matches on all three | PASS |
| routes.ts: public + authenticated layout structure correct | landing/login/logout/api.auth at root; all app routes under _app/layout.tsx | PASS |

---

### Probe Execution

No probe scripts declared. The phase uses Vitest tests as the automated verification layer. The DB introspection probes run as Vitest tests (tests/db/schema-columns.test.ts, tests/db/constraints.test.ts) and are confirmed green against the live Neon DB per execution facts.

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| AUTH-01 | A user can sign in with email + password and stay signed in across sessions | SATISFIED | auth.server.ts: emailAndPassword enabled, 30-day session cookie, persistent cookie-cache; login.tsx action calls signInEmail + forwards Set-Cookie; session.test.ts green |
| AUTH-02 | Each user has a role (owner/practitioner/client) that gates access | SATISFIED | auth.server.ts: additionalFields.role with input:false; _app/layout.tsx: getSession check gates all app routes; role.test.ts + auth-layout.test.ts green |
| TEN-01 | Every health-data table is scoped by tenantId + subjectId | SATISFIED | schema.ts: 8 tables with .notNull() tenantId/subjectId; 0004 migration: SET NOT NULL + CREATE INDEX on all 8; live Neon DB confirmed by schema-columns.test.ts |
| TEN-04 | Protocol version lineage is per-subject, unique on (tenantId, subjectId, version) | SATISFIED | 0004 migration: UNIQUE(tenant_id, subject_id, version) added; 0002 migration: old UNIQUE(version) dropped; constraints.test.ts green against live Neon |

REQUIREMENTS.md traceability table marks all four as Complete. TEN-02/TEN-03/AUTH-03/AUTH-04 are correctly mapped to Phase 7 (deferred) — not gaps.

---

### Anti-Patterns Found

No TBD/FIXME/XXX markers found in any Phase 3 modified file. No `any` types in auth.server.ts, layout.tsx, login.tsx, logout.tsx, auth-schema.ts, schema.ts. No stub implementations — all handlers execute real behavior.

The following code-review deferred items (from 03-REVIEW.md) are noted as informational. They are not blockers for the phase goal:

| File | Finding | Severity | Status |
|------|---------|----------|--------|
| `db/auth-schema.ts` line 20 | IN-01: `role` column is nullable (text only, no .notNull()); Better-Auth default guards it but defense-in-depth is absent | INFO | Deferred — future hardening pass |
| `db/schema.ts` line 73 | IN-02: `appRoleEnum` is declared and the DB type exists but no column references it (user.role uses text) | INFO | Deferred — remove or wire in a future pass |
| `tests/routes/auth-layout.test.ts` | IN-03: Only the negative path (no session → redirect) is tested; no positive-path assertion | INFO | Deferred — does not falsify AUTH-02 goal |
| `scripts/seed-owner.ts` | WR-01: Seed is not wrapped in a transaction (orphan rows on partial failure) | WARNING | Deferred — owner already seeded; pre-flight issue for future tenants |
| `migrations/0003_tenancy_backfill.sql` | WR-02: No RAISE EXCEPTION if spine is absent; backfill silently no-ops | WARNING | Deferred — prod already migrated; follow-up before next tenant |
| `migrations/0003` + `_journal.json` | CR-02: Single-pass db:migrate cannot interleave seed between 0002 and 0003 on a *populated* DB | WARNING | Deferred — prod migrated via journal-split; document for future tenant onboarding |

CR-02/WR-01/WR-02 are deferred because the live production DB was migrated and seeded via the orchestrator's journal-split (not a single-pass db:migrate). They are not active defects and do not affect the phase goal for the n=1 pilot case.

---

### Human Verification Required

#### 1. Session Persistence Across Browser Restart (AUTH-01)

**Test:** Sign in at `/login` with the seeded owner credentials. Close the browser fully (not just the tab). Reopen the browser and navigate directly to `https://zoetrop.vercel.app/dashboard` (or the preview deployment URL once 003-remix-foundation is deployed).
**Expected:** The dashboard renders inside AppShell without prompting for login — the 30-day persistent `better-auth.session_token` cookie (Max-Age=2592000) is still valid and getSession trusts it.
**Why human:** Cookie persistence across a full browser restart requires a real browser session. The code mechanism is fully verified (30-day session config, CR-01 logout fix), but behavioral correctness across browser restart cannot be grepped.

#### 2. Delete PILOT_BASIC_AUTH from Vercel + Confirm Production Returns HTTP 200 (D-05)

**Test:** After the `003-remix-foundation` branch is merged to production and Vercel has deployed the new build: (1) Delete `PILOT_BASIC_AUTH` from Vercel → zoetrop project → Settings → Environment Variables (Production + Preview). (2) Trigger a redeploy. (3) Run `curl -I https://zoetrop.vercel.app/` and confirm HTTP 200 (not 401).
**Expected:** The public landing returns 200. The old Basic-Auth gate is gone both in code (root.tsx: 0 loader exports, 0 PILOT_BASIC_AUTH matches) and in the Vercel environment.
**Why human:** The Vercel env-var deletion requires dashboard access. The branch is not yet deployed to production — the env-var cannot be safely deleted until the new auth code is live. The code side is complete. See `.planning/todos/pending/delete-pilot-basic-auth-post-deploy.md`.

---

### Gaps Summary

No codebase gaps. All 3 roadmap success criteria are verified against the actual source files and confirmed against the live Neon DB (execution facts). All 22 artifacts are substantive and wired. The 2 human verification items above are not gaps in what was built — they are behavioral confirmation pending branch deployment (session persistence) and a post-deploy operational step (Vercel env-var deletion), both of which have the correct code already in place.

---

_Verified: 2026-06-09T19:35:00Z_
_Verifier: Claude (gsd-verifier)_
