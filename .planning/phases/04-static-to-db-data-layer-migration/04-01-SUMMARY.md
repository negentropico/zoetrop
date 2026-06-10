---
phase: 04-static-to-db-data-layer-migration
plan: "01"
subsystem: database
tags: [schema, migration, vestige-sweep, subject_genotypes, test-scaffolds, phi-guard]
dependency_graph:
  requires: [phase-03-tenancy-migration]
  provides: [subject_genotypes-table, migration-0006, wave-0-test-scaffolds, phi-fixture-gitignore]
  affects: [remix-app/db/schema.ts, remix-app/migrations, remix-app/tests]
tech_stack:
  added: []
  patterns: [drizzle-kit-generate-then-review, tdd-red-green, skip-guarded-db-tests]
key_files:
  created:
    - remix-app/migrations/0006_cultured_patriot.sql
    - remix-app/migrations/meta/0006_snapshot.json
    - remix-app/tests/db/data-seed.test.ts
    - remix-app/tests/parity/loader-parity.test.ts
  modified:
    - remix-app/db/schema.ts
    - remix-app/app/types/metrics.ts
    - remix-app/app/lib/db.server.ts
    - remix-app/app/lib/real-data.ts
    - remix-app/app/lib/seed-data.ts
    - remix-app/app/routes/_app/metrics/detail.tsx
    - remix-app/.gitignore
    - remix-app/migrations/meta/_journal.json
decisions:
  - "Migration file kept as auto-generated name (0006_cultured_patriot.sql) to avoid journal desync"
  - "Migration SQL manually patched: DROP DEFAULT + USING is_active::boolean required for integer to boolean Postgres cast"
  - "syncStatus/syncVersion vestige sweep extended to real-data.ts, seed-data.ts, and detail.tsx (all referenced removed BaseMetric fields)"
  - "DATA-02 row-count assertions skip-guarded (it.skip) pending Plan 03 seed — tables empty at this stage"
metrics:
  duration: "565s"
  completed_date: "2026-06-10"
  tasks: 3
  files: 11
---

# Phase 4 Plan 1: Schema Vestige Sweep + subject_genotypes + Wave-0 Scaffolds Summary

**One-liner:** Dropped syncStatus/syncVersion from schema and types; added subject_genotypes table with tenant/subject FK + composite index; applied migration 0006 to live Neon; stood up PHI fixture gitignore guard and DATA-02/DATA-01 Wave-0 test scaffolds.

## What Was Built

### Task 1 — Schema vestige sweep + subject_genotypes + db.server cleanup (RED/GREEN)

**TDD cycle:** RED test committed (9e65abb), GREEN implementation committed (d57dd03).

**Schema changes (db/schema.ts):**
- Removed `syncStatusEnum` pgEnum declaration
- Removed `syncStatus` and `syncVersion` columns from `metrics` table
- Changed `supplements.isActive` from `integer('is_active').notNull().default(1)` to `boolean('is_active').notNull().default(true)` (dropped SQLite compat comment)
- Fixed stale `(601 to 602 to 603)` comment to `(P0 to P6)`
- Added `subjectGenotypes` pgTable (`subject_genotypes`) with: `id` integer PK generatedAlwaysAsIdentity; `gene` varchar(100) notNull; `rsid` varchar(20) nullable; `genotype` varchar(50) notNull; `assaySource` varchar(100) nullable; `createdAt` timestamp defaultNow; `tenantId` text notNull FK to tenants; `subjectId` text notNull FK to subjects; composite `idx_subject_genotypes_tenant_subject` index on (tenantId, subjectId)
- Added `subjectGenotypesRelations` block (one tenant, one subject)
- `gene` documented as join key for Phase 4 genetics knowledge module (D-03)

**Type changes (app/types/metrics.ts):**
- Removed `export type SyncStatus`
- Removed `syncStatus: SyncStatus` and `syncVersion: number` from `BaseMetric`
- Removed `syncVersion: number` from `StoredMetrics`
- No subcategory union widening needed (audit confirmed all real values present)

**Connection string cleanup (app/lib/db.server.ts):**
- `getPool` now resolves `process.env.DATABASE_URL` only (removed `NETLIFY_DATABASE_URL ||` fallback)
- Error message updated: "DATABASE_URL is required. Set it in .env or Vercel environment variables."

### Task 2 — Migration 0006 generated + applied to live Neon

**Generated migration:** `migrations/0006_cultured_patriot.sql`

The migration required two manual edits before it would apply cleanly:

1. **USING clause:** Postgres cannot cast integer to boolean automatically; added `USING is_active::boolean`
2. **DROP DEFAULT first:** Postgres refuses to change column type when a default value exists that can't be auto-cast; added `ALTER COLUMN "is_active" DROP DEFAULT` before the SET DATA TYPE

