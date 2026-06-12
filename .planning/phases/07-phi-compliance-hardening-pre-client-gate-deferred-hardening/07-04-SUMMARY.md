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
    - insertAuthAuditLog — PHI-free auth-event admin path (subjectId NULL)
    - Better-Auth sign-in/sign-out/sign-up/invite-redeemed hooks writing to audit_log (verified live)
    - migration 0013 — audit_log.subject_id nullable (APPLIED to live Neon)
    - assignments.test.ts — 14 unit tests for assertSubjectAccess AUTH-03 cases
    - auth-audit.test.ts — skip-guarded LIVE regression test for insertAuthAuditLog
  affects:
    - remix-app/app/lib/authz.server.ts
    - remix-app/app/lib/audit.server.ts
    - remix-app/app/lib/auth.server.ts
    - remix-app/app/lib/assignments.server.ts (new)
    - remix-app/app/routes/_app/settings/assignments.tsx (new)
    - remix-app/app/routes.ts
    - remix-app/app/routes/_app/settings/index.tsx
    - remix-app/db/schema.ts (auditLog.subjectId nullable)
    - remix-app/migrations/ (0013 + journal)
    - remix-app/tests/lib/assignments.test.ts (new)
    - remix-app/tests/db/auth-audit.test.ts (new)
    - live Neon project (migration 0013 applied — audit_log.subject_id DROP NOT NULL)
tech_stack:
  added: []
  patterns:
    - assertSubjectAccess optional 4th param (assignedSubjectIds) for backward-compat per-assignment gate
    - assignments.server.ts service: withTenantDb for all 4 functions (RLS-governed, tenant-scoped)
    - Soft-delete unassign (revokedAt = now(), idempotent assign on unique violation)
    - insertAuthAuditLog: admin path (getDb()), PHI-free, subjectId NULL (no clinical subject at auth time)
    - Better-Auth databaseHooks.session.create.after + .delete.after + user.create.after
    - Best-effort try/catch around all auth-event audit writes (T-07-17 — never fail auth flow)
    - Live regression test calling the REAL service function (no mocks) so FK breakage cannot hide behind try/catch
key_files:
  created:
    - remix-app/app/lib/assignments.server.ts
    - remix-app/app/routes/_app/settings/assignments.tsx
    - remix-app/tests/lib/assignments.test.ts
    - remix-app/tests/db/auth-audit.test.ts
    - remix-app/migrations/0013_audit_log_nullable_subject.sql
  modified:
    - remix-app/app/lib/authz.server.ts
    - remix-app/app/lib/audit.server.ts
    - remix-app/app/lib/auth.server.ts
    - remix-app/app/routes.ts
    - remix-app/app/routes/_app/settings/index.tsx
    - remix-app/db/schema.ts
    - remix-app/migrations/meta/_journal.json
decisions:
  - "assertSubjectAccess 4th param is optional (not required): preserves backward-compat for 7 existing owner-context callers who never pass assignedSubjectIds; undefined = skip gate 3"
  - "auth events write subjectId NULL (NOT the 07-PATTERNS tenantId stub): the stub violated audit_log_subject_id_subjects_id_fk on live; migration 0013 made the column nullable — NULL is semantically honest (no clinical subject at auth time); FK validates when non-NULL"
  - "audit_log RLS policies are keyed on app.tenant_id only — NULL-subject rows remain visible to app_user tenant reads; compliance reads use the admin path regardless"
  - "Session hooks resolve tenantId via getDb() admin SELECT by session.userId — no TenantCtx needed for auth events, consistent with admin path rationale"
  - "auth-audit.test.ts calls the REAL insertAuthAuditLog against live (no mocks) — the original failure was invisible because hooks try/catch + unit-test mocks both masked the FK violation"
  - "subject in assignments.tsx uses displayName not name: subjects table has display_name column, not name"
  - "user.create.after audit event: action = 'invite-redeemed' when pending.rawToken present (real invite), 'sign-up' for break-glass bootstrap"
