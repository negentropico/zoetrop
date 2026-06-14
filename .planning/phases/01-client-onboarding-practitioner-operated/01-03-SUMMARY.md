---
phase: 01-client-onboarding-practitioner-operated
plan: 03
subsystem: api
tags: [drizzle, postgres, neon, vitest, tdd, subjects, checklist, rls, onboarding]

# Dependency graph
requires:
  - phase: 01-client-onboarding-practitioner-operated/01-01
    provides: subjects intake columns + invites.subjectId FK + Wave-0 RED test stubs
  - phase: 01-client-onboarding-practitioner-operated/01-02
    provides: getActiveSubject + db.server.ts withTenantDb + TenantCtx type
provides:
  - subjects.server.ts: createSubject, listClientSubjects, listSubjectsForTenant, getSubjectById (admin path, tenant-scoped)
  - checklist.server.ts: getChecklistStatus (3-state per onboarding step), ChecklistStatus, ChecklistState types
  - tests/lib/subjects.test.ts GREEN (was RED in Plan 01-01)
  - tests/lib/checklist.test.ts GREEN (was RED in Plan 01-01)
  - DB_URL_STUBBED guard added to subjects.test.ts + checklist.test.ts (consistency fix)
affects:
  - 01-04 (clients UI route — consumes createSubject + getChecklistStatus)
  - 01-05 and later (any route that lists/creates client subjects)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Admin-path CRUD service pattern (getDb() not withTenantDb — subject write before TenantCtx exists)
    - InferInsertModel<typeof subjects> for insert type — matches schema enum literals exactly
    - withTenantDb + parallel Promise.all for multi-table checklist reads (RLS-governed)
    - Admin-path invites lookup inside withTenantDb closure — intentional mixing, both server-only
    - Approval-gated labs state — done only when labExtractions.status='approved' (D-10)
    - DB_URL_STUBBED guard on hasDb in test files (established pattern from active-subject.test.ts)

key-files:
  created:
    - remix-app/app/lib/subjects.server.ts
    - remix-app/app/lib/checklist.server.ts
  modified:
    - remix-app/tests/lib/subjects.test.ts (DB_URL_STUBBED guard fix)
    - remix-app/tests/lib/checklist.test.ts (DB_URL_STUBBED guard fix)

key-decisions:
  - "Used InferInsertModel<typeof subjects> for CreateSubjectData — enforces enum literals for biologicalSex/programType at compile time; string was too loose"
  - "consentLog has no tenantId column — scoped by subjectId only in checklist query (confirmed from schema.ts L407-416)"
  - "Invite lookup uses getDb() inside the withTenantDb callback — invites table not subject-scoped under RLS; explicit WHERE tenantId+subjectId is the guard"

patterns-established:
  - "InferInsertModel<T> for insert input types: prevents enum widening that string accepts"
  - "DB_URL_STUBBED guard is REQUIRED on all hasDb declarations in test files that use DATABASE_URL"

requirements-completed: [ONB-01, ONB-04]

# Metrics
duration: 10min
completed: 2026-06-14
---

# Phase 01 Plan 03: Subjects + Checklist Service Modules Summary

**Admin-path CRUD service for subject intake rows (subjects.server.ts) and approval-gated 3-state onboarding checklist (checklist.server.ts) with subjects.test.ts + checklist.test.ts GREEN**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-14T13:25:00Z
- **Completed:** 2026-06-14T13:29:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `app/lib/subjects.server.ts` with four CRUD helpers on the admin path (no withTenantDb — subject writes precede TenantCtx construction); all queries tenant-scoped
- Created `app/lib/checklist.server.ts` with `getChecklistStatus` returning honest 3-state per onboarding dimension; labs require `status='approved'` (D-10); invite state reads `consumedAt`
- Both `tests/lib/subjects.test.ts` and `tests/lib/checklist.test.ts` GREEN (were RED since Plan 01-01)
- `npm run typecheck` now 0 errors (2 forward-ref errors resolved); `npm run build` clean (no .server leak)

## Task Commits

1. **Task 1: Create subjects.server.ts service** - `a0249a3` (feat)
2. **Task 2: Create checklist.server.ts + type fix** - `5e62b6d` (feat)

## Files Created/Modified

