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
  duration: ~20min
  completed_date: "2026-06-12"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 5
---

# Phase 07 Plan 08: PSA Partial Unique Index + Structured Error Matching Summary

One-liner: Replaced full unique index on practitioner_subject_assignments with a partial index (WHERE revoked_at IS NULL) applied to live Neon, plus structured 23505 error matching — the assign/revoke/re-assign lifecycle now works repeatedly (CR-02 closed).

## Status

**COMPLETE** — 3/3 tasks. Task 2 (blocking human-verify checkpoint) approved: migration 0014 applied to live Neon (orange-paper-97068012) via drizzle-kit migrate; `pg_indexes.indexdef` verified to contain `WHERE (revoked_at IS NULL)`; drizzle migration ledger head matches journal entry 0014 (created_at=1781300000000).

## What Was Built

### Task 1: Partial unique index + migration 0014 (commit e32a02f)

- `remix-app/db/schema.ts`: added `sql` import from `drizzle-orm`; changed `idx_psa_active_unique` uniqueIndex to `.where(sql\`revoked_at IS NULL\`)` — only active rows participate in uniqueness
- `remix-app/migrations/0014_psa_partial_unique_index.sql`: hand-authored migration (matching 0013 header-comment style) that atomically `DROP INDEX IF EXISTS "idx_psa_active_unique"` then `CREATE UNIQUE INDEX ... WHERE revoked_at IS NULL`
- `remix-app/migrations/meta/_journal.json`: appended entry idx=14, tag=0014_psa_partial_unique_index, when=1781300000000

### Task 2: Live Neon migration apply (human-verify checkpoint — APPROVED)

Orchestrator applied migration 0014 to the live Neon project (orange-paper-97068012) via `drizzle-kit migrate` (`[✓] migrations applied successfully!`). Verified:

```
SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_psa_active_unique';
→ CREATE UNIQUE INDEX idx_psa_active_unique ON public.practitioner_subject_assignments
  USING btree (tenant_id, practitioner_id, subject_id) WHERE (revoked_at IS NULL)
```

Migration ledger: `drizzle."__drizzle_migrations"` head id=16, created_at=1781300000000 (matches journal entry 0014). Journal and DB agree.

### Task 3: Structured 23505 matching + round-trip test (commit 25800cf)

- `remix-app/app/lib/assignments.server.ts`: replaced fragile `msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505")` with `(err as { code?: string }).code === '23505'` (structured Postgres error-code check); updated doc-comments to note 23505 now fires only for a genuinely active duplicate
- `remix-app/tests/lib/assignments.test.ts`: added `DB_URL_STUBBED/connectionString` skip-guard (mirroring rls-isolation.test.ts); added `describe.skipIf(!connectionString)` round-trip block exercising assign → unassign → assign with the regression assertion that `listAssignedSubjectIds` returns the subject after the second assign; disposable per-run fixtures (tenant/subject/owner/practitioner) created in beforeAll, cleaned up in FK order in afterAll

## Verification Results

- `grep -Eq "uniqueIndex\('idx_psa_active_unique'\).*\.where\(sql" db/schema.ts` — PASS
- `grep "WHERE revoked_at IS NULL" migrations/0014_psa_partial_unique_index.sql` — PASS
- `grep "DROP INDEX IF EXISTS" migrations/0014_psa_partial_unique_index.sql` — PASS
- `grep "0014_psa_partial_unique_index" migrations/meta/_journal.json` — PASS
- `npm run typecheck` (react-router typegen && tsc) — exit 0, PASS
- `grep -Eq "code\s*===\s*['\"]23505['\"]" app/lib/assignments.server.ts` — PASS
- `DB_URL_STUBBED=1 npx vitest run tests/lib/assignments.test.ts` — 14 passed, 1 skipped, 0 failed (skip-guard works in CI mode) — PASS
- `DB_URL_STUBBED=1 npx vitest run` (full suite) — 288 passed, 80 skipped, 0 failed — PASS
- `npm run build` — build completed ("built in 714ms"), no Server-only bundle leaks — PASS
- **Live DB (post-Task-2):** `pg_indexes.indexdef` for idx_psa_active_unique contains `WHERE (revoked_at IS NULL)` — PASS
- **Live round-trip (post-Task-2):** `npx vitest run tests/lib/assignments.test.ts` with live DATABASE_URL_UNPOOLED — **15 passed, 0 skipped, 0 failed** — the assign → unassign → assign lifecycle grants real active access against the live partial index (the regression assertion that fails against the full index) — PASS

## Success Criteria (plan)

- [x] idx_psa_active_unique is a partial unique index (`WHERE revoked_at IS NULL`) in schema.ts, in migration 0014, and on the live Neon DB
- [x] assign → unassign → assign for the same (tenant, practitioner, subject) triple grants real active access (regression test green against live DB; skips cleanly in CI)
- [x] assignSubject uses structured 23505 error matching, not substring matching
- [x] Typecheck, unit tests, and `npm run build` all pass

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | e32a02f | feat(07-08): partial unique index for practitioner_subject_assignments (CR-02) |
| Task 3 | 25800cf | feat(07-08): structured 23505 error matching + round-trip regression test (CR-02) |
| Checkpoint | 4073a22 | docs(07-08): partial SUMMARY.md — Tasks 1+3 complete, paused at Task 2 checkpoint |

## Deviations from Plan

**Task ordering:** Task 3 (code-only, DB-gated test with skip guards) was executed before the Task 2 checkpoint, since it requires no live DB and the checkpoint protocol calls for committing all completable work before pausing. The live round-trip proof was then run after Task 2 approval, completing Task 3's full acceptance. No functional deviation from the plan's intent.

Otherwise: none — plan executed exactly as written.

## Authentication Gates

Task 2 was a planned blocking human-verify gate (live Neon migration apply), resolved by the orchestrator applying drizzle-kit migrate and verifying pg_indexes — documented above, normal flow.

## Known Stubs

None — no stub patterns in the modified files.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes at trust boundaries beyond what is documented in the plan's threat model. Threat register dispositions verified: T-07-08-01 (partial index live), T-07-08-02 (structured 23505), T-07-08-03 (human-verified live apply with indexdef proof) all mitigated; T-07-08-04 accepted as planned.

## Self-Check: PASSED

- remix-app/db/schema.ts: FOUND
- remix-app/migrations/0014_psa_partial_unique_index.sql: FOUND
- remix-app/migrations/meta/_journal.json: FOUND (entry idx=14 present)
- remix-app/app/lib/assignments.server.ts: FOUND (23505 structured check present)
- remix-app/tests/lib/assignments.test.ts: FOUND (round-trip block present)
- e32a02f: FOUND in git log
- 25800cf: FOUND in git log
- Live index partial: VERIFIED via pg_indexes.indexdef
- Live round-trip test: 15/15 passed
