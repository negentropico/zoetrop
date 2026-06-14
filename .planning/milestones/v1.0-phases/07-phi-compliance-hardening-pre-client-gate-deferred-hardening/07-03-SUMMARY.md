---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "03"
subsystem: data-access-seam
tags: [rls, withTenantDb, tenant-isolation, audit, phi-hardening]
dependency_graph:
  requires: ["07-01", "07-02"]
  provides: ["withTenantDb-seam-live", "TEN-03-complete"]
  affects: ["all-app-routes", "audit-log", "review-approve-path"]
tech_stack:
  added: []
  patterns:
    - "withTenantDb(ctx, fn) for all tenant/subject-scoped DB writes and reads"
    - "insertAuditLogAdmin(entry) for background jobs with no request-scoped session"
    - "TenantCtx = { userId, tenantId, subjectId } constructed at every call site from requireUser session"
key_files:
  created: []
  modified:
    - remix-app/app/lib/data.server.ts
    - remix-app/app/lib/consent.server.ts
    - remix-app/app/lib/audit.server.ts
    - remix-app/app/lib/ingest/ingest.server.ts
    - remix-app/app/routes/_app/ingest/review.tsx
    - remix-app/app/routes/_app/dashboard.tsx
    - remix-app/app/routes/_app/reports/detail.tsx
    - remix-app/app/routes/_app/reports/generate.tsx
    - remix-app/app/routes/_app/reports/index.tsx
    - remix-app/app/routes/_app/metrics/index.tsx
    - remix-app/app/routes/_app/metrics/category.tsx
    - remix-app/app/routes/_app/metrics/detail.tsx
    - remix-app/app/routes/_app/protocol/index.tsx
    - remix-app/app/routes/_app/protocol/versions.tsx
    - remix-app/app/routes/_app/protocol/version-detail.tsx
    - remix-app/app/routes/_app/protocol/supplements.tsx
    - remix-app/app/routes/_app/protocol/cessation.tsx
    - remix-app/app/routes/_app/protocol/compare.tsx
    - remix-app/app/routes/_app/insights/index.tsx
    - remix-app/app/routes/_app/insights/correlations.tsx
    - remix-app/app/routes/_app/insights/genetics.tsx
    - remix-app/app/routes/_app/ingest/consent.tsx
    - remix-app/app/routes/_app/ingest/upload.tsx
    - remix-app/tests/lib/consent.test.ts
    - remix-app/tests/lib/data.server.test.ts
    - remix-app/tests/lib/report-generator.test.ts
    - remix-app/tests/lib/ingest/approve-action.test.ts
decisions:
  - "getOwnerSubject stays on getDb() admin path — bootstraps subjectId pre-ctx; cannot use withTenantDb before subjectId is known"
  - "insertAuditLogAdmin for extractionWorker — background job (waitUntil, no HTTP session) has no request-scoped subjectId; admin path is intentional, not a gap"
  - "review.tsx approve/reject transactions converted from db.transaction(fn) to withTenantDb(ctx, fn) — PHI writes (metrics INSERT, labExtractions UPDATE) must be RLS-governed; assertSubjectAccess preserved before the transaction"
  - "cessation.tsx and compare.tsx updated — not originally listed in plan but caught by tsc; both were calling positional getXxx(tenantId, subjectId)"
metrics:
  duration_minutes: 110
  completed_date: "2026-06-12"
  tasks_completed: 4
  tasks_total: 4
  files_changed: 27
---

# Phase 7 Plan 03: withTenantDb Seam Retrofit Summary

**One-liner:** Wrapped all 11 data.server.ts reads + consent + audit writes in `withTenantDb(ctx)`, updated 19 call-site routes to pass `TenantCtx`, and converted the review approve/reject transactions to RLS-governed writes — making RLS actually govern the running app for every tenant/subject-scoped interaction.

## What Was Built