- `remix-app/app/lib/subjects.server.ts` — createSubject (InferInsertModel insert), listClientSubjects (ne owner), listSubjectsForTenant, getSubjectById (null return); admin getDb() path
- `remix-app/app/lib/checklist.server.ts` — ChecklistState type, ChecklistStatus interface, getChecklistStatus (withTenantDb + Promise.all + admin-path invites)
- `remix-app/tests/lib/subjects.test.ts` — added `!process.env["DB_URL_STUBBED"]` to hasDb guard
- `remix-app/tests/lib/checklist.test.ts` — added `!process.env["DB_URL_STUBBED"]` to hasDb guard

## Decisions Made

- `CreateSubjectData = InferInsertModel<typeof subjects>` — using Drizzle's inferred insert type instead of a hand-rolled interface prevents enum widening (`biologicalSex: string` was too loose and caused a TS2769 error; the schema requires the literal union `"male" | "female" | "intersex"`).
- `consentLog` has no `tenantId` column (confirmed from schema.ts lines 407-416) — the checklist query scopes consent reads by `subjectId` only, which is sufficient (subjectId is unique per tenant).
- The invite lookup uses `getDb()` inside the `withTenantDb` callback — this is intentional per PATTERNS.md Build-Gate note 2. The invites table is not subject-scoped under RLS; explicit `WHERE tenantId AND subjectId` is the guard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing DB_URL_STUBBED guard in subjects.test.ts + checklist.test.ts**
- **Found during:** Task 1 (subjects.server.ts verification)
- **Issue:** `hasDb` in subjects.test.ts and checklist.test.ts used `!!(DATABASE_URL_UNPOOLED || DATABASE_URL)`. With the test-setup stub active (`DB_URL_STUBBED=1`), `DATABASE_URL` is set to a fake Postgres URL, making `hasDb=true` and causing the DB round-trip test to execute against the stub → connection failure.
- **Fix:** Added `!process.env["DB_URL_STUBBED"] &&` prefix to both `hasDb` declarations, matching the established pattern in `active-subject.test.ts` (line 25).
- **Files modified:** `tests/lib/subjects.test.ts`, `tests/lib/checklist.test.ts`
- **Verification:** `npm test -- tests/lib/subjects.test.ts` → 2 passed, 1 skipped (DB round-trip now correctly skipped with stub)
- **Committed in:** `a0249a3` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed CreateSubjectData biologicalSex/programType type (string → enum literals)**
- **Found during:** Task 2 typecheck run
- **Issue:** Hand-rolled `CreateSubjectData` interface typed `biologicalSex` as `string | null | undefined`, which is too wide for the `biologicalSexEnum('biological_sex')` column. TypeScript raised TS2769 on the `db.insert(subjects).values(data)` call.
- **Fix:** Replaced the hand-rolled interface with `type CreateSubjectData = InferInsertModel<typeof subjects>` — Drizzle's inferred insert type matches the schema exactly.
- **Files modified:** `remix-app/app/lib/subjects.server.ts`
- **Verification:** `npm run typecheck` → 0 errors
- **Committed in:** `5e62b6d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep. The DB_URL_STUBBED fix aligns these test files with the established pattern already present in active-subject.test.ts.

## Issues Encountered

None beyond the two auto-fixed Rule 1 bugs above.

## Known Stubs

None — both service modules return real data shapes. No hardcoded empty values or placeholder text.

## Threat Flags

No new threat surface introduced. Both modules are server-only (`.server.ts` suffix); no new network endpoints, auth paths, or schema changes. The `T-01-checklist-bleed` and `T-01-false-done` mitigations from the plan's threat register are implemented as specified.

## Next Phase Readiness

- `subjects.server.ts` + `checklist.server.ts` are stable, tested contracts for the `/clients` route (Plan 01-04)
- `tests/lib/subjects.test.ts` + `tests/lib/checklist.test.ts` are GREEN (structural assertions + DB-gated cases correctly skip with stub)
- `npm run typecheck` → 0 errors; `npm run build` → clean
- Full test suite: 316 passed, 89 skipped (all DB-gated skips expected)

---
*Phase: 01-client-onboarding-practitioner-operated*
*Completed: 2026-06-14*
