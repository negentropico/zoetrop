---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "01"
subsystem: database
tags: [rls, tenancy, drizzle, neon, security, tdd]
dependency_graph:
  requires: []
  provides:
    - withTenantDb(ctx, fn) transaction wrapper + TenantCtx type in db.server.ts
    - practitionerSubjectAssignments table in schema.ts
    - RED rls-isolation.test.ts (TEN-02/TEN-03 contracts)
  affects:
    - remix-app/app/lib/db.server.ts
    - remix-app/db/schema.ts
tech_stack:
  added: []
  patterns:
    - Host-portable GUC RLS via set_config('app.tenant_id', ..., true) + SET LOCAL ROLE app_user
    - Drizzle db.transaction wrapping for atomic GUC + role-switch before app fn
    - Vitest describe.skipIf(!connectionString) live-DB skip-guard (mirrors constraints.test.ts)
key_files:
  created:
    - remix-app/tests/db/rls-isolation.test.ts
  modified:
    - remix-app/app/lib/db.server.ts
    - remix-app/db/schema.ts
decisions:
  - "TenantTx type inferred via Parameters<> introspection to avoid Drizzle PgTransaction/NeonDatabase mismatch (the spec's ReturnType<typeof getDb> collides with the actual tx type in db.transaction callback)"
  - "withTenantDb uses a single SELECT set_config(...) statement issuing all three GUCs atomically — matches PATTERNS.md §withTenantDb signature exactly"
  - "practitionerSubjectAssignments placed after subjectGenotypes, before lab ingest tables — chronological addition order"
metrics:
  duration: "396s (~6m)"
  completed_date: "2026-06-12"
  tasks_completed: 3
  files_changed: 3
---

# Phase 7 Plan 01: RLS Foundation — withTenantDb + schema + RED tests

**One-liner:** Host-portable GUC RLS wrapper (`withTenantDb` + `TenantCtx`) and `practitionerSubjectAssignments` schema table, with RED skip-guarded isolation tests establishing the TEN-02/TEN-03 contracts for Plans 02–04 to turn green.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add withTenantDb wrapper + TenantCtx to db.server.ts | 137e27c | remix-app/app/lib/db.server.ts |
| 2 | Define practitioner_subject_assignments table in schema.ts | ec2b310 | remix-app/db/schema.ts |
| 3 | Commit RED rls-isolation.test.ts (TEN-02/TEN-03) | c620c29 | remix-app/tests/db/rls-isolation.test.ts |

## What Was Built

### Task 1 — withTenantDb + TenantCtx (db.server.ts)

Added beside the unchanged `getDb()`:

- `TenantCtx` interface: `{ userId: string; tenantId: string; subjectId: string }`
- `TenantTx` type: inferred via `Parameters<>` introspection from the Drizzle transaction callback to avoid a type collision (the spec suggested `ReturnType<typeof getDb>` but the actual `tx` inside `db.transaction(async (tx) => {...})` is a `PgTransaction`, not a `NeonDatabase`)
- `withTenantDb<T>(ctx, fn)`: wraps `getDb().transaction(async (tx) => { ... })` — issues `set_config('app.tenant_id', ..., true)`, `set_config('app.subject_id', ..., true)`, `set_config('app.user_id', ..., true)` in one SELECT, then `SET LOCAL ROLE app_user`, then `return fn(tx)`
- Header comments documenting D-01 (driver unchanged), D-02 (host-portable GUCs), D-11 (app-layer authz first)
- Import added: `sql` from `drizzle-orm`

### Task 2 — practitionerSubjectAssignments schema table (schema.ts)

Added `practitionerSubjectAssignments` pgTable with:
- `id` (text PK, `crypto.randomUUID()`)
- `tenantId` → `tenants.id` FK
- `practitionerId` → `user.id` FK
- `subjectId` → `subjects.id` FK
- `assignedBy` → `user.id` FK (owner who created the assignment)
- `assignedAt` (timestamp, notNull, defaultNow)
- `revokedAt` (nullable timestamp — null = active, non-null = revoked)
- `createdAt` (timestamp, defaultNow)
- 4 indexes: `idx_psa_tenant`, `idx_psa_practitioner`, `idx_psa_subject`, `idx_psa_active_unique` (unique composite on tenantId + practitionerId + subjectId)

