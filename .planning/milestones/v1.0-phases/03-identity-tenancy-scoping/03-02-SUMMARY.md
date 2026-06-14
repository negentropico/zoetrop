---
phase: 03-identity-tenancy-scoping
plan: 02
subsystem: database
tags: [drizzle, postgres, better-auth, tenancy, migrations, schema]

requires:
  - phase: 01-schema-baseline-engine-tests-auth-spike
    provides: Drizzle migrations baseline (0000) + Neon connectivity confirmed

provides:
  - Better-Auth user/session/account/verification tables in db/auth-schema.ts
  - app_role enum ('owner'|'practitioner'|'client') in schema.ts
  - tenants + subjects spine tables (text PKs matching Better-Auth user.id style)
  - Nullable tenant_id/subject_id columns on all 8 data tables (expand-contract step 1)
  - protocol_versions global UNIQUE(version) dropped (TEN-04 prerequisite)
  - Migration 0001: CREATE TYPE + CREATE TABLE spine (auto-generated)
  - Migration 0002: ADD COLUMN nullable + DROP CONSTRAINT (custom)
  - Drizzle meta: _journal.json + 0001/0002 snapshots with consistent id chain

affects: [03-03, 03-04, 03-05, 04-data-layer, 07-phi-hardening]

tech-stack:
  added: []
  patterns:
    - "db/auth-schema.ts: Better-Auth tables in separate file, barrel-re-exported from schema.ts"
    - "Expand-contract migrations: nullable first (0002) → backfill (Plan 04 0003) → NOT NULL (Plan 04 0004)"
    - "Staged drizzle-kit generate: spine-only snapshot → then --custom for second migration"
    - "text PKs for tenancy tables to match Better-Auth user.id FK type (not Postgres uuid)"

key-files:
  created:
    - remix-app/db/auth-schema.ts
    - remix-app/migrations/0001_better_auth_and_tenancy_spine.sql
    - remix-app/migrations/0002_tenancy_columns_nullable.sql
    - remix-app/migrations/meta/0001_snapshot.json
    - remix-app/migrations/meta/0002_snapshot.json
  modified:
    - remix-app/db/schema.ts
    - remix-app/migrations/meta/_journal.json

key-decisions:
  - "Staged drizzle-kit generate: ran generate twice (spine-only schema → restore full schema --custom) to produce clean intermediate snapshot for 0001; avoids hand-authoring snapshot JSON"
  - "Barrel export (export * from './auth-schema') at end of schema.ts so drizzleAdapter receives all Better-Auth tables via the single * as schema import"
  - "text PKs for tenants/subjects (not Postgres uuid type) — matches Better-Auth's user.id text PK, prevents FK type mismatch on tenant_id/subject_id columns"

patterns-established:
  - "Auth tables isolated in db/auth-schema.ts, barrel-imported into db/schema.ts"
  - "Nullable tenancy columns use expand-contract: no .notNull() yet; Plan 04 adds NOT NULL after backfill"
  - "Drizzle --custom migration for multi-step DDL that auto-generate cannot safely produce alone"

requirements-completed: [AUTH-02, TEN-01, TEN-04]

duration: 7min
completed: 2026-06-09
---

# Phase 03 Plan 02: Identity + Tenancy Schema Layer Summary

**Drizzle schema with Better-Auth tables (user/session/account/verification), app_role enum, tenants/subjects spine, and nullable tenant_id/subject_id columns on all 8 data tables — migrations 0001 (spine) and 0002 (nullable expand) generated and ready for Plan 04 apply**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-06-09T11:47:39Z
- **Completed:** 2026-06-09T11:54:20Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Created `db/auth-schema.ts` with all 4 Better-Auth tables using text PKs and cascade FKs; barrel-exported from `db/schema.ts` for `drizzleAdapter` schema resolution
- Added `appRoleEnum`, `tenants`, `subjects` tables to `schema.ts` + their Drizzle relations; removed global `.unique()` from `protocolVersions.version` (TEN-04)
- Added nullable `tenantId`/`subjectId` columns to all 8 data tables (expand-contract step 1); generated migration 0001 (spine, auto) and authored migration 0002 (nullable columns + DROP CONSTRAINT, custom) with consistent drizzle meta

