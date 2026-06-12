---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "05"
subsystem: authz/routes
tags: [auth, security, phi, routes, assignment-gate]
dependency_graph:
  requires: ["07-01", "07-02", "07-03", "07-04"]
  provides: ["AUTH-03-complete", "CR-01-closed"]
  affects:
    - remix-app/app/routes/_app/ingest/upload.tsx
    - remix-app/app/routes/_app/ingest/review.tsx
    - remix-app/app/routes/_app/reports/generate.tsx
    - remix-app/app/routes/_app/reports/index.tsx
    - remix-app/app/routes/_app/reports/detail.tsx
    - remix-app/tests/lib/per-assignment-wiring.test.ts
tech_stack:
  added: []
  patterns:
    - "practitioner-conditional listAssignedSubjectIds(ctx, user.id) before assertSubjectAccess(user, subject, tenantId, assignedIds)"
key_files:
  created:
    - remix-app/tests/lib/per-assignment-wiring.test.ts
  modified:
    - remix-app/app/routes/_app/ingest/upload.tsx
    - remix-app/app/routes/_app/ingest/review.tsx
    - remix-app/app/routes/_app/reports/generate.tsx
    - remix-app/app/routes/_app/reports/index.tsx
    - remix-app/app/routes/_app/reports/detail.tsx
decisions:
  - "ctx construction moved above assertSubjectAccess in all routes where it was built after the check, enabling the async listAssignedSubjectIds call before the gate"
  - "review.tsx action and reports/detail.tsx loader now pass concrete subject ids (extraction.subjectId / report.subjectId) so Gate 3 can evaluate rather than trivially deny"
metrics:
  duration: 250s
  completed: "2026-06-12"
  tasks_completed: 3
  files_changed: 6
---

# Phase 07 Plan 05: Wire Per-Assignment Practitioner Gate (AUTH-03) Summary

**One-liner:** Wired `listAssignedSubjectIds(ctx, user.id)` as the 4th arg to `assertSubjectAccess` in all five practitioner-admitting routes, closing the CR-01 dead-code gap where Gate 3 was permanently skipped at runtime.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — per-assignment gate matrix unit tests | c28ec33 | tests/lib/per-assignment-wiring.test.ts |
| 2 | Wire ingest routes (upload.tsx + review.tsx) | 8308911 | ingest/upload.tsx, ingest/review.tsx |
| 3 | Wire reports routes (generate.tsx + index.tsx + detail.tsx) | c31891c | reports/generate.tsx, reports/index.tsx, reports/detail.tsx |

## What Was Built

### Task 1: Unit Tests (9 passing)

`remix-app/tests/lib/per-assignment-wiring.test.ts` — pure unit tests (no DB) proving:
- Test 1: practitioner with empty assigned set (unassigned) → 403
- Test 2: practitioner assigned to different subjects → 403
- Test 3: practitioner assigned to subject.id → passes
- Test 4: owner with `resolveAssignedIds` returning `undefined` → passes (no Gate 3)
- Test 5: subject missing `.id`, non-empty assigned set → 403 (proves why subject.id fix is required)
- Test 6: `resolveAssignedIds` helper — `practitioner` returns ids, `owner`/null/undefined returns `undefined`

### Task 2: Ingest Routes Wiring

**upload.tsx action:** ctx construction moved above assertSubjectAccess; `listAssignedSubjectIds(ctx, user.id)` resolved conditionally (practitioner only); passed as 4th arg. Subject already carried `.id`.

**review.tsx loader (no-docId path):** ctx added before assertSubjectAccess; same conditional wiring.

**review.tsx loader (docId path):** Subject object changed from `{ tenantId: doc.tenantId }` to `{ tenantId: doc.tenantId, id: doc.subjectId }` — Gate 3 now has a subject id to evaluate; ctx + assignedIds added.

**review.tsx action:** ctx moved from after assertSubjectAccess to before; subject object changed from `{ tenantId: extraction.tenantId }` to `{ tenantId: extraction.tenantId, id: extraction.subjectId }` (T-07-20 fix); assignedIds resolved and passed.

### Task 3: Reports Routes Wiring

**generate.tsx action:** ctx moved above assertSubjectAccess; assignedIds conditional; 4th arg added.

**index.tsx loader:** ctx moved above assertSubjectAccess; same pattern.

**detail.tsx loader:** ctx already existed before the access check (no move needed); subject changed from `{ tenantId: report.tenantId }` to `{ tenantId: report.tenantId, id: report.subjectId }` (T-07-20); assignedIds added and passed.

## Verification Results

| Gate | Result |
|------|--------|
| `npx react-router typegen && npx tsc --noEmit` | PASS (clean, no output) |
| `DB_URL_STUBBED=1 npx vitest run` | PASS — 283 pass / 79 skipped / 35 files |
| `npm run build` | PASS — client + server bundles clean, no .server leak |
| `grep listAssignedSubjectIds(ctx, user.id)` all 5 routes | PASS — 5/5 routes contain the pattern |
| `grep "id: extraction.subjectId"` review.tsx | PASS — 1 match |
| `grep "id: report.subjectId"` detail.tsx | PASS — 1 match |

## Deviations from Plan

None — plan executed exactly as written.

The plan noted `review.tsx loader docId path` and `review.tsx action` as separate call sites; both were fixed independently with the exact patterns specified. The ctx-move-before-assertSubjectAccess pattern was applied consistently across all five routes.

## Known Stubs

None. All five routes now call `listAssignedSubjectIds` from the live database path (`withTenantDb` + practitioner_subject_assignments table). No hardcoded values or placeholder returns.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced by this plan. All changes are within existing routes modifying an existing authorization check.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| per-assignment-wiring.test.ts | FOUND |
| ingest/upload.tsx | FOUND |
| ingest/review.tsx | FOUND |
| reports/generate.tsx | FOUND |
| reports/index.tsx | FOUND |
| reports/detail.tsx | FOUND |
| 07-05-SUMMARY.md | FOUND |
| Commit c28ec33 (test RED) | FOUND |
| Commit 8308911 (ingest wiring) | FOUND |
| Commit c31891c (reports wiring) | FOUND |
| No unexpected file deletions | CONFIRMED |