No migration generated — Plan 02 authors migration 0010 combining Drizzle DDL + hand-authored RLS DDL as one atomic migration (D-10).

### Task 3 — RED rls-isolation.test.ts (TEN-02/TEN-03)

Created `remix-app/tests/db/rls-isolation.test.ts` with:
- Skip-guard: `DB_URL_STUBBED=1` forces skip; falls back to `DATABASE_URL_UNPOOLED || DATABASE_URL`
- `beforeAll`: upserts two disjoint test tenants + subjects via admin `getDb()` path
- `afterAll`: deletes test fixtures + calls `pool.end()` if a pool was opened
- 3 `describe.skipIf(!connectionString)` blocks:
  1. **TEN-02 cross-tenant read**: Tenant B reads zero rows inserted by Tenant A
  2. **TEN-02 WITH CHECK reject**: mismatched-tenant INSERT (tenantA ctx, tenantB row) must reject
  3. **TEN-03 pool non-leak**: after Tenant A commits, Tenant B query finds no Tenant A rows
- Skip behavior verified: `DB_URL_STUBBED=1 npx vitest run tests/db/rls-isolation.test.ts` → 3/3 skipped, exit 0
- RED state: `SET LOCAL ROLE app_user` throws "role app_user does not exist" until Plan 02 migration 0010

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Exit 0 — no type errors |
| `DB_URL_STUBBED=1 npx vitest run` | 259 passed, 77 skipped, 1 pre-existing timeout (report-generator.test.ts from Phase 6, out of scope) |
| `npx react-router build` | Exit 0 — build clean |
| `git diff --stat remix-app/package.json` | No change — no new dependencies |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Drizzle transaction type mismatch for withTenantDb fn parameter**
- **Found during:** Task 1 — tsc reported the `PgTransaction` type inside `db.transaction()` lacks `$client` (present on `NeonDatabase`), so `ReturnType<typeof getDb>` cannot be assigned to the `tx` callback parameter
- **Fix:** Introduced `type TenantTx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]` — inferred from the Drizzle `transaction()` signature at the type level; no runtime impact. The `fn` parameter type updated from `ReturnType<typeof getDb>` to `TenantTx`
- **Files modified:** `remix-app/app/lib/db.server.ts`
- **Commit:** 137e27c

## Pre-existing Issues (Out of Scope)

- `tests/lib/report-generator.test.ts` — 1 test times out at 5000ms ("generateReport returns a string reportId"). Pre-existing from Phase 6 commit `f00b489`. Not introduced by this plan; not fixed (out of scope per deviation Rule scope boundary).

## Known Stubs

None — no placeholder data or hardcoded empty values introduced in this plan.

## Threat Flags

No new threat surface beyond what is described in the plan's threat model. `withTenantDb` is documented as a DB-boundary crossing, not a new network endpoint or auth path. The threat register (T-07-01/T-07-02/T-07-03) covers all surfaces introduced.

## Self-Check

**Checking created files exist:**
- `remix-app/app/lib/db.server.ts` — modified (confirmed via tsc + build pass)
- `remix-app/db/schema.ts` — modified (confirmed via tsc + build pass)
- `remix-app/tests/db/rls-isolation.test.ts` — created (confirmed via vitest skip run)

**Checking commits exist:**
- 137e27c — feat(07-01): add withTenantDb wrapper + TenantCtx to db.server.ts
- ec2b310 — feat(07-01): define practitioner_subject_assignments table in schema.ts
- c620c29 — test(07-01): RED rls-isolation.test.ts — TEN-02/TEN-03 isolation + pool non-leak

## Self-Check: PASSED
