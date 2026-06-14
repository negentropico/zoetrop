---
phase: 01-client-onboarding-practitioner-operated
plan: 02
subsystem: auth-scoping
tags: [active-subject, cookie, phi-scoping, pattern-b, resource-route]
dependency_graph:
  requires: ["01-01"]
  provides: ["getActiveSubject", "subject-switch", "requireSubjectCtx-swap", "pattern-b-swap"]
  affects: ["01-03", "01-05", "01-06"]
tech_stack:
  added: []
  patterns:
    - "httpOnly session-scoped cookie for subject context (zt-subject)"
    - "admin-path getDb() before TenantCtx bootstrap (same rationale as getOwnerSubject)"
    - "cookie regex idiom: /(?:^|;\\s*)zt-subject=([^;]+)/"
key_files:
  created:
    - remix-app/app/routes/_app/subject-switch.ts
  modified:
    - remix-app/app/lib/data.server.ts
    - remix-app/app/lib/authz.server.ts
    - remix-app/app/routes.ts
    - remix-app/app/routes/_app/ingest/consent.tsx
    - remix-app/app/routes/_app/ingest/index.tsx
    - remix-app/app/routes/_app/ingest/review.tsx
    - remix-app/app/routes/_app/ingest/upload.tsx
    - remix-app/app/routes/_app/reports/detail.tsx
    - remix-app/app/routes/_app/reports/generate.tsx
    - remix-app/app/routes/_app/reports/index.tsx
    - remix-app/tests/lib/active-subject.test.ts
decisions:
  - "getActiveSubject uses admin path (getDb()) — bootstraps subjectId before TenantCtx exists, same rationale as getOwnerSubject"
  - "zt-subject cookie is session-scoped (no Max-Age/Expires per D-06) — practitioner never resumes inside a client on fresh login"
  - "assertSubjectAccess called BEFORE Set-Cookie in subject-switch action — Gate 1 (client→403) and Gate 2 (cross-tenant→403) are the PHI-safety check"
  - "getOwnerSubject kept in authz.server.ts import — Pattern-B callers are swapped separately; both coexist in the import"
  - "review.tsx only swaps the !docId branch (L59) — the docId branch uses doc.subjectId directly, which is correct and untouched"
metrics:
  duration_minutes: 6
  completed_date: "2026-06-14"
  tasks: 3
  files_modified: 12
---

# Phase 01 Plan 02: Active-Subject Scoping Engine Summary

**One-liner:** Cookie-aware PHI scoping spine — getActiveSubject resolver + subject-switch httpOnly cookie route + single requireSubjectCtx swap re-scoping all 13 Pattern-A loaders + 7 Pattern-B manual swaps.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add getActiveSubject to data.server.ts | 3702556 | data.server.ts, tests/lib/active-subject.test.ts |
| 2 | Create subject-switch + requireSubjectCtx swap + route registration | 167b210 | subject-switch.ts, authz.server.ts, routes.ts |
| 3 | Swap 7 Pattern-B ingest/report loaders | 80f7d87 | 7 ingest/report route files |

## What Was Built

**getActiveSubject (data.server.ts):**
- Reads `zt-subject` httpOnly cookie using established repo regex idiom
- Validates cookie value against `subjects WHERE id=value AND tenantId=tenantId` (cross-tenant self-healing)
- Falls back to owner subject (oldest-by-createdAt) when cookie absent, invalid, or cross-tenant
- Throws `Response 404` only when tenant has zero subjects
- Admin path (`getDb()`) — bootstraps subjectId before TenantCtx can be constructed

**subject-switch.ts (action-only resource route):**
- POST: requireUser → validate subjectId form field → DB lookup with tenant scope → assertSubjectAccess → redirect with Set-Cookie
- Cookie: `zt-subject=<id>; Path=/; HttpOnly; SameSite=Lax` (no Max-Age/Expires — session-scoped per D-06)
- Registered at `route("subject-switch", ...)` inside `layout("routes/_app/layout.tsx", [...])` block

