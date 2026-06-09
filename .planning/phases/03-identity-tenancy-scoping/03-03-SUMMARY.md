---
phase: 03-identity-tenancy-scoping
plan: 03
subsystem: auth
tags: [better-auth, drizzle-adapter, email-password, session, role, invite-gate, typescript]

# Dependency graph
requires:
  - phase: 03-02
    provides: "auth-schema.ts barrel (user/session/account/verification tables) + schema.ts barrel export"
  - phase: 03-01
    provides: "Wave-0 RED contract tests (session/role/invite.test.ts)"
provides:
  - "app/lib/auth.server.ts — Better-Auth singleton with email/password, role field (input:false), 30-day sessions, invite-only beforeSignUp hook"
  - "app/lib/auth-client.ts — browser-safe createAuthClient with SSR-safe baseURL"
  - "app/routes/api.auth.$.ts — catch-all resource route mounting auth.handler for loader + action"
  - "AUTH-01 mechanism: email/password sign-in with 30-day session persistence"
  - "AUTH-02 mechanism: role additionalField with input:false preventing self-assignment"
  - "D-01 mechanism: invite-only signup gate via createAuthMiddleware + APIError FORBIDDEN"
affects: [03-04, 03-05, phase-7-rls]

# Tech tracking
tech-stack:
  added:
    - "better-auth (betterAuth, createAuthMiddleware, APIError from better-auth/api)"
    - "@better-auth/drizzle-adapter (drizzleAdapter with provider:pg)"
    - "better-auth/react (createAuthClient)"
  patterns:
    - ".server.ts suffix for server-only module isolation"
    - "Module-level Better-Auth singleton (sync config, no lazy init needed)"
    - "beforeSignUp hook via createAuthMiddleware for invite-only gate (D-01)"
    - "input:false on additionalFields.role for role self-assignment prevention (AUTH-02)"
    - "Test env stubs (NETLIFY_DATABASE_URL + BETTER_AUTH_SECRET) in setupFiles for unit test isolation"

key-files:
  created:
    - "remix-app/app/lib/auth.server.ts"
    - "remix-app/app/lib/auth-client.ts"
    - "remix-app/app/routes/api.auth.$.ts"
  modified:
    - "remix-app/app/test-setup.ts (env stubs for unit test isolation)"
    - "remix-app/tests/auth/session.test.ts (@ts-expect-error removed)"
    - "remix-app/tests/auth/role.test.ts (@ts-expect-error removed)"
    - "remix-app/tests/auth/invite.test.ts (@ts-expect-error removed + body cast fix)"
    - "remix-app/tests/db/schema-columns.test.ts (pre-existing TS2352 cast fixed)"

key-decisions:
  - "Use NETLIFY_DATABASE_URL (not DATABASE_URL) as pool stub in test-setup.ts so DB introspection tests' skip-guard (DATABASE_URL_UNPOOLED || DATABASE_URL) stays falsy and tests skip rather than fail"
  - "inviteToken passed via 'as unknown as ...' cast in invite.test.ts — Better-Auth signUpEmail body is ZodIntersection with ZodRecord<string,any> but TypeScript inference only surfaces known fields; cast is correct and the runtime contract (hook throws 403) is the real assertion"
  - "BETTER_AUTH_SECRET guard placed at module level in auth.server.ts (mirrors db.server.ts pattern); satisfied by test-setup.ts stub so unit tests import cleanly without real Vercel env"

patterns-established:
  - "Pattern: auth.server.ts as .server.ts module-level singleton importing getDb() — never creates a second Pool"
  - "Pattern: createAuthMiddleware + APIError from better-auth/api (confirmed import path, not better-auth/server)"
  - "Pattern: auth-client.ts with no .server suffix — browser-safe, no secrets, SSR-safe baseURL"
  - "Pattern: resource route with loader + action both delegating to auth.handler(request), no default export"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 7min
completed: 2026-06-09
---

# Phase 03 Plan 03: Auth.server.ts — Better-Auth Identity Engine Summary

