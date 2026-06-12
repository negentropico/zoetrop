---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "06"
subsystem: authz
tags: [auth, rbac, phi-security, client-role-gate, cr-02]
dependency_graph:
  requires: ["07-01", "07-02", "07-03", "07-04"]
  provides: ["requireSubjectCtx", "13-loader-role-gate"]
  affects: ["app/lib/authz.server.ts", "all-13-phi-read-loaders"]
tech_stack:
  added: []
  patterns: ["requireSubjectCtx centralized PHI gate", "TDD RED/GREEN", "RR7 child-loader independence"]
key_files:
  created:
    - remix-app/app/lib/authz.server.ts (requireSubjectCtx added — not new file)
    - remix-app/tests/lib/require-subject-ctx.test.ts
  modified:
    - remix-app/app/lib/authz.server.ts
    - remix-app/app/routes/_app/dashboard.tsx
    - remix-app/app/routes/_app/metrics/index.tsx
    - remix-app/app/routes/_app/metrics/category.tsx
    - remix-app/app/routes/_app/metrics/detail.tsx
    - remix-app/app/routes/_app/insights/index.tsx
    - remix-app/app/routes/_app/insights/correlations.tsx
    - remix-app/app/routes/_app/insights/genetics.tsx
    - remix-app/app/routes/_app/protocol/index.tsx
    - remix-app/app/routes/_app/protocol/versions.tsx
    - remix-app/app/routes/_app/protocol/version-detail.tsx
    - remix-app/app/routes/_app/protocol/supplements.tsx
    - remix-app/app/routes/_app/protocol/cessation.tsx
    - remix-app/app/routes/_app/protocol/compare.tsx
decisions:
  - "requireSubjectCtx placed in authz.server.ts (not a new file) — import-cycle safe because data.server.ts does not import authz.server.ts"
  - "Destructure only { ctx } (not user or subject) in loaders that do not reference them directly — avoids unused-variable tsc errors"
  - "cessation.tsx loader signature keeps second `now: Date = new Date()` parameter (test hook) unchanged"
metrics:
  duration: "352s (~6m)"
  completed_date: "2026-06-12"
  tasks: 3
  files: 14
requirements: [AUTH-03]
---

# Phase 07 Plan 06: requireSubjectCtx — Close Client-Role PHI Exposure (CR-02) Summary

Closed Blocker 2 (CR-02): a `requireSubjectCtx` helper was added to `authz.server.ts` and wired into all 13 PHI read loaders (dashboard / metrics / insights / protocol), so the client role is denied 403 on every PHI surface via `assertSubjectAccess` Gate 1.

## What Was Built

### Task 1: requireSubjectCtx helper + RED/GREEN unit test (TDD)

Added `requireSubjectCtx(request: Request)` to `remix-app/app/lib/authz.server.ts`:

```typescript
export async function requireSubjectCtx(request: Request) {
  const { user } = await requireUser(request);           // unauthenticated → /login
  const subject = await getOwnerSubject(user.tenantId!); // no subject → 404
  assertSubjectAccess(user, subject, user.tenantId!);    // client → 403, cross-tenant → 403
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  return { user, subject, ctx };
}
```

New file: `remix-app/tests/lib/require-subject-ctx.test.ts` — 5 unit tests:
- Test 1: client role + same-tenant subject → 403 (Gate 1 confirmed)
- Test 2: owner role + same-tenant → no throw (admitted)
- Test 3: practitioner role + same-tenant, no assignedSubjectIds → no throw
- Test 4: any role + cross-tenant → 403 (Gate 2 confirmed)
- Test 5: requireSubjectCtx is exported and is a function

TDD gate compliance: RED commit `fbdae48` (1 failing test), GREEN commit `143e6e7` (5/5 passing).

### Task 2: Dashboard + metrics + insights loaders refactored (7 routes)

Replaced the three-line boilerplate in each loader:
```typescript
// BEFORE (duplicated in all 13 loaders):
const { user } = await requireUser(request);
const subject = await getOwnerSubject(user.tenantId!);
const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };

// AFTER (single gated call):
const { ctx } = await requireSubjectCtx(request);
```

Files: `dashboard.tsx`, `metrics/index.tsx`, `metrics/category.tsx`, `metrics/detail.tsx`, `insights/index.tsx`, `insights/correlations.tsx`, `insights/genetics.tsx`.

Genetic PHI (`subject_genotypes` via `insights/genetics.tsx`) is no longer readable by a client-role user — the highest-sensitivity surface explicitly closed.

### Task 3: Protocol loaders refactored + full build gate (6 routes)

Same refactor applied to: `protocol/index.tsx`, `protocol/versions.tsx`, `protocol/version-detail.tsx`, `protocol/supplements.tsx`, `protocol/cessation.tsx`, `protocol/compare.tsx`.

Full build gate passed: `npm run build` clean, confirming `data.server.ts` and `authz.server.ts` (both `.server`-suffixed) did not leak into the client bundle.

## Verification Results

| Check | Result |
|-------|--------|
| `grep -n "export async function requireSubjectCtx" authz.server.ts` | 1 match (line 127) |
| `npx tsc --noEmit` | exit 0 — no type errors |
| `DB_URL_STUBBED=1 npx vitest run` | 279 passed / 0 failed (79 skipped — live DB) |
| `grep -rc "requireSubjectCtx(request)" app/routes/_app/` with `:1$` count | 13 files |
| `grep -c "requireUser" insights/genetics.tsx` | 0 — gate is inside requireSubjectCtx |
| `npm run build` | exit 0 — no .server bundle leak |

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | fbdae48 | 1 failing test (requireSubjectCtx undefined) |
| GREEN | 143e6e7 | 5/5 passing (requireSubjectCtx exported + gate verified) |
| REFACTOR | — | Not needed — implementation was clean |

## Deviations from Plan

None — plan executed exactly as written.

The import-cycle guard in the plan was noted as a fallback path (subject-ctx.server.ts) if authz.server.ts adding the data.server import caused a cycle. No cycle occurred — the direct placement in authz.server.ts succeeded on the first attempt.

## Known Stubs

None — all 13 loaders now call live Neon via requireSubjectCtx → getOwnerSubject → data.server functions.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. This plan only:
- Added one helper to an existing server-only file
- Replaced boilerplate in 13 existing loaders (no new PHI surfaces)

All threat mitigations in the plan's STRIDE register are satisfied:

| Threat ID | Status |
|-----------|--------|
| T-07-22 | MITIGATED — requireSubjectCtx runs assertSubjectAccess before any PHI read in all 13 loaders |
| T-07-23 | MITIGATED — genetics.tsx genetic PHI gated against client role |
| T-07-24 | MITIGATED — single requireSubjectCtx helper, one audit point, tsc enforces the contract |
| T-07-25 | ACCEPTED — no package installs |

## Self-Check: PASSED

All files verified:
- `remix-app/app/lib/authz.server.ts` — contains `export async function requireSubjectCtx` at line 127
- `remix-app/tests/lib/require-subject-ctx.test.ts` — created, committed fbdae48
- All 13 `_app` route loaders contain exactly 1 `requireSubjectCtx(request)` call
- Commits: fbdae48, 143e6e7, 277b582, 64f6e41 all exist in git log
