---
phase: 03-identity-tenancy-scoping
plan: 04
subsystem: database
tags: [drizzle, postgres, neon, better-auth, migrations, tenancy, expand-contract, rls-groundwork]

# Dependency graph
requires:
  - phase: 03-03
    provides: auth.server.ts (auth.api.signUpEmail + beforeSignUp invite hook) consumed by the owner seed
  - phase: 03-02
    provides: tenants/subjects spine tables + nullable tenant_id/subject_id columns on the 8 data tables (migration 0001/0002)
  - phase: 03-01
    provides: Wave-0 RED contracts — tests/db/schema-columns.test.ts + tests/db/constraints.test.ts
provides:
  - Owner seed script (scripts/seed-owner.ts) — invite-token-passing, creates tenant + subject + owner user (role=owner)
  - Migration 0003 (backfill owner IDs into all 8 data tables) + 0004 (SET NOT NULL + composite index + composite UNIQUE swap)
  - Live Neon DB migrated to the final tenancy contract — TEN-01 + TEN-04 satisfied against production
  - db/schema.ts at final NOT NULL state with composite unique/index declarations on protocol_versions
affects: [phase-04, phase-05, phase-07, app-layer-scoping, rls-retrofit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Expand-contract migration completed: add-nullable (0002) → backfill (0003) → SET NOT NULL + constraints (0004)"
    - "Owner seed via auth.api.signUpEmail (Better-Auth owns password hash); role elevated server-side via Drizzle UPDATE (input:false blocks HTTP path)"
    - "Journal-split execution: seed must run BETWEEN the nullable-columns migration and the backfill/NOT-NULL migration"

key-files:
  created:
    - remix-app/scripts/seed-owner.ts
    - remix-app/migrations/0003_tenancy_backfill.sql
    - remix-app/migrations/0004_tenancy_not_null.sql
    - remix-app/migrations/meta/0003_snapshot.json
    - remix-app/migrations/meta/0004_snapshot.json
  modified:
    - remix-app/db/schema.ts
    - remix-app/migrations/meta/_journal.json
    - remix-app/tests/db/constraints.test.ts

key-decisions:
  - "Seed via auth.api.signUpEmail (not raw hashPassword) — Better-Auth owns the password hash + user/account write (V6); invite token satisfies the beforeSignUp gate"
  - "Journal-split applied at execution time: trim journal to 0000–0002 → migrate → seed → restore full journal → migrate (0003+0004) — avoids the backfill running before the spine exists and tripping the 0004 NOT NULL guardrail"
  - "Plain CREATE INDEX (not CONCURRENTLY) — drizzle-kit migrate runs in a transaction; atomic migration preferred over concurrent index build"

patterns-established:
  - "Pattern 1: expand-contract migration finished without data loss; SET NOT NULL is the guardrail (fails loudly on any unbackfilled row)"
  - "Pattern 2: per-subject protocol uniqueness UNIQUE(tenant_id, subject_id, version); old global UNIQUE(version) absent"
  - "Pattern 3: pg array_agg literal returned as a Postgres text-array STRING by @neondatabase/serverless — parse with parsePgTextArray() before set comparison"

requirements-completed: [TEN-01, TEN-04]

# Metrics
duration: ~35min
completed: 2026-06-09
---

# Phase 3 Plan 04: Tenancy Backfill + NOT NULL Constraints Summary

**Expand-contract tenancy migration completed against live Neon: owner spine seeded, all 8 data tables backfilled and set NOT NULL with a composite (tenant_id, subject_id) index (TEN-01), and protocol_versions swapped to per-subject UNIQUE(tenant_id, subject_id, version) (TEN-04).**

## Performance

- **Duration:** ~35 min (authoring + supervised live migration)
- **Started:** 2026-06-09T18:40:00Z
- **Completed:** 2026-06-09T20:25:00Z
- **Tasks:** 3 (Tasks 1–2 autonomous authoring; Task 3 blocking human-action, executed by the orchestrator under direct human supervision)
- **Files modified:** 8

## Accomplishments

- **Owner seed (`scripts/seed-owner.ts`):** idempotent script that creates tenant + subject via Drizzle inserts and the owner user via `auth.api.signUpEmail` (passing `OWNER_INVITE_TOKEN` to satisfy the invite gate), then elevates the user's `role` to `"owner"` via a direct Drizzle UPDATE. No raw password hashing — Better-Auth owns the hash + the user/account write.
- **Migration 0003 (backfill):** `DO $$` block resolves the owner's `tenant_id`/`subject_id` from the seeded spine and `UPDATE`s all 8 data tables `WHERE tenant_id IS NULL` (idempotent).
- **Migration 0004 (contract):** `ALTER COLUMN ... SET NOT NULL` on `tenant_id`/`subject_id` for all 8 tables, a composite `(tenant_id, subject_id)` index per table (TEN-01), and the per-subject `UNIQUE(tenant_id, subject_id, version)` on `protocol_versions` (TEN-04). No `CONCURRENTLY` (transactional migration).
- **Schema final state:** `db/schema.ts` updated so all 8 data tables declare `tenantId`/`subjectId` as `.notNull()`; `protocol_versions` carries `uniqueIndex` + `index` declarations matching the applied DB.
- **Live Neon migrated + verified (Task 3):** TEN-01 (16 NOT NULL columns + composite index on all 8 tables) and TEN-04 (composite UNIQUE present, old global UNIQUE absent) confirmed against production; 0 NULL rows; both DB contract tests green (18/18), full suite 99 passing.

## Task Commits

1. **Task 1: Author owner seed script (scripts/seed-owner.ts)** — `cda0a92` (feat)
2. **Task 2: Author migrations 0003/0004 + schema.ts final NOT NULL state** — `302b306` (feat)
3. **Task 3: [BLOCKING] Seed + migrate live Neon + verify introspection** — executed by the orchestrator under direct human supervision (production data safety); included one committed deviation `0644fa7` (fix — see Deviations)

**Plan metadata:** this SUMMARY commit (docs: complete plan)

## Files Created/Modified

- `remix-app/scripts/seed-owner.ts` — owner seed: tenant + subject inserts, `auth.api.signUpEmail` user creation, server-side role elevation; idempotent on `OWNER_EMAIL`; prints tenantId/subjectId
- `remix-app/migrations/0003_tenancy_backfill.sql` — `DO $$` backfill of owner IDs into all 8 data tables
- `remix-app/migrations/0004_tenancy_not_null.sql` — SET NOT NULL (8×2) + 8 composite indexes + composite UNIQUE constraint swap
- `remix-app/migrations/meta/0003_snapshot.json`, `remix-app/migrations/meta/0004_snapshot.json` — drizzle-kit snapshots
- `remix-app/migrations/meta/_journal.json` — journal entries for 0003 + 0004 (final committed state matches the live DB; the execution-time journal-split left zero git diff)
- `remix-app/db/schema.ts` — 8 data tables to `.notNull()`; `protocol_versions` uniqueIndex + index; `index`/`uniqueIndex` imports added
- `remix-app/tests/db/constraints.test.ts` — `parsePgTextArray()` fix (deviation `0644fa7`)

## Decisions Made

- **Seed via `auth.api.signUpEmail`, not raw `hashPassword`** (03-RESEARCH Q1 RESOLVED): hand-inserting `user` + `account` with a matching internal hash shape is brittle and version-coupled. Better-Auth owns the hash; the invite token passes the `beforeSignUp` hook (Pitfall 5).
- **Journal-split execution order** (Task 3): because Task 2 had already added 0003/0004 to the journal, a single `drizzle-kit migrate` would have run the 0003 backfill before the seed created the spine, leaving rows NULL and tripping the 0004 `SET NOT NULL` guardrail. The orchestrator therefore trimmed `_journal.json` to 0000–0002, ran `migrate` (0001+0002), ran `db:seed-owner`, then restored the full journal (identical to the committed file — zero diff) and ran `migrate` again (0003+0004). Env vars were loaded via `node --env-file=.env` since drizzle-kit/tsx/vitest do not auto-load `.env`.
- **Plain `CREATE INDEX` (not `CONCURRENTLY`)** — drizzle-kit migrations run in a transaction; `CREATE INDEX CONCURRENTLY` cannot. Atomicity preferred over concurrent build for these small tables.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pg array_agg literal mis-parsed in constraints.test.ts**
- **Found during:** Task 3 (live DB verification — TEN-04 composite-UNIQUE check)
- **Issue:** The `@neondatabase/serverless` Pool driver returns `array_agg(...)` as a Postgres array-literal **string** (`"{tenant_id,subject_id,version}"`), not a JS array. The composite-UNIQUE assertion spread that string into individual characters, producing a false-negative failure even though the constraint was correctly present in Neon.
- **Fix:** Added a `parsePgTextArray()` helper to normalize the Postgres text-array literal into a real string array before the set comparison.
- **Files modified:** `remix-app/tests/db/constraints.test.ts`
- **Verification:** Both DB contract tests (`tests/db/schema-columns.test.ts` + `tests/db/constraints.test.ts`) green against live Neon (18/18); full suite 99 passing; `tsc` clean.
- **Committed in:** `0644fa7` (committed by the orchestrator as part of Task 3)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix corrected a test-harness parsing bug, not a schema defect — the live DB was already correct. No scope creep; the contract tests now faithfully assert TEN-04 against the Neon driver's return shape.

## Issues Encountered

- **Migration ordering hazard:** authoring Task 2 added 0003/0004 to the journal before the seed could run, which would have applied the backfill against an empty spine. Resolved at execution time via the journal-split (see Decisions). The committed journal is the correct final state with zero residual diff.
- **`.env` auto-loading:** drizzle-kit, tsx, and vitest do not auto-load `.env`; the orchestrator used `node --env-file=.env` for the migrate/seed/test runs.

## User Setup Required

A gitignored `remix-app/.env` was assembled for the supervised live migration:
- Infra creds (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) copied from the repo-root `.env`.
- Owner vars generated locally: `OWNER_EMAIL=m@negentropi.co`, `OWNER_PASSWORD` (generated), `OWNER_INVITE_TOKEN` (generated), `OWNER_NAME=Owner`.

No secret values are recorded here. The owner now exists in Neon (tenant + owner-subject + `role=owner` user).

### FOLLOW-UP (Plan 05 / Vercel)

**`OWNER_INVITE_TOKEN` must be set in Vercel env vars (production + preview)** so the deployed app's `beforeSignUp` invite gate (03-03) validates against the same token used to seed the owner. This is carried forward to **Plan 05's Vercel work** — without it, the deployed signup path has no valid invite token configured. Do NOT commit the token value anywhere; set it directly in Vercel.

## Next Phase Readiness

- **TEN-01 + TEN-04 satisfied against live Neon** — all 8 data tables have non-null `tenant_id`/`subject_id` correctly backfilled to the owner, with a composite index; `protocol_versions` is per-subject unique. This is the Phase 7 RLS-retrofit groundwork (columns + values in place; non-breaking).
- **Phase 4 (app-layer scoping)** can now add `WHERE tenant_id = ... AND subject_id = ...` against guaranteed-non-null columns.
- **Plan 05** still owns `tests/routes/auth-layout.test.ts` (the only remaining red test — `~/routes/_app/layout` does not exist yet) and the Vercel `OWNER_INVITE_TOKEN` follow-up above.

## Self-Check: PASSED

All created files verified on disk; all task commits (`cda0a92`, `302b306`, `0644fa7`) verified in git history.

---
*Phase: 03-identity-tenancy-scoping*
*Completed: 2026-06-09*