**Better-Auth email/password singleton with invite-only gate (beforeSignUp hook), role additionalField (input:false), 30-day sessions, browser authClient, and catch-all /api/auth/* resource route; turns 3 Wave-0 RED contracts GREEN**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-06-09T18:26:28Z
- **Completed:** 2026-06-09T18:33:51Z
- **Tasks:** 2
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments

- Created `auth.server.ts`: betterAuth singleton wiring drizzleAdapter(getDb()) to the existing Neon Pool (no second Pool), emailAndPassword enabled, role additionalField with input:false (AUTH-02), 30-day sessions with 5-min cookie cache, invite-only beforeSignUp hook (D-01) using createAuthMiddleware + APIError("FORBIDDEN") from better-auth/api
- Created `auth-client.ts`: browser-safe createAuthClient with SSR-safe baseURL (window.location.origin || ""), no server imports
- Created `api.auth.$.ts`: catch-all resource route — loader + action both delegate to auth.handler(request), no default export
- Turned 3 Wave-0 RED contracts GREEN: session (2 tests), role (3 tests), invite (1 test) — 6/6 auth unit tests pass
- Removed @ts-expect-error directives from all three auth test imports (now resolving)
- tsc clean

## Task Commits

1. **Task 1: Configure Better-Auth server instance (auth.server.ts)** — `e2a028a` (feat)
2. **Task 2: Create auth-client.ts (browser) + api.auth.$.ts (resource route)** — `faa84d0` (feat)
3. **Fix: NETLIFY_DATABASE_URL stub to preserve DB test skip-guard** — `1662ec8` (fix)

## Files Created/Modified

- `remix-app/app/lib/auth.server.ts` — Better-Auth singleton: email/password, role additionalField (input:false), 30-day session, invite-only hook
- `remix-app/app/lib/auth-client.ts` — Browser-safe createAuthClient, SSR-safe baseURL, no server imports
- `remix-app/app/routes/api.auth.$.ts` — Catch-all resource route, loader + action → auth.handler(request), no default export
- `remix-app/app/test-setup.ts` — Added BETTER_AUTH_SECRET and NETLIFY_DATABASE_URL stubs for unit test isolation
- `remix-app/tests/auth/session.test.ts` — Removed @ts-expect-error (module now resolves)
- `remix-app/tests/auth/role.test.ts` — Removed @ts-expect-error (module now resolves)
- `remix-app/tests/auth/invite.test.ts` — Removed @ts-expect-error; added body cast for inviteToken (Rule 1 bug fix)
- `remix-app/tests/db/schema-columns.test.ts` — Fixed pre-existing TS2352 cast (Rule 1 bug, needed for tsc clean)

## Decisions Made

- Used `NETLIFY_DATABASE_URL` (not `DATABASE_URL`) as the pool stub in test-setup.ts. The DB introspection tests' skip-guard checks `DATABASE_URL_UNPOOLED || DATABASE_URL`; db.server.ts's pool checks `NETLIFY_DATABASE_URL || DATABASE_URL`. Using the Netlify fallback satisfies the pool import without activating the skip-guard, so DB tests remain skipped rather than failing against the stub URL.
- Invite test body cast: Better-Auth's `signUpEmail` body is typed as `ZodIntersection<KnownFields, ZodRecord<string, any>>` but TypeScript inference only surfaces the known fields. `inviteToken` reaches `ctx.body` at runtime (via the ZodRecord passthrough) but isn't in the TypeScript type. The `as unknown as` cast is the correct fix; the real contract assertion is that the wrong token triggers a 403, not the TypeScript type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed invite.test.ts TS2769 — inviteToken not in signUpEmail typed overloads**
- **Found during:** Task 1 (auth.server.ts creation — once module resolved, tsc surfaced the error)
- **Issue:** Better-Auth's signUpEmail TypeScript inference doesn't include `inviteToken` in the body type (ZodRecord passthrough is invisible to inference). Error: `Object literal may only specify known properties`.
- **Fix:** Added `as unknown as { email: string; password: string; name: string }` cast on the body object. The runtime behavior (inviteToken flows through ZodRecord to ctx.body) is correct.
- **Files modified:** `remix-app/tests/auth/invite.test.ts`
- **Committed in:** e2a028a (Task 1 commit)

**2. [Rule 1 - Bug] Fixed schema-columns.test.ts TS2352 — ColumnRow cast without unknown**
- **Found during:** Task 1 (pre-existing, surfaced when running npx tsc --noEmit for Task 1 verification)
- **Issue:** `(r as Record<string, unknown>)` fails when ColumnRow doesn't overlap sufficiently. Pre-existing bug from Plan 01.
- **Fix:** `(r as unknown as Record<string, unknown>)` — double cast via unknown.
- **Files modified:** `remix-app/tests/db/schema-columns.test.ts`
- **Committed in:** e2a028a (Task 1 commit — unblocked tsc clean requirement)

**3. [Rule 2 - Missing Critical] Added env stubs to test-setup.ts for auth unit test isolation**
- **Found during:** Task 1 verification (running npm test — role/invite tests failed with BETTER_AUTH_SECRET not set)
- **Issue:** auth.server.ts guards for `BETTER_AUTH_SECRET` at module level (mirrors db.server.ts idiom). No .env file exists; Vercel env vars are not set in local test runs. Module-level throw prevented any test from importing auth.server.ts.
- **Fix:** Added `BETTER_AUTH_SECRET` stub and `NETLIFY_DATABASE_URL` stub to test-setup.ts. Vitest runs setupFiles before importing test modules, so stubs are in place before auth.server.ts evaluates the guard.
- **Files modified:** `remix-app/app/test-setup.ts`
- **Committed in:** e2a028a (Task 1 commit), then refined in 1662ec8 (fix)

**4. [Rule 1 - Bug] Fixed DATABASE_URL stub activating DB test connections**
- **Found during:** After Task 2 (full npm test run showed DB introspection tests failing instead of skipping)
- **Issue:** Initial stub used `DATABASE_URL`; DB introspection tests' skip-guard checks `DATABASE_URL_UNPOOLED || DATABASE_URL`, so setting `DATABASE_URL` made the guard truthy and tests tried to connect to the stub Neon URL (failing).
- **Fix:** Switched stub to `NETLIFY_DATABASE_URL` (first fallback in db.server.ts pool check but not in DB test skip-guard). DB tests now skip (18 skipped) as expected.
- **Files modified:** `remix-app/app/test-setup.ts`
- **Committed in:** 1662ec8

---

**Total deviations:** 4 auto-fixed (3 Rule 1 bugs, 1 Rule 2 missing critical)
**Impact on plan:** All auto-fixes were necessary for tsc clean + test green end-state. No scope creep — the invite test fix, schema-columns fix, and env stubs are correctness requirements for the plan's own success criteria.

## Issues Encountered

- The `@ts-expect-error` cleanup (plan's tdd_context) surfaced pre-existing type errors that were previously masked — addressed via Rule 1 auto-fix.
- Better-Auth's `signUpEmail` Zod type inference hides the ZodRecord passthrough from TypeScript, requiring the body cast for the invite test. Runtime behavior is correct (inviteToken flows to ctx.body).

## Threat Surface Scan

No new security surface beyond what the plan's threat_model covers. auth.server.ts uses `.server.ts` suffix (client bundle exclusion), auth-client.ts holds no secrets, api.auth.$.ts delegates entirely to Better-Auth handler. All STRIDE mitigations from the threat register are implemented:
- T-03-open-signup: beforeSignUp hook throws FORBIDDEN ✓
- T-03-role-self-assign: input:false ✓
- T-03-session: Better-Auth signs cookie with BETTER_AUTH_SECRET ✓
- T-03-crypto: no hand-rolled hashing ✓
- T-03-server-leak: .server.ts suffix ✓

## Next Phase Readiness

- Plan 04 (schema migrations) can now run: auth.server.ts provides the drizzleAdapter with the full schema barrel; the owner seed script can use `auth.api.signUpEmail()` with OWNER_INVITE_TOKEN
- Plan 05 (route wiring) can add `route("api/auth/*", "routes/api.auth.$.ts")` to routes.ts — the file now exists
- auth-layout.test.ts (Plan 05 contract) remains RED — expected; the `~/routes/_app/layout` module doesn't exist yet
- DB introspection tests (Plans 04) remain skipped — expected until migrations run against Neon

---
*Phase: 03-identity-tenancy-scoping*
*Completed: 2026-06-09*