Plan 03 completes the data-access seam retrofit (TEN-03): every tenant/subject-scoped DB interaction now flows through `withTenantDb(ctx, fn)` which sets the three Postgres GUCs (`app.tenant_id`, `app.subject_id`, `app.user_id`) and `SET LOCAL ROLE app_user` before executing the callback. Before this plan, RLS was live on Neon (from Plan 02) but queries ran as `neondb_owner` via `getDb()`, bypassing RLS entirely.

### Task 1: data.server.ts + consent.server.ts (commit `0770644`)

All 10 entity-read functions in `data.server.ts` converted to `(ctx: TenantCtx, ...)` signatures and wrapped in `withTenantDb(ctx, async (tx) => { ... })`. The explicit `WHERE tenant_id = ? AND subject_id = ?` clauses were preserved as defense-in-depth (D-11). `getOwnerSubject(tenantId)` was intentionally kept on the `getDb()` admin path — it bootstraps the subjectId before a ctx can exist. `TenantCtx` is re-exported from `data.server.ts` for call-site convenience.

`consent.server.ts`: `checkConsent(ctx)` and `insertConsent(ctx, version)` wrapped in `withTenantDb`, using `ctx.subjectId` for the consent_log subject-only RLS policy.

### Task 2: 19 call-site routes + tests (commit `3f588fa`)

All 19 app routes updated to construct `const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id }` after `requireUser` + `getOwnerSubject`, and pass `ctx` to every data/consent function. `reports/detail.tsx` uses `getOwnerSubject` to bootstrap `ctx.subjectId` (the route did not previously load the subject). `protocol/cessation.tsx` and `protocol/compare.tsx` were also updated — not in the original plan's file list but caught by tsc as missed positional callers.

Tests updated: `consent.test.ts`, `data.server.test.ts`, `report-generator.test.ts` all updated to mock `withTenantDb: async (_ctx, fn) => fn(mockTx)` instead of `getDb`.

### Task 3: audit.server.ts two-path design + review.tsx (commit `7fe7295`)

`audit.server.ts` redesigned with two exports:
- `insertAuditLog(entry)`: session-bound path, uses `withTenantDb` — for request-scoped writes (upload, consent, review)
- `insertAuditLogAdmin(entry)`: admin path using `getDb()` — for background jobs (extractionWorker via `waitUntil`) and future auth events where no subjectId exists at call time

`ingest.server.ts` (extractionWorker): switched from `insertAuditLog` to `insertAuditLogAdmin` — the background job has no request-scoped session; its subjectId comes from the doc row, not a live session.

`ingest/review.tsx` action: both the approve and reject `db.transaction(fn)` blocks converted to `withTenantDb(ctx, fn)`. `ctx` is constructed from `extraction.tenantId`/`extraction.subjectId` after `assertSubjectAccess` — the D-15 ordering (assertSubjectAccess before any write) is preserved.

### Test fix: approve-action.test.ts (commit `e243c9f`)

`approve-action.test.ts` mock updated to export `withTenantDb: async (_ctx, fn) => fn(tx)` alongside the existing `getDb` mock. The `transaction(fn)` logic was refactored into a shared `makeTxMockAndRun` helper so both paths share identical tx mock shape and state merging.

## Acceptance Criteria Verification