metrics:
  duration: "~25m across checkpoint resume (Tasks 1-4 complete)"
  completed_date: "2026-06-12"
  tasks_completed: 4
  tasks_total: 4
  files_changed: 12
---

# Phase 7 Plan 04: Per-Assignment Authorization + Assignment Service + Auth-Event Audit Trail

**One-liner:** Per-assignment assertSubjectAccess extension with assignments.server.ts service + owner /settings/assignments UI closing AUTH-03, and Better-Auth session/user hooks writing PHI-free NULL-subject auth events to the immutable audit_log closing AUTH-04 — with migration 0013 (subject_id nullable) fixing the FK violation the checkpoint caught.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | assignments.test.ts — assertSubjectAccess AUTH-03 per-assignment tests | 373dc67 | remix-app/tests/lib/assignments.test.ts |
| 1 (GREEN) | Extend assertSubjectAccess + create assignments.server.ts | 25fec4d | remix-app/app/lib/authz.server.ts, remix-app/app/lib/assignments.server.ts |
| 2 | /settings/assignments UI + route + settings entry point | 410b282 | assignments.tsx, routes.ts, settings/index.tsx |
| 3 | insertAuthAuditLog + Better-Auth session/user hooks | f6cbb8a | remix-app/app/lib/audit.server.ts, remix-app/app/lib/auth.server.ts |
| 4 (fix) | CHECKPOINT finding: audit_log.subject_id nullable (migration 0013) + live regression test | 6f13ec9 | 0013 migration, _journal.json, schema.ts, audit.server.ts, auth-audit.test.ts, 07-PATTERNS.md |

## What Was Built

### Task 1 — assertSubjectAccess extension + assignments.server.ts

**authz.server.ts** — `assertSubjectAccess` extended with optional 4th parameter `assignedSubjectIds?: string[]`:
- Gate 1: client role → always 403
- Gate 2: cross-tenant (subject.tenantId !== userTenantId) → always 403
- Gate 3 (NEW): `user.role === "practitioner" && assignedSubjectIds !== undefined` → deny unless `subject.id ∈ assignedSubjectIds`
- Owners: skip gate 3 entirely — they retain tenant-wide access (D-07)
- `assignedSubjectIds` is OPTIONAL: the 7 existing owner-context callers that pass no 4th arg are unbroken (undefined skips gate 3)

**assignments.server.ts** — new service following the invites.server.ts pattern:
- `assignSubject(ctx, {practitionerId, subjectId, assignedBy})` — INSERT active row; idempotent on unique constraint violation
- `unassignSubject(ctx, {practitionerId, subjectId})` — soft delete (revokedAt=now()); returns `{unassigned: false}` when no active row found (WR-02 fail-closed)
- `listAssignments(ctx)` — all active assignments for the tenant
- `listAssignedSubjectIds(ctx, practitionerId)` — active subjectIds for a practitioner (feeds assertSubjectAccess)
- All 4 functions use `withTenantDb` (RLS-governed via psa tenant policy)

**assignments.test.ts** — 14 pure unit tests covering: client 403, cross-tenant 403 (owner + practitioner), owner pass (empty/non-matching/undefined lists), practitioner deny (empty/non-matching), practitioner pass (in list), backward-compat undefined. All green.

### Task 2 — /settings/assignments UI + route registration

**assignments.tsx** — loader + action + default component:
- Loader AND action both gate `requireUser` + `requireRole(user, ["owner"])` (T-07-15)
- Loader loads practitioners (user table WHERE role=practitioner AND tenantId), subjects (getOwnerSubject), and active assignments
- Action dispatches `assign-subject` → assignSubject / `unassign-subject` → unassignSubject
- Component: Card + practitioner/subject selects + Submit; table of active assignments with per-row unassign Form
- Unauthenticated → /login redirect; client/practitioner → 403

**routes.ts** — `route("settings/assignments", ...)` registered. **settings/index.tsx** — owner-only "Assignments" card with "Manage assignments" link (`canManageAssignments` server-computed boolean).

