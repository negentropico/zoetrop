---
phase: 03-identity-tenancy-scoping
plan: 01
subsystem: testing
tags: [vitest, better-auth, drizzle-adapter, tsx, tdd, contract-tests, neon, postgres]

# Dependency graph
requires:
  - phase: 01-schema-baseline-engine-tests-auth-spike
    provides: Vitest 4.1.8 harness + vite.config.ts test block + better-auth@^1.6.14
provides:
  - "@better-auth/drizzle-adapter@^1.6.15 + tsx@^4.22.4 installed (human-verified)"
  - "better-auth aligned to ^1.6.15 (core peer for the adapter)"
  - "db:seed-owner npm script reserved for Plan 04"
  - "Vitest include glob extended to discover remix-app/tests/**"
  - "6 Wave-0 RED contract test files binding AUTH-01, AUTH-02, TEN-01, TEN-04, D-01"
affects: [03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: ["@better-auth/drizzle-adapter@^1.6.15", "tsx@^4.22.4"]
  patterns:
    - "TDD Wave-0 contract: failing tests authored before the code they assert"
    - "describe.skipIf(!connectionString) skip-guard for live-DB introspection tests"
    - "@ts-expect-error on not-yet-existent module imports keeps red contracts TS-parseable"

key-files:
  created:
    - remix-app/tests/auth/session.test.ts
    - remix-app/tests/auth/role.test.ts
    - remix-app/tests/auth/invite.test.ts
    - remix-app/tests/routes/auth-layout.test.ts
    - remix-app/tests/db/schema-columns.test.ts
    - remix-app/tests/db/constraints.test.ts
  modified:
    - remix-app/package.json
    - remix-app/package-lock.json
    - remix-app/vite.config.ts

key-decisions:
  - "Aligned better-auth ^1.6.14 -> ^1.6.15 to satisfy the adapter's @better-auth/core ^1.6.15 peer (within already-verified package family)"
  - "DB introspection tests resolve DATABASE_URL_UNPOOLED || DATABASE_URL (migration path), not the runtime db.server.ts string"
  - "Invite test asserts a *wrong* token is rejected — never embeds the real OWNER_INVITE_TOKEN"

patterns-established:
  - "Wave-0 RED contracts: real assertions (not it.todo) that downstream plans turn green"
  - "Live-DB tests green-skip without a connection string and hard-assert when present (no false-positive pass)"

requirements-completed: []  # AUTH-01/AUTH-02/TEN-01/TEN-04 are CONTRACTED here (red), satisfied in Plans 02-05 — not completed by this plan

# Metrics
duration: 9min
completed: 2026-06-09
---

# Phase 3 Plan 01: Wave-0 Verification Foundation Summary

**Installed the two human-verified Phase-3 deps, extended the Vitest glob to cover `tests/`, and authored 6 RED contract test files that bind AUTH-01/AUTH-02/TEN-01/TEN-04/D-01 to automated proofs before the implementing plans run.**

## Performance

- **Duration:** ~9 min (excluding the human-verify checkpoint wait)
- **Started:** 2026-06-09T18:09:00Z (approx, post-approval)
- **Completed:** 2026-06-09T18:18:00Z (approx)
- **Tasks:** 3
- **Files modified:** 9 (3 modified + 6 created)

## Accomplishments
- Installed `@better-auth/drizzle-adapter@^1.6.15` + `tsx@^4.22.4` (both human-verified at the Task 1 blocking checkpoint) and reserved the `db:seed-owner` script for Plan 04.
- Extended `vite.config.ts` `test.include` to discover `remix-app/tests/**`, preserving the existing `app/**` engine globs.
- Created the 6 Wave-0 contract test files. Final suite state is the intended TDD RED: **13 files (4 failed | 7 passed | 2 skipped)**, 75 passing engine tests untouched, 4 auth/route contracts failing on not-yet-built module imports, 2 DB introspection files green-skipped without DB creds.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install + verify deps** - `1eb6e94` (chore)
2. **Task 2: Extend Vitest include glob** - `c6f75b1` (test)
3. **Task 3: Create 6 Wave-0 RED contract tests** - `9714de3` (test)

**Plan metadata:** committed with SUMMARY + STATE + ROADMAP (docs)

## Files Created/Modified
- `remix-app/package.json` - added `@better-auth/drizzle-adapter`, `tsx`, `db:seed-owner` script; bumped `better-auth` to `^1.6.15`
- `remix-app/package-lock.json` - dependency tree update
- `remix-app/vite.config.ts` - `test.include` now covers `tests/**/*.test.{ts,tsx}` alongside `app/**`
- `remix-app/tests/auth/session.test.ts` - AUTH-01 getSession contract (surface + null for no-cookie)
- `remix-app/tests/auth/role.test.ts` - AUTH-02 role additionalField (owner|practitioner|client, input:false)
- `remix-app/tests/auth/invite.test.ts` - D-01 invite gate (bogus token -> 403 FORBIDDEN)
- `remix-app/tests/routes/auth-layout.test.ts` - AUTH-02 layout loader -> 302 redirect /login when no session
- `remix-app/tests/db/schema-columns.test.ts` - TEN-01 non-null tenant_id/subject_id + composite index across 8 tables
- `remix-app/tests/db/constraints.test.ts` - TEN-04 composite UNIQUE present + old global UNIQUE(version) absent

## Decisions Made
- **better-auth version alignment (Rule 3):** the adapter peer-requires `@better-auth/core@^1.6.15`, but the installed `better-auth@1.6.14` brought `core@1.6.14`. Bumped `better-auth` to `^1.6.15` (the exact version 03-RESEARCH.md already documents as the target) so `core@1.6.15` is present. This is version alignment within the already-human-verified package family, not a package substitution — the package-manager exclusion guards against installing a *different* (possibly slopsquatted) package, which did not occur here.
- **DB connection-string resolution:** the introspection tests use `DATABASE_URL_UNPOOLED || DATABASE_URL` (the migration path per `drizzle.config.ts`), per the plan's `<interfaces>` note, rather than `db.server.ts`'s `NETLIFY_DATABASE_URL || DATABASE_URL`.
- **Invite test never embeds the real secret:** the D-01 test asserts a deliberately-wrong token is refused, which holds regardless of the real `OWNER_INVITE_TOKEN` value (T-03-secret).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bumped better-auth ^1.6.14 -> ^1.6.15 to resolve adapter peer conflict**
- **Found during:** Task 1 (dep install)
- **Issue:** `npm install -D @better-auth/drizzle-adapter` failed with ERESOLVE — the adapter peer-requires `@better-auth/core@^1.6.15`, but `better-auth@1.6.14` pinned `core@1.6.14`.
- **Fix:** Installed `better-auth@^1.6.15` first (bringing `core@1.6.15`), then the adapter + tsx. No `--force` / `--legacy-peer-deps` used; the tree resolves cleanly. `drizzle-orm@0.45.2` (the adapter's other peer) was already resolved.
- **Files modified:** remix-app/package.json, remix-app/package-lock.json
- **Verification:** `node -e` confirms `@better-auth/core@1.6.15`; all 3 Task-1 grep criteria pass; `npm test` exits 0.
- **Committed in:** `1eb6e94` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Version alignment was necessary to install the human-approved package and matches the version 03-RESEARCH.md already specified. No scope creep, no unverified package introduced.

## Issues Encountered
- The initial single-shot `npm install -D @better-auth/drizzle-adapter tsx` and a combined `better-auth@^1.6.15 @better-auth/drizzle-adapter tsx` both ERESOLVE-failed because the lockfile still pinned `core@1.6.14`. Resolved by sequencing the `better-auth` bump first, then adding the adapter + tsx in a second install. See deviation 1.

## Expected RED State (TDD Wave-0 — not a failure)
`npm test` exits 1 after Task 3, by design. The 4 auth/route contracts fail with "Cannot find module" (`~/lib/auth.server` is built in Plan 03; `~/routes/_app/layout` in Plan 05). The 2 DB introspection files green-skip via `describe.skipIf(!connectionString)` because no `DATABASE_URL` is set in this environment. The 75 Phase-1 engine tests remain green. This is the desired Wave-0 outcome per the plan's `success_criteria` and 03-VALIDATION.md — the contracts are live and downstream plans turn them green.

## Requirements Note
AUTH-01, AUTH-02, TEN-01, TEN-04 are **contracted** (red tests authored) by this plan but **not completed** — they are satisfied by Plans 02-05. `requirements-completed` is intentionally empty so REQUIREMENTS.md is not prematurely checked off.

## User Setup Required
Deferred to Plan 04: `OWNER_INVITE_TOKEN`, `OWNER_EMAIL`, `OWNER_PASSWORD` must be set in `remix-app/.env` (and `OWNER_INVITE_TOKEN` in Vercel) before the seed script runs. See the plan's `user_setup` block. No setup is required to run this plan's tests.

## Next Phase Readiness
- Wave-0 contracts are live; Plans 02-05 now verify against fixed acceptance criteria instead of inventing them.
- Plan 03 (auth.server.ts) turns `session`/`role`/`invite` green; Plan 05 (`_app/layout.tsx`) turns `auth-layout` green; Plans 02+04 (migrations) turn the DB introspection tests from skipped to green once run against Neon with `DATABASE_URL`.
- No blockers.

## Self-Check: PASSED

---
*Phase: 03-identity-tenancy-scoping*
*Completed: 2026-06-09*
