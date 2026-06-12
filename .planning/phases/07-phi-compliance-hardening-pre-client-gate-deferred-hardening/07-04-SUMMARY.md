---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "04"
subsystem: authorization
tags: [auth03, auth04, rls, assignments, audit-log, better-auth, phi-hardening]
dependency_graph:
  requires:
    - "07-01 (withTenantDb/TenantCtx + practitionerSubjectAssignments schema)"
    - "07-02 (RLS LIVE on Neon, app_user role, migration 0012)"
    - "07-03 (withTenantDb seam retrofit, insertAuditLogAdmin)"
  provides:
    - assertSubjectAccess per-assignment extension (AUTH-03 complete)
    - assignments.server.ts — assign/unassign/list/listAssignedSubjectIds via withTenantDb
    - /settings/assignments owner-facing UI (assign/unassign with Card+Form+Table)
    - insertAuthAuditLog — PHI-free auth-event admin path in audit.server.ts
    - Better-Auth sign-in/sign-out/sign-up/invite-redeemed hooks writing to audit_log
    - assignments.test.ts — 14 unit tests for assertSubjectAccess AUTH-03 cases
  affects:
    - remix-app/app/lib/authz.server.ts
    - remix-app/app/lib/audit.server.ts
    - remix-app/app/lib/auth.server.ts
    - remix-app/app/lib/assignments.server.ts (new)
    - remix-app/app/routes/_app/settings/assignments.tsx (new)
    - remix-app/app/routes.ts
    - remix-app/app/routes/_app/settings/index.tsx
    - remix-app/tests/lib/assignments.test.ts (new)
tech_stack:
  added: []
  patterns:
    - assertSubjectAccess optional 4th param (assignedSubjectIds) for backward-compat per-assignment gate
    - assignments.server.ts service: withTenantDb for all 4 functions (RLS-governed, tenant-scoped)
    - Soft-delete unassign (revokedAt = now(), idempotent assign on unique violation)
    - insertAuthAuditLog: admin path (getDb()), PHI-free, subjectId stub = tenantId
    - Better-Auth databaseHooks.session.create.after + .delete.after + user.create.after
    - Best-effort try/catch around all auth-event audit writes (T-07-17 — never fail auth flow)
key_files:
  created:
    - remix-app/app/lib/assignments.server.ts
    - remix-app/app/routes/_app/settings/assignments.tsx
    - remix-app/tests/lib/assignments.test.ts
  modified:
    - remix-app/app/lib/authz.server.ts
    - remix-app/app/lib/audit.server.ts
    - remix-app/app/lib/auth.server.ts
    - remix-app/app/routes.ts
    - remix-app/app/routes/_app/settings/index.tsx
decisions:
  - "assertSubjectAccess 4th param is optional (not required): preserves backward-compat for 7 existing owner-context callers who never pass assignedSubjectIds; undefined = skip gate 3"
  - "insertAuthAuditLog uses tenantId as subjectId stub: no clinical subject exists at auth time; per 07-PATTERNS.md §insertAuthAuditLog"
  - "Session hooks resolve tenantId via getDb() admin SELECT by session.userId — no TenantCtx needed for auth events, consistent with admin path rationale"
  - "subject in assignments.tsx uses displayName not name: subjects table has display_name column, not name"
  - "user.create.after audit event: action = 'invite-redeemed' when pending.rawToken present (real invite), 'sign-up' for break-glass bootstrap"
metrics:
  duration: "648s (~11m)"
  completed_date: "2026-06-12"
  tasks_completed: 3
  tasks_total: 4
  files_changed: 8
---

# Phase 7 Plan 04: Per-Assignment Authorization + Assignment Service + Auth-Event Audit Trail

**One-liner:** Per-assignment assertSubjectAccess extension with assignments.server.ts service + owner /settings/assignments UI closing AUTH-03, and Better-Auth session/user hooks writing PHI-free sign-in/sign-out/sign-up events to the immutable audit_log closing AUTH-04.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | assignments.test.ts — assertSubjectAccess AUTH-03 per-assignment tests | 373dc67 | remix-app/tests/lib/assignments.test.ts |
| 1 (GREEN) | Extend assertSubjectAccess + create assignments.server.ts | 25fec4d | remix-app/app/lib/authz.server.ts, remix-app/app/lib/assignments.server.ts |
| 2 | /settings/assignments UI + route + settings entry point | 410b282 | assignments.tsx, routes.ts, settings/index.tsx |
| 3 | insertAuthAuditLog + Better-Auth session/user hooks | f6cbb8a | remix-app/app/lib/audit.server.ts, remix-app/app/lib/auth.server.ts |

## What Was Built

### Task 1 — assertSubjectAccess extension + assignments.server.ts