### Task 3 — Better-Auth auth-event audit hooks (AUTH-04)

**audit.server.ts** — `insertAuthAuditLog(entry: AuthAuditEntry)`:
- Admin path (`getDb()`) — no subject context at auth time
- PHI-free (D-13): only userId / action / tenantId / entityId
- `subjectId: null` (nullable since migration 0013 — see checkpoint finding below)
- Action union: `'sign-in' | 'sign-out' | 'sign-up' | 'invite-redeemed' | 'sign-in-failed' | 'role-changed'`

**auth.server.ts** — wired via Better-Auth databaseHooks:
- `session.create.after` → 'sign-in' (tenantId resolved via admin SELECT by session.userId)
- `session.delete.after` → 'sign-out'
- `user.create.after` → 'invite-redeemed' (real invite) or 'sign-up' (break-glass)
- Every write wrapped in try/catch — a logging failure never fails the auth flow (T-07-17)

### Task 4 — Checkpoint fix: migration 0013 + live regression test

**The checkpoint caught AUTH-04 silently broken** (see Deviations). Fix:
- `migrations/0013_audit_log_nullable_subject.sql` — `ALTER TABLE audit_log ALTER COLUMN subject_id DROP NOT NULL` — registered idx-13 in `_journal.json`, **applied to live Neon** (`npm run db:migrate`; information_schema confirms `is_nullable=YES`; 14 migrations recorded)
- `db/schema.ts` — auditLog.subjectId drops `.notNull()`
- `audit.server.ts` — `subjectId: null` replaces the tenantId stub; doc comment records the FK finding and the RLS note (audit policies keyed on `app.tenant_id` only → NULL-subject rows remain visible to tenant reads)
- `07-PATTERNS.md` — stub pattern corrected with a checkpoint-finding callout
- `tests/db/auth-audit.test.ts` — skip-guarded LIVE regression test (same DATABASE_URL guard as rls-isolation.test.ts): calls the REAL `insertAuthAuditLog` (no mocks), asserts the row lands with NULL subject_id, cleans up via admin path. **Live result: 2/2 passed.** Prevents the next silent breakage — the original failure was invisible because the hooks' try/catch and the unit tests' DB mocks both masked the FK violation.

## Checkpoint Verification Evidence (Task 4 — orchestrator + post-fix)

| Item | Result |
|------|--------|
| tsc / assignments.test.ts / build (automated gate) | VERIFIED — tsc 0, 14/14, build clean |
| Owner UI via HTTP (dev server, owner session) | VERIFIED — /settings 200 with Assignments card; /settings/assignments 200 with assign form. Full round-trip not exercised (no live practitioner account exists); service/authz logic covered by 14 unit tests |
| Auth-event audit trail | **FAILED initially** — FK violation (see Deviations) → **FIXED + re-verified**: auth-audit.test.ts 2/2 against live (sign-in + sign-out rows land with NULL subject_id, then admin-path cleanup; 0 stray rows confirmed) |
| Immutability | VERIFIED — as app_user, UPDATE and DELETE on audit_log fail with `permission denied for table audit_log` (grant-level denial, stronger than policy-level) |
| AUTH-03 deny path | Covered by 14 unit tests (no live practitioner account to exercise end-to-end) |
| Post-fix full gate | tsc 0 · `DB_URL_STUBBED=1 vitest` 274 passed / 0 failed · rls-isolation live 3/3 · auth-audit live 2/2 · `npm run build` clean |

## Deviations from Plan

### Checkpoint-Found Issue (Rule 1 - Bug, fixed on resume)

