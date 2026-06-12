---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "08"
subsystem: assignments
tags: [auth, rls, partial-index, postgres, assignments, cr-02]
dependency_graph:
  requires: []
  provides: [partial-unique-index-psa, structured-23505-error-matching, round-trip-regression-test]
  affects: [remix-app/db/schema.ts, remix-app/app/lib/assignments.server.ts, remix-app/tests/lib/assignments.test.ts]
tech_stack:
  added: []
  patterns: [partial-unique-index, structured-postgres-error-code-matching, db-gated-vitest-skip-guard]
key_files:
  created:
    - remix-app/migrations/0014_psa_partial_unique_index.sql
  modified:
    - remix-app/db/schema.ts
    - remix-app/migrations/meta/_journal.json
    - remix-app/app/lib/assignments.server.ts
    - remix-app/tests/lib/assignments.test.ts
decisions:
  - "Partial unique index (WHERE revoked_at IS NULL) on practitioner_subject_assignments — only active rows participate in uniqueness; revoked rows do not block re-assignment (CR-02)"
  - "Structured Postgres error-code check (code === '23505') replaces fragile substring matching in assignSubject catch block"
  - "Round-trip regression test uses describe.skipIf(!connectionString) guard matching rls-isolation.test.ts pattern; skips in CI, runs against live Neon"
metrics:
  duration: ~12min
  completed_date: "2026-06-12"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 5
---

# Phase 07 Plan 08: PSA Partial Unique Index + Structured Error Matching Summary

One-liner: Replace full unique index on practitioner_subject_assignments with partial index (WHERE revoked_at IS NULL) and structured 23505 error matching, enabling revoke-then-reassign lifecycle (CR-02).

## Status

**PAUSED AT CHECKPOINT** — Tasks 1 and 3 complete. Task 2 (live Neon migration apply) is a `checkpoint:human-verify gate="blocking"` that requires the owner to apply migration 0014 to the live Neon database and confirm `pg_indexes.indexdef` contains `WHERE (revoked_at IS NULL)`.

## What Was Built

### Task 1: Partial unique index + migration 0014 (commit e32a02f)

- `remix-app/db/schema.ts`: added `sql` import from `drizzle-orm`; changed `idx_psa_active_unique` uniqueIndex to `.where(sql\`revoked_at IS NULL\`)` — only active rows participate in uniqueness
- `remix-app/migrations/0014_psa_partial_unique_index.sql`: hand-authored migration (matching 0013 header-comment style) that atomically `DROP INDEX IF EXISTS "idx_psa_active_unique"` then `CREATE UNIQUE INDEX ... WHERE revoked_at IS NULL`
- `remix-app/migrations/meta/_journal.json`: appended entry idx=14, tag=0014_psa_partial_unique_index, when=1781300000000

### Task 2: [BLOCKED — human checkpoint]

Migration 0014 must be applied to the live Neon project (orange-paper-97068012). The build and typecheck pass WITHOUT the live apply (Drizzle types come from schema config, not the live DB) — verification of CR-02 is a false-positive until the live index is partial.

### Task 3: Structured 23505 matching + round-trip test (commit 25800cf)

- `remix-app/app/lib/assignments.server.ts`: replaced fragile `msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505")` with `(err as { code?: string }).code === '23505'` (structured Postgres error-code check); updated doc-comments
- `remix-app/tests/lib/assignments.test.ts`: added `DB_URL_STUBBED/connectionString` skip-guard (mirroring rls-isolation.test.ts); added `describe.skipIf(!connectionString)` round-trip block that exercises assign → unassign → assign with the regression assertion `listAssignedSubjectIds` returns the subject after the second assign

## Verification Results

- `grep -Eq "uniqueIndex\('idx_psa_active_unique'\).*\.where\(sql" db/schema.ts` — PASS
- `grep "WHERE revoked_at IS NULL" migrations/0014_psa_partial_unique_index.sql` — PASS
- `grep "DROP INDEX IF EXISTS" migrations/0014_psa_partial_unique_index.sql` — PASS
- `grep "0014_psa_partial_unique_index" migrations/meta/_journal.json` — PASS
- `npm run typecheck` (react-router typegen && tsc) — exit 0, PASS
- `grep -Eq "code\s*===\s*['\"]23505['\"]" app/lib/assignments.server.ts` — PASS
- `DB_URL_STUBBED=1 npx vitest run tests/lib/assignments.test.ts` — 14 passed, 1 skipped, 0 failed — PASS
- `DB_URL_STUBBED=1 npx vitest run` (full suite) — 288 passed, 80 skipped, 0 failed — PASS
- `npm run build` — build completed ("built in 714ms"), no Server-only bundle leaks — PASS

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | e32a02f | feat(07-08): partial unique index for practitioner_subject_assignments (CR-02) |
| Task 3 | 25800cf | feat(07-08): structured 23505 error matching + round-trip regression test (CR-02) |

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 3.

## Known Stubs

None — no stub patterns in the modified files.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes at trust boundaries beyond what is documented in the plan's threat model (T-07-08-01 through T-07-08-04).

## Self-Check: PASSED

- remix-app/db/schema.ts: FOUND
- remix-app/migrations/0014_psa_partial_unique_index.sql: FOUND
- remix-app/migrations/meta/_journal.json: FOUND (entry idx=14 present)
- remix-app/app/lib/assignments.server.ts: FOUND (23505 structured check present)
- remix-app/tests/lib/assignments.test.ts: FOUND (round-trip block present)
- e32a02f: FOUND in git log
- 25800cf: FOUND in git log