**authz.server.ts** — `assertSubjectAccess` extended with optional 4th parameter `assignedSubjectIds?: string[]`:
- Gate 1: client role → always 403
- Gate 2: cross-tenant (subject.tenantId !== userTenantId) → always 403
- Gate 3 (NEW): `user.role === "practitioner" && assignedSubjectIds !== undefined` → deny unless `subject.id ∈ assignedSubjectIds`
- Owners: skip gate 3 entirely — they retain tenant-wide access (D-07)
- `assignedSubjectIds` is OPTIONAL: the 7 existing owner-context callers that pass no 4th arg are unbroken (undefined skips gate 3)
- Removed "do NOT add it here" comment; added Phase 7 AUTH-03 COMPLETE note

**assignments.server.ts** — new service following the invites.server.ts pattern:
- `assignSubject(ctx, {practitionerId, subjectId, assignedBy})` — INSERT active row (id=crypto.randomUUID(), revokedAt=null); idempotent on unique constraint violation
- `unassignSubject(ctx, {practitionerId, subjectId})` — soft delete (revokedAt=now()); returns `{unassigned: false}` when no active row found (WR-02 fail-closed, never silent success)
- `listAssignments(ctx)` — SELECT all active (revokedAt IS NULL) assignments for the tenant
- `listAssignedSubjectIds(ctx, practitionerId)` — SELECT active subjectIds for a practitioner (feeds assertSubjectAccess)
- All 4 functions use `withTenantDb` (RLS-governed, tenant-scoped via psa policy)
- 9 `withTenantDb` calls total (assignSubject + unassignSubject + listAssignments + listAssignedSubjectIds)

**assignments.test.ts** — 14 pure unit tests:
- client role → 403 (with and without assignedSubjectIds)
- practitioner + cross-tenant → 403
- owner + cross-tenant → 403
- owner → passes regardless of assignedSubjectIds (empty, non-matching, undefined)
- practitioner + empty assignedSubjectIds → 403
- practitioner + subject NOT in list → 403
- practitioner + subject IN list → pass
- practitioner + undefined assignedSubjectIds → pass (backward-compat)
All 14 passed GREEN after implementation.

### Task 2 — /settings/assignments UI + route registration

**assignments.tsx** — loader + action + default component:
- Loader: `requireUser` + `requireRole(user, ["owner"])` (owner-only, T-07-15); loads practitioners (user table WHERE role=practitioner AND tenantId), subjects (getOwnerSubject), and active assignments (listAssignments)
- Action: `requireRole(user, ["owner"])` in action too (T-07-15 — both gates active); dispatches `assign-subject` → assignSubject / `unassign-subject` → unassignSubject; returns `{intent, success, error}`
- Component: Card + select fields for practitioner/subject + Submit (assign-subject); table of active assignments with per-row Form (unassign-subject)
- Server-computed data only in loader — no server-only authz module in client bundle
- Unauthenticated → /login redirect (requireUser); practitioner/client → 403 (requireRole)

**routes.ts** — added `route("settings/assignments", "routes/_app/settings/assignments.tsx")` beside existing settings routes

**settings/index.tsx** — added `canManageAssignments = user.role === "owner" && !!user.tenantId` to loader; owner-only "Assignments" card with "Manage assignments" link to /settings/assignments

### Task 3 — Better-Auth auth-event audit hooks (AUTH-04)

**audit.server.ts** — added `insertAuthAuditLog(entry: AuthAuditEntry)`:
- Admin path: `getDb()` (neondb_owner, no subject context at auth time)
- PHI-free: only `userId / action / tenantId / entityId` (D-13)
- `subjectId` stub = `entry.tenantId` (per 07-PATTERNS.md — auth rows have no clinical subject)
- `action` type union: `'sign-in' | 'sign-out' | 'sign-up' | 'invite-redeemed' | 'sign-in-failed' | 'role-changed'`
- Separate from `insertAuditLogAdmin` (the latter accepts the full `AuditLogEntry` shape)

**auth.server.ts** — wired auth events via Better-Auth databaseHooks:
- `databaseHooks.session.create.after(session)` → `insertAuthAuditLog({userId: session.userId, action: 'sign-in', tenantId, entityId: session.id})` — resolves tenantId via admin SELECT by session.userId; try/catch wraps entire write (T-07-17)
- `databaseHooks.session.delete.after(session)` → `insertAuthAuditLog({action: 'sign-out', ...})` — same pattern
- `databaseHooks.user.create.after(user)` → extended to also write `insertAuthAuditLog({action: 'invite-redeemed' | 'sign-up', ...})` after the existing consumedBy backfill; action = 'invite-redeemed' when pending has rawToken (real invite), 'sign-up' for break-glass bootstrap; try/catch separate from the consumedBy backfill catch
- auth events are append-only (audit_log INSERT+SELECT-only RLS from Plan 02)

## Acceptance Criteria Verification