| Check | Result |
|-------|--------|
| `grep -c "withTenantDb(ctx" data.server.ts` = 11 | PASS |
| `grep -c "withTenantDb(ctx" consent.server.ts` = 3 | PASS |
| `grep -c "withTenantDb" audit.server.ts` = 7 | PASS |
| `grep -q "insertAuditLogAdmin" ingest.server.ts` | PASS |
| `grep -q "withTenantDb(ctx" review.tsx` | PASS |
| `assertSubjectAccess` precedes `withTenantDb(ctx` in review.tsx | PASS |
| `grep -rl "const ctx: TenantCtx" routes/_app/` = 19 | PASS |
| `npx tsc --noEmit` exits 0 | PASS |
| `npx vitest run` — 260 passed, 0 failed | PASS |
| `npm run build` — clean, no .server-in-client leak | PASS |
| rls-isolation.test.ts vs live Neon — 3/3 | PASS |
| Owner parity — 5 routes render unchanged data | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] protocol/cessation.tsx and compare.tsx not in plan's file list**
- **Found during:** Task 2 (tsc caught positional call sites)
- **Issue:** Both routes were calling `getCessationLog(user.tenantId!, subject.id)` and `getProtocolVersions(tenantId, subjectId)` — positional args that don't match the new TenantCtx signatures
- **Fix:** Updated identically to the other protocol routes — added `import type { TenantCtx }`, constructed `ctx`, changed calls to ctx
- **Files modified:** `protocol/cessation.tsx`, `protocol/compare.tsx`
- **Commit:** `3f588fa`

**2. [Rule 1 - Bug] approve-action.test.ts mock missing withTenantDb export**
- **Found during:** Task 3 (vitest run after commit)
- **Issue:** The `vi.mock("~/lib/db.server", ...)` factory only exported `getDb` with a `transaction` method; after review.tsx was changed to use `withTenantDb(ctx, fn)`, 4 tests failed with "No 'withTenantDb' export is defined on the mock"
- **Fix:** Added `withTenantDb: async (_ctx, fn) => makeTxMockAndRun(fn)` to the mock; refactored the shared tx logic into `makeTxMockAndRun` so both `getDb().transaction` and `withTenantDb` use the same mock shape
- **Files modified:** `tests/lib/ingest/approve-action.test.ts`
- **Commit:** `e243c9f`

## Known Stubs

None — plan objective is data-access seam wiring, not UI rendering. No stub data or placeholder values introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The retrofit routes existing data-access through the established `withTenantDb` / `app_user` RLS boundary.

## Task 4: Owner Parity + Build-Gate Verification (checkpoint — APPROVED 2026-06-12)

All four checkpoint items were verified by the orchestrator and approved:

1. **Build gate:** `npm run build` completed clean — "✓ built in 1.16s", no `.server`-module-in-client errors.
2. **Live RLS isolation tests:** `npx vitest run tests/db/rls-isolation.test.ts` with `DATABASE_URL_UNPOOLED`/`DATABASE_URL` exported — 3/3 PASSED against live Neon. (Note: vitest does not auto-load `.env`; the suite silently skips without exported env vars.) Full suite: 260 passed, 0 failed.
3. **tsc:** `npx tsc --noEmit` exits 0.
4. **Owner parity:** dev server started from the worktree (`BETTER_AUTH_URL=http://localhost:5173` override for local origin validation); owner sign-in via `/api/auth/sign-in/email` returned 200; all 5 routes fetched with the session cookie:
   - `/dashboard` — 200, 150KB HTML, "Day"/"Recovery" markers present
   - `/metrics` — 200, 193KB, all category markers (Vitamins, Minerals, Lipids, Hormones)
   - `/protocol` — 200, 114KB, protocol content present
   - `/insights` — 200, 118KB, Correlation + Genetic markers
   - `/reports` — 200, 100KB, Report content

   No empty states, no 403s — the owner sees unchanged data through the withTenantDb path with RLS live. RLS is transparent for the sole-tenant owner, as designed.

## Self-Check: PASSED

Files verified to exist:
- `remix-app/app/lib/data.server.ts` — FOUND
- `remix-app/app/lib/audit.server.ts` — FOUND
- `remix-app/app/routes/_app/ingest/review.tsx` — FOUND
- `.planning/phases/07-phi-compliance-hardening-pre-client-gate-deferred-hardening/07-03-SUMMARY.md` — FOUND

Commits verified:
- `0770644` (Task 1) — FOUND
- `3f588fa` (Task 2) — FOUND
- `7fe7295` (Task 3) — FOUND
- `e243c9f` (test fix) — FOUND
