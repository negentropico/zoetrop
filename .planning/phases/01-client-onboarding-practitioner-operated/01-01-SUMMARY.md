---
phase: 01-client-onboarding-practitioner-operated
plan: 01
subsystem: database
tags: [drizzle, postgres, neon, schema, migration, vitest, tdd]

# Dependency graph
requires: []
provides:
  - biologicalSexEnum + programTypeEnum declared in schema with house pgEnum style
  - subjects table extended with 8 nullable intake columns (dob, biologicalSex, contactEmail, contactPhone, goals, intakeNotes, programType, programStartDate)
  - invites table extended with nullable subjectId FK referencing subjects.id (D-01)
  - Migration 0015_odd_sage.sql generated and committed (not yet applied — pending human approval)
  - Wave-0 RED test stubs for subjects.server, getActiveSubject, checklist.server, schema-integrity, invites subjectId threading
affects:
  - 01-02 (subjects.server.ts, getActiveSubject, invites.server.ts extension — reads these schema columns)
  - 01-03 (checklist.server.ts — reads invites.subjectId + all 8 subjects intake columns)
  - 01-04 (clients UI — writes createSubject with intake fields)
  - all later plans that join subjects on intake fields

# Tech tracking
tech-stack:
  added: []
  patterns:
    - pgEnum house style (after appRoleEnum block, arrow-function values array)
    - All intake fields nullable (no .notNull()) — existing rows carry NULL, safe ADD COLUMN
    - Forward-reference FK pattern (arrow function) already used in schema — invites.subjectId follows same idiom
    - hasDb guard + lazy import in beforeAll for RED-phase-safe test files

key-files:
  created:
    - remix-app/migrations/0015_odd_sage.sql
    - remix-app/migrations/meta/0015_snapshot.json
    - remix-app/tests/lib/schema-integrity.test.ts
    - remix-app/tests/lib/subjects.test.ts
    - remix-app/tests/lib/active-subject.test.ts
    - remix-app/tests/lib/checklist.test.ts
  modified:
    - remix-app/db/schema.ts
    - remix-app/migrations/meta/_journal.json
    - remix-app/tests/auth/invites-server.test.ts

key-decisions:
  - "All 8 subjects intake columns and invites.subjectId added as nullable — existing owner subject row unaffected, non-blocking ADD COLUMN on Postgres"
  - "Migration 0015 generated but NOT applied — apply is gated to orchestrator/human approval before live Neon DDL runs"
  - "biologicalSexEnum + programTypeEnum added after appRoleEnum (house style) — enums must be declared before FK tables that reference them in Drizzle generate"

patterns-established:
  - "hasDb guard + lazy import in beforeAll: RED-phase-safe test files that do not crash at collection time when target module doesn't exist yet"
  - "schema-integrity tests: import Drizzle table objects directly, check .name property on columns — no live DB needed"

requirements-completed: [ONB-01, ONB-02]

# Metrics
duration: 25min
completed: 2026-06-14
---

# Phase 01 Plan 01: Schema Foundation + Wave-0 RED Tests Summary

**biologicalSexEnum + programTypeEnum + 8 nullable subjects intake columns + invites.subjectId FK committed to schema.ts; migration 0015_odd_sage generated and committed (Neon apply PENDING); 4 new + 1 extended Wave-0 RED test files with schema-integrity GREEN**

## MIGRATION APPLY STATUS

**Migration 0015_odd_sage.sql — GENERATED + APPLIED to Neon (2026-06-14, human-approved).**

The SQL is committed at `remix-app/migrations/0015_odd_sage.sql`. The executor ran `db:generate` only (apply gated). The orchestrator then applied it after explicit human approval: `npm run db:migrate` → "migrations applied successfully". Verified against Neon via information_schema: `subjects` has all 8 new columns (all nullable), `invites.subject_id` present + nullable FK, `audit_log.subject_id` nullable, enums `biological_sex` + `program_type` present. Existing rows carry NULL for new columns (non-destructive).

Note: 0015 also re-emitted two idempotent drift statements (audit_log DROP NOT NULL — already nullable from hand-written 0013; psa partial-index drop/recreate — identical to hand-written 0014). These are no-ops/identical recreations caused by hand-written migrations not updating Drizzle's meta snapshot; applying 0015 heals that snapshot drift.

```bash
# Applied via (run from remix-app/ with DATABASE_URL_UNPOOLED in .env):
npm run db:migrate
```

The migration ALTERs two tables:
- `ALTER TABLE "subjects"` — ADD COLUMN ×8 (dob, biological_sex, contact_email, contact_phone, goals, intake_notes, program_type, program_start_date) — all nullable, non-blocking
- `ALTER TABLE "invites"` — ADD COLUMN "subject_id" text (nullable FK → subjects.id)
- `CREATE TYPE "public"."biological_sex"` and `"public"."program_type"` (2 new enum types)

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-14T06:00:00Z
- **Completed:** 2026-06-14T06:25:00Z
- **Tasks:** 3 (Task 1 done, Task 2 migration generated + committed, Task 3 done)
- **Files modified:** 8

## Accomplishments