**requireSubjectCtx swap (authz.server.ts L135):**
- Single line: `getOwnerSubject(user.tenantId!)` → `getActiveSubject(request, user.tenantId!)`
- Import extended: `{ getOwnerSubject, getActiveSubject }` (both kept — Pattern-B callers still use getOwnerSubject via their own imports)
- Effect: all 13 Pattern-A PHI loaders (dashboard, metrics, insights, protocol routes) now scope to the active subject

**Pattern-B swaps (7 files):**
- `ingest/consent.tsx` — loader + action
- `ingest/index.tsx` — loader
- `ingest/review.tsx` — loader (!docId branch only; docId branch uses doc.subjectId directly)
- `ingest/upload.tsx` — action
- `reports/detail.tsx` — loader
- `reports/generate.tsx` — action
- `reports/index.tsx` — loader

**Intentionally untouched:**
- `settings/assignments.tsx` — owner-scoped by design (RESEARCH.md line 131)
- `import/vault.tsx`, `import/whoop.tsx` — Phase 2 scope, owner-only import path for v1.1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed active-subject.test.ts hasDb guard**
- **Found during:** Task 1 verification
- **Issue:** The RED stub test used `hasDb = !!(DATABASE_URL_UNPOOLED || DATABASE_URL)`. The test-setup.ts stubs `DATABASE_URL` to `postgres://stub:...`, making `hasDb = true`. DB-gated tests then ran and threw a non-Response connection error rather than skipping, causing the tests to fail with `expected null to be 404`.
- **Fix:** Added `!process.env["DB_URL_STUBBED"]` to the guard, matching the pattern used by `tests/db/rls-isolation.test.ts`, `tests/lib/assignments.test.ts`, etc.
- **Files modified:** `remix-app/tests/lib/active-subject.test.ts`
- **Commit:** 3702556

## Test/Typecheck State

**Green:**
- `tests/lib/active-subject.test.ts` — 1 passed (structural: getActiveSubject is exported async function), 3 skipped (DB-gated tests skip correctly with DB_URL_STUBBED=1)
- `tests/lib/require-subject-ctx.test.ts` — 5 passed (Gate-1 403 client-role tests still GREEN after requireSubjectCtx swap)
- All other 29 passing test files unchanged
- `npm run typecheck` — 0 new errors (2 pre-existing forward-refs for subjects.server + checklist.server, Plan 01-03 scope)
- `npm run build` — clean build, no .server bundle leaks

**Expected RED (Plan 01-03 scope, pre-existing):**
- `tests/lib/subjects.test.ts` — 3 failures (subjects.server not implemented yet)
- `tests/lib/checklist.test.ts` — 6 failures (checklist.server not implemented yet)

## Known Stubs

None. No stubs, placeholders, or hardcoded empty values introduced in this plan.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-01-cookie-tamper | data.server.ts | Mitigated — cookie value re-validated against DB on every request |
| T-01-cross-tenant | subject-switch.ts, data.server.ts | Mitigated — assertSubjectAccess Gate 2 + getActiveSubject tenant filter |
| T-01-client-403 | subject-switch.ts, authz.server.ts | Mitigated — assertSubjectAccess Gate 1 in both action and requireSubjectCtx |
| T-01-session-scope | subject-switch.ts | Mitigated — no Max-Age/Expires in Set-Cookie |
| T-01-patternB-leak | 7 ingest/report files | Mitigated — all 7 now call getActiveSubject |
| T-01-server-leak | data.server.ts | Mitigated — getActiveSubject stays in .server.ts; build gate confirmed clean |

## Self-Check

- [x] `remix-app/app/lib/data.server.ts` — FOUND
- [x] `remix-app/app/routes/_app/subject-switch.ts` — FOUND
- [x] `remix-app/app/lib/authz.server.ts` — FOUND (swap at line 135)
- [x] Commit 3702556 — FOUND
- [x] Commit 167b210 — FOUND
- [x] Commit 80f7d87 — FOUND

## Self-Check: PASSED