**Final migration SQL order:**
1. `CREATE TABLE "subject_genotypes"` (with all columns)
2. `ALTER TABLE "supplements" ALTER COLUMN "is_active" DROP DEFAULT`
3. `ALTER TABLE "supplements" ALTER COLUMN "is_active" SET DATA TYPE boolean USING is_active::boolean`
4. `ALTER TABLE "supplements" ALTER COLUMN "is_active" SET DEFAULT true`
5. FK constraints + composite index for subject_genotypes
6. `ALTER TABLE "metrics" DROP COLUMN "sync_status"` (column drops BEFORE type drop)
7. `ALTER TABLE "metrics" DROP COLUMN "sync_version"`
8. `DROP TYPE "public"."sync_status"` (type drop LAST — correct order per Pitfall 2)

**Migration outcome:** Applied to live Neon (`orange-paper-97068012`). Re-run of `db:generate` confirms no snapshot drift.

**DATA-05 schema-columns.test.ts:** 19/19 tests pass against live Neon (new DATA-05 block + existing TEN-01 block).

**subject_genotypes resolved column set:** `id`, `gene`, `rsid`, `genotype`, `assay_source`, `created_at`, `tenant_id`, `subject_id`

### Task 3 — PHI fixture gitignore + Wave-0 test scaffolds

**PHI guard (remix-app/.gitignore):** Added `tests/fixtures/` BEFORE any fixture capture — ordering requirement from T-04-PHI-FIX and D-09. Verified with `git check-ignore`.

**DATA-02 scaffold (tests/db/data-seed.test.ts):**
- `SEEDED_TABLES` const: metrics(40), protocol_versions(7), protocol_changes(20), milestones(8), supplements(15), correlations(10), cessation_log(1), subject_genotypes(15)
- `describe.skipIf(!connectionString)` outer guard
- Row-count assertions are `it.skip` pending Plan 03 seed — tables are empty at this stage. Un-skip after Plan 03 seed script runs.

**DATA-01 scaffold (tests/parity/loader-parity.test.ts):**
- `FIXED_NOW = new Date("2026-06-10T00:00:00.000Z")` exported for Plan 04 loader injection
- `describe.skipIf(!connectionString)` guard
- 5 `it.todo` placeholders for per-loader fixture assertions (Plan 04 fills them)
- Imports no static data modules (`real-data`, `protocol-data`, `seed-data`)

**Test suite:** 16 passed | 2 skipped (18 total files); 142 pass | 8 skip | 5 todo — all clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended vestige sweep to real-data.ts, seed-data.ts, detail.tsx**
- **Found during:** Task 1 typecheck
- **Issue:** After removing `syncStatus`/`syncVersion` from `BaseMetric`, `real-data.ts` (77 occurrences), `seed-data.ts` (2 occurrences), and `detail.tsx` (1 UI render) referenced the removed fields, causing TypeScript errors
- **Fix:** Removed all `syncStatus: "local"` and `syncVersion: 1` object literal properties from both data files; removed the "Sync status" display panel from detail.tsx
- **Files modified:** `app/lib/real-data.ts`, `app/lib/seed-data.ts`, `app/routes/_app/metrics/detail.tsx`
- **Commit:** d57dd03

**2. [Rule 1 - Bug] Migration required DROP DEFAULT before SET DATA TYPE**
- **Found during:** Task 2 migration apply
- **Issue:** `ALTER COLUMN "is_active" SET DATA TYPE boolean USING is_active::boolean` failed with "default for column cannot be cast automatically to type boolean" because the column had `DEFAULT 1` (integer)
- **Fix:** Added `ALTER COLUMN "is_active" DROP DEFAULT` as the step immediately before the type change
- **Files modified:** `remix-app/migrations/0006_cultured_patriot.sql`
- **Commit:** 5c10c69

**3. [Rule 1 - Bug] Migration table desync during failed first attempt**
- **Found during:** Task 2 migration apply — first attempt
- **Issue:** The first migration attempt (without USING clause) failed but Drizzle had already recorded migration id=6 in `drizzle.__drizzle_migrations`. When that record was deleted to retry, it accidentally deleted the 0005_fantastic_deadpool record (which was also id=6 by sequence), causing Drizzle to attempt re-applying 0005
- **Fix:** Re-inserted the 0005 hash record manually before re-applying 0006
- **Impact:** Zero data loss; DB state was fully rolled back by Postgres on failure

## Known Stubs

None — this plan produces infrastructure and tests only, no UI stubs.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. The `subject_genotypes` table is covered by the plan's threat model (T-04-PHI-FIX for fixture guard, T-04-MIG-ORD for migration ordering, T-04-DRIFT for snapshot).

## Self-Check: PASSED