- Extended `remix-app/db/schema.ts` with 2 new enums and 9 new columns (8 subjects + 1 invites) — TypeScript compiles clean
- Generated migration `0015_odd_sage.sql` with `npm run db:generate` and committed the SQL + snapshot + updated journal
- Scaffolded 4 new Wave-0 RED test files + extended `invites-server.test.ts` with ONB-02 subjectId describe blocks
- `schema-integrity.test.ts` passes GREEN (12/12) — validates the Drizzle schema objects expose all new column keys without touching the live DB

## Task Commits

1. **Task 1: Extend schema — subjects intake fields + invites.subjectId + new enums** - `5a5fd1d` (feat)
2. **Task 2: Generate migration 0015_odd_sage** - `241cf04` (chore — db:generate only; db:migrate GATED)
3. **Task 3: Scaffold Wave-0 RED test files** - `b8fb5e0` (test)

## Files Created/Modified

- `remix-app/db/schema.ts` — biologicalSexEnum, programTypeEnum, 8 subjects intake columns, invites.subjectId FK
- `remix-app/migrations/0015_odd_sage.sql` — generated migration SQL (not yet applied to Neon)
- `remix-app/migrations/meta/_journal.json` — updated with 0015_odd_sage entry
- `remix-app/migrations/meta/0015_snapshot.json` — Drizzle schema snapshot for migration 0015
- `remix-app/tests/lib/schema-integrity.test.ts` — GREEN; Drizzle column introspection (no DB)
- `remix-app/tests/lib/subjects.test.ts` — RED; contract for subjects.server.ts (Plan 01-02)
- `remix-app/tests/lib/active-subject.test.ts` — RED; contract for getActiveSubject (Plan 01-02)
- `remix-app/tests/lib/checklist.test.ts` — RED; contract for checklist.server.ts (Plan 01-03)
- `remix-app/tests/auth/invites-server.test.ts` — extended with ONB-02 subjectId describe blocks (generateInvite, resolveInviteByToken, consumeInviteByToken return shapes)

## Decisions Made

- All new columns nullable — no `.notNull()` on any intake field or `invites.subjectId`. Existing owner-subject row carries NULL for all new columns (safe, non-breaking ADD COLUMN on Postgres 11+).
- Migration generate-only in this plan — apply is explicitly gated to orchestrator/human review before any live DDL on the Neon production database.
- `biologicalSexEnum` and `programTypeEnum` declared immediately after `appRoleEnum` in the enums block (house style) so they are available for forward-reference in the `subjects` table definition.

## Deviations from Plan

None — plan executed exactly as written. The `db:migrate` gate in Task 2 was honored: only `db:generate` was run, per the CRITICAL_migration_gate directive in the execution prompt.

## Test Suite State

| File | State | Note |
|------|-------|------|
| `tests/lib/schema-integrity.test.ts` | GREEN (12/12) | Drizzle schema column introspection — no DB needed |
| `tests/lib/subjects.test.ts` | RED (expected) | subjects.server.ts not yet created (Plan 01-02) |
| `tests/lib/active-subject.test.ts` | RED (expected) | getActiveSubject not in data.server yet (Plan 01-02) |
| `tests/lib/checklist.test.ts` | RED (expected) | checklist.server.ts not yet created (Plan 01-03) |
| `tests/auth/invites-server.test.ts` | GREEN (17/17) | Pre-existing tests pass; new ONB-02 blocks pass structurally |
| All other test files | GREEN (unchanged) | 312 passing, 80 skipping (hasDb guard) |

RED stubs are EXPECTED — they reference modules that downstream plans implement. The suite collects without collection-time crashes (lazy import in beforeAll pattern).

**DB-dependent tests in RED stubs:** Because `DATABASE_URL` is present in `.env`, `hasDb=true` and DB-gated tests in the RED stubs run (not skip). They fail with clear "implement in Plan 01-NN" messages — not DB errors. This is TDD RED: the failure message tells the next executor exactly what to implement.

## Issues Encountered

None. TypeScript typecheck passed clean after schema edits (no new errors). Migration generation succeeded on first run. Forward-reference FK in `invites.subjectId` works correctly (same arrow-function pattern already used for `metrics.subjectId` which precedes the `subjects` table definition).

## User Setup Required

**Migration apply required before live Neon reflects new columns.** The executor ran only `npm run db:generate`. To complete the schema migration:

```bash
cd remix-app
npm run db:migrate   # applies 0015_odd_sage.sql to Neon via DATABASE_URL_UNPOOLED
```

Verify after apply:
1. `npm run db:studio` → confirm `subjects` has dob, biological_sex, contact_email, contact_phone, goals, intake_notes, program_type, program_start_date (all NULL for existing row)
2. Confirm `invites` has `subject_id` column (NULL for existing invite rows)

## Next Phase Readiness

- `schema.ts` is ready for Plan 01-02 (subjects.server.ts + getActiveSubject + invites.server.ts subjectId threading)
- Migration 0015 SQL is committed and ready to apply — once applied, the RED DB-gated tests in subjects/active-subject/checklist will have the correct columns to test against
- `schema-integrity.test.ts` serves as the ongoing guard that schema column presence is maintained
- Plans 01-02 through 01-07 can all be planned/executed after migration 0015 is applied to Neon

---
*Phase: 01-client-onboarding-practitioner-operated*
*Completed: 2026-06-14*