**1. [Rule 1 - Bug] AUTH-04 silently broken — subjectId tenantId-stub violated FK on live**
- **Found during:** Task 4 checkpoint (orchestrator live verification — zero rows landed after real sign-in/out)
- **Issue:** 07-PATTERNS.md prescribed `subjectId: entry.tenantId` as a stub for auth events, but `audit_log.subject_id` was NOT NULL with an FK to `subjects(id)` — no subjects row carries a tenant id, so every auth-event INSERT failed with `audit_log_subject_id_subjects_id_fk`. The hooks' best-effort try/catch swallowed the violation and the unit tests mock the DB, so nothing surfaced it
- **Fix:** migration 0013 (`subject_id DROP NOT NULL`, applied live), schema.ts updated, `insertAuthAuditLog` writes `subjectId: null` (semantically honest), 07-PATTERNS.md corrected, and a skip-guarded LIVE regression test (`tests/db/auth-audit.test.ts`) calls the real function against live so this class of failure can never hide again
- **Files modified:** migrations/0013_audit_log_nullable_subject.sql, migrations/meta/_journal.json, db/schema.ts, app/lib/audit.server.ts, tests/db/auth-audit.test.ts, 07-PATTERNS.md
- **Commit:** 6f13ec9

### Auto-fixed Issues

**2. [Rule 1 - Bug] subjects table has displayName not name**
- **Found during:** Task 2 (tsc caught `Property 'name' does not exist`)
- **Fix:** Changed `SubjectRow.name` to `SubjectRow.displayName` throughout assignments.tsx
- **Commit:** 410b282

**3. [Rule 1 - Bug] Incorrect relative import path for schema in assignments.tsx**
- **Found during:** Task 2 (tsc: `Cannot find module '../../../db/schema'`)
- **Fix:** Updated to `../../../../db/schema` (4 levels up from routes/_app/settings/)
- **Commit:** 410b282

**4. [Rule 1 - Bug] Type error on user cast in user.create.after hook**
- **Found during:** Task 3 (tsc TS2352 — Better-Auth User type doesn't overlap `{ tenantId: string }`)
- **Fix:** Cast via `unknown` intermediary (`user as unknown as Record<string, unknown>`)
- **Commit:** f6cbb8a

## Known Stubs

None — all data flows are wired. assignments.tsx uses real data from assignments.server.ts via withTenantDb/RLS.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: schema-change | remix-app/migrations/0013_audit_log_nullable_subject.sql | audit_log.subject_id now nullable — NULL rows are auth events only (written exclusively by insertAuthAuditLog admin path). PHI lifecycle events still carry real subject ids; FK validates when non-NULL. Audit RLS SELECT/INSERT policies key on tenant_id only, unchanged. |

All planned STRIDE threats T-07-14 through T-07-18 addressed. T-07-16 (auth events missing from log) is the threat the checkpoint itself caught and closed.

## Self-Check

**Checking created files exist:**
- `remix-app/app/lib/assignments.server.ts` — exists (committed 25fec4d)
- `remix-app/app/routes/_app/settings/assignments.tsx` — exists (committed 410b282)
- `remix-app/tests/lib/assignments.test.ts` — exists (committed 373dc67)
- `remix-app/tests/db/auth-audit.test.ts` — exists (committed 6f13ec9)
- `remix-app/migrations/0013_audit_log_nullable_subject.sql` — exists (committed 6f13ec9)

**Checking commits exist:**
- 373dc67 — test(07-04): RED assignments.test.ts
- 25fec4d — feat(07-04): extend assertSubjectAccess + assignments.server.ts
- 410b282 — feat(07-04): /settings/assignments UI + route + settings entry point
- f6cbb8a — feat(07-04): wire Better-Auth auth events into audit_log
- 6f13ec9 — fix(07-04): audit_log.subject_id nullable (checkpoint finding)

**Live verification evidence:**
- 14 migrations recorded in drizzle.__drizzle_migrations (0000–0013)
- audit_log.subject_id `is_nullable=YES` on live
- auth-audit.test.ts: 2/2 PASSED against live (real insertAuthAuditLog, rows asserted, cleanup verified — 0 strays)
- rls-isolation.test.ts: 3/3 PASSED against live
- tsc 0; vitest 274 passed / 0 failed; build clean

## Self-Check: PASSED