## Task Commits

1. **Task 1: Create auth-schema.ts + appRoleEnum + tenants/subjects** - `464e072` (feat)
2. **Task 2: Add nullable tenant_id/subject_id to 8 tables + drop unique** - `bf8b668` (feat)
3. **Task 3: Generate 0001 spine migration + author 0002 custom** - `763aac4` (feat)

## Files Created/Modified

- `remix-app/db/auth-schema.ts` — Better-Auth user/session/account/verification tables (text PKs, boolean emailVerified, role column default 'client')
- `remix-app/db/schema.ts` — Added boolean import, appRoleEnum, tenants/subjects tables + relations, nullable tenantId/subjectId on 8 tables, barrel export
- `remix-app/migrations/0001_better_auth_and_tenancy_spine.sql` — CREATE TYPE app_role + CREATE TABLE user/session/account/verification/tenants/subjects + FKs
- `remix-app/migrations/0002_tenancy_columns_nullable.sql` — DROP CONSTRAINT protocol_versions_version_unique + ADD COLUMN tenant_id/subject_id (nullable, 8 tables) + FKs
- `remix-app/migrations/meta/_journal.json` — Journal updated with 0001/0002 entries
- `remix-app/migrations/meta/0001_snapshot.json` — Intermediate schema snapshot (spine only)
- `remix-app/migrations/meta/0002_snapshot.json` — Final schema snapshot (nullable columns applied)

## Decisions Made

- **Staged drizzle-kit generate approach:** Ran `db:generate` twice — first with spine-only schema to generate 0001 and its intermediate snapshot, then restored full schema and ran `--custom` for 0002. This produces a correct intermediate snapshot for 0001 (consistent id chain) without hand-authoring snapshot JSON.
- **text PKs for tenancy tables:** Used `text('id').primaryKey()` for tenants/subjects to match Better-Auth's own `user.id` text PK type, preventing FK type mismatches on the `tenant_id`/`subject_id` reference columns across the 8 data tables.
- **Barrel export placement:** Added `export * from './auth-schema'` at the end of `schema.ts` so the existing `* as schema` import in `db.server.ts` automatically includes the Better-Auth tables for the `drizzleAdapter`.

## Deviations from Plan

None — plan executed exactly as written. The staged generate approach was the "split by hand" option explicitly suggested in the plan's Task 3 action block.

## Issues Encountered

None — drizzle-kit behaved as expected. The `boolean` import needed for `emailVerified` was pre-identified in the plan and added cleanly.

## User Setup Required

None — no external service configuration required for this plan. Plan 04 owns the live `db:migrate` apply against Neon.

## Next Phase Readiness

- Schema source and migrations are ready for Plan 03 (`auth.server.ts` + Better-Auth config) and Plan 04 (`db:migrate` + backfill)
- `drizzleAdapter` can receive the full `* as schema` import from `db/schema.ts` — it will find all Better-Auth tables via the barrel export
- All 8 data tables have nullable `tenant_id`/`subject_id` columns in schema; Plan 04 backfills and sets NOT NULL
- `protocol_versions` global UNIQUE dropped in schema and in 0002 migration; Plan 04 adds the composite `(tenant_id, subject_id, version)` unique

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundary crossings in this plan — schema and migration files only.

## Self-Check: PASSED

- `remix-app/db/auth-schema.ts` exists: FOUND
- `remix-app/db/schema.ts` has appRoleEnum + barrel export: FOUND
- `remix-app/migrations/0001_better_auth_and_tenancy_spine.sql` exists: FOUND
- `remix-app/migrations/0002_tenancy_columns_nullable.sql` exists: FOUND
- `remix-app/migrations/meta/0001_snapshot.json` exists: FOUND
- `remix-app/migrations/meta/0002_snapshot.json` exists: FOUND
- Commits 464e072, bf8b668, 763aac4: FOUND
- tsc --noEmit: PASS
- npm test 75/75: PASS

---
*Phase: 03-identity-tenancy-scoping*
*Completed: 2026-06-09*