| Check | Result |
|-------|--------|
| `grep -q "assignedSubjectIds" authz.server.ts` | PASS |
| `npx tsc --noEmit` exits 0 | PASS |
| `assignments.server.ts` exists | PASS |
| assignSubject / unassignSubject / listAssignedSubjectIds exported | PASS |
| `grep -c "withTenantDb" assignments.server.ts` ≥ 3 | PASS (9) |
| `grep -q "revokedAt" assignments.server.ts` | PASS |
| `assignments.tsx` exists with loader, action, default export | PASS |
| `requireRole(user, ["owner"])` in both loader and action | PASS (2 calls) |
| both assign-subject and unassign-subject intents handled | PASS |
| `route("settings/assignments"` in routes.ts | PASS |
| assignments.test.ts 14/14 passed | PASS |
| `grep -q "export async function insertAuthAuditLog" audit.server.ts` | PASS |
| insertAuthAuditLog calls admin path (getDb) | PASS |
| `grep -q "insertAuthAuditLog" auth.server.ts` | PASS |
| sign-in event wired | PASS |
| try/catch count in auth.server.ts increased (8 catch blocks) | PASS |
| insertAuthAuditLog contains no PHI fields | PASS (userId/action/tenantId/entityId only) |
| `DB_URL_STUBBED=1 npx vitest run` — 274 passed, 0 failed | PASS |
| `npm run build` — clean | PASS |

## Task 4: AUTH-03 + AUTH-04 end-to-end verification (checkpoint — AWAITING)

Task 4 is a `checkpoint:human-verify` gate. The automated portion was completed:
- `npx tsc --noEmit` → 0 errors
- `DB_URL_STUBBED=1 npx vitest run` → 274 passed, 0 failed, 77 skipped
- `npm run build` → "✓ built in 493ms", no .server-in-client leaks

The manual verification items require the live app:
1. Owner UI: sign in → /settings/assignments → assign/unassign round-trip
2. Auth-event audit: query audit_log for sign-in/sign-out rows (PHI-free)
3. Immutability: attempt UPDATE on audit_log as app_user → should be denied
4. AUTH-03 deny path: unassigned practitioner 403 → assign → access granted

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] subjects table has displayName not name**
- **Found during:** Task 2 (tsc caught `Property 'name' does not exist`)
- **Issue:** The plan specified `subjectList = [{ id: subject.id, name: subject.name }]` but the subjects table schema has `displayName` (varchar `display_name`), not `name`
- **Fix:** Changed `SubjectRow.name` to `SubjectRow.displayName` throughout the component
- **Files modified:** remix-app/app/routes/_app/settings/assignments.tsx
- **Commit:** 410b282

**2. [Rule 1 - Bug] Incorrect relative import path for schema in assignments.tsx**
- **Found during:** Task 2 (tsc: `Cannot find module '../../../db/schema'`)
- **Issue:** assignments.tsx is at `routes/_app/settings/assignments.tsx` — requires 4 levels up (`../../../../db/schema`) not 3
- **Fix:** Updated import path to `../../../../db/schema`
- **Files modified:** remix-app/app/routes/_app/settings/assignments.tsx
- **Commit:** 410b282

**3. [Rule 1 - Bug] Type error on user cast in user.create.after hook**
- **Found during:** Task 3 (tsc: conversion type error TS2352)
- **Issue:** `user as { tenantId: string }` fails because the Better-Auth User type doesn't overlap with `{ tenantId: string }` (our additional field is not in the base User type)
- **Fix:** Cast via `user as unknown as Record<string, unknown>` then check `userAny["tenantId"]` — the standard TypeScript unknown-intermediary pattern for discriminated additional field access
- **Files modified:** remix-app/app/lib/auth.server.ts
- **Commit:** f6cbb8a

## Known Stubs

None — all data flows are wired. The assignments.tsx uses real data from assignments.server.ts via withTenantDb/RLS. The pilot subject list shows the owner's one subject (non-PHI displayName).

## Threat Flags

No new threat surface beyond the plan's threat model. The assignments.tsx route opens a new form endpoint, but it is:
- Protected by requireUser (auth gate)
- Protected by requireRole(["owner"]) in BOTH loader and action
- Assignment service uses withTenantDb (psa RLS WITH CHECK constrains to the authenticated tenant)
All STRIDE threats T-07-14 through T-07-18 addressed as planned.

## Self-Check

**Checking created files exist:**
- `remix-app/app/lib/assignments.server.ts` — exists (committed 25fec4d)
- `remix-app/app/routes/_app/settings/assignments.tsx` — exists (committed 410b282)
- `remix-app/tests/lib/assignments.test.ts` — exists (committed 373dc67)

**Checking commits exist:**
- 373dc67 — test(07-04): RED assignments.test.ts
- 25fec4d — feat(07-04): extend assertSubjectAccess + assignments.server.ts
- 410b282 — feat(07-04): /settings/assignments UI + route + settings entry point
- f6cbb8a — feat(07-04): wire Better-Auth auth events into audit_log

## Self-Check: PASSED
