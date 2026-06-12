---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "07"
subsystem: auth/access-control/audit
tags: [gate-3, per-assignment, pdf-bytes, consent, audit-role, auth-hooks]
dependency_graph:
  requires: [07-04, 07-05]
  provides: [AUTH-03-complete-on-ingest-routes, AUTH-04-real-role-in-audit]
  affects: [remix-app/app/routes/_app/ingest/document.tsx, remix-app/app/routes/_app/ingest/consent.tsx, remix-app/app/lib/audit.server.ts, remix-app/app/lib/auth.server.ts, remix-app/tests/lib/per-assignment-wiring.test.ts]
tech_stack:
  added: []
  patterns: [Gate-3 per-assignment assertSubjectAccess, listAssignedSubjectIds conditional, entry.role ?? fallback]
key_files:
  created: []
  modified:
    - remix-app/app/routes/_app/ingest/document.tsx
    - remix-app/app/routes/_app/ingest/consent.tsx
    - remix-app/app/lib/audit.server.ts
    - remix-app/app/lib/auth.server.ts
    - remix-app/tests/lib/per-assignment-wiring.test.ts
decisions:
  - "Used entry.role ?? 'owner' fallback (not null fallback) to maintain semantic continuity for break-glass / role-unavailable paths while fixing the hardcode"
  - "Threaded role from pending invite (pending.role) for sign-up/invite-redeemed events — the invite already carries the role assigned to the new user"
  - "Removed node_modules symlink after testing; symlink was test-only infrastructure, not committed"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-12"
  tasks: 3
  files: 5
---

# Phase 07 Plan 07: Gate-3 + Audit Role Gap Closure Summary

**One-liner:** Gate-3 per-assignment enforcement wired into document.tsx PDF byte-stream and consent.tsx loader+action; auth audit log falsification fixed by threading real actor role from user-row select and invite state.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire Gate 3 into document.tsx PDF byte stream (CR-01) | 1503ef1 | document.tsx |
| 2 | Wire Gate 3 into consent.tsx loader + action | ce55194 | consent.tsx |
| 3 | Thread real role into insertAuthAuditLog + extend wiring tests | 6f84ddb | audit.server.ts, auth.server.ts, per-assignment-wiring.test.ts |

## What Was Built

### Task 1: document.tsx — Highest PHI-density route gated (CR-01)

**Problem:** `GET /ingest/documents/:id` called `assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!)` — only 3 args, no `subject.id`. Gate 3 permanently skipped. An unassigned practitioner in the tenant could fetch any subject's raw lab PDF.

**Fix:** Mirrored the verified review.tsx pattern:
1. Added `TenantCtx` import from `~/lib/db.server` and `listAssignedSubjectIds` from `~/lib/assignments.server`
2. Constructed `ctx` from doc row post-load
3. Resolved `assignedIds = user.role === "practitioner" ? await listAssignedSubjectIds(ctx, user.id) : undefined`
4. Changed call to `assertSubjectAccess(user, { tenantId: doc.tenantId, id: doc.subjectId }, user.tenantId!, assignedIds)`
5. The check appears BEFORE `Buffer.from(doc.pdfBytes, "base64")` — zero bytes decoded for denied requests

**Result:** Unassigned practitioner → 403, no bytes decoded. Assigned practitioner / owner → 200 with PDF.

### Task 2: consent.tsx — Legal consent artifact gated (WR-03)

**Problem:** Both loader (`GET /ingest/consent`) and action (`POST /ingest/consent`) called the 3-arg `assertSubjectAccess`. An unassigned practitioner could record a legal consent record for an unauthorized subject.

**Fix:**
1. Added `listAssignedSubjectIds` import
2. In both loader and action: moved `ctx` construction BEFORE `assertSubjectAccess` (ctx depends only on `user` + `subject.id`, both already available)
3. Added `assignedIds` resolution using same role-conditional pattern
4. Changed both calls to 4-arg form: `assertSubjectAccess(user, subject, user.tenantId!, assignedIds)`

`subject` from `getOwnerSubject` already carries `id` — no reshaping required.

**Result:** Both the consent page load and consent submit deny unassigned practitioners (403). No consent record written for unauthorized subjects.

### Task 3: insertAuthAuditLog + wiring tests (WR-04)

**Part A — Audit role fix:**

`audit.server.ts`:
- Added optional `role?: AppRole` field to `AuthAuditEntry`
- Changed `insertAuthAuditLog` to insert `entry.role ?? 'owner' as AppRole` instead of unconditional `'owner' as AppRole`
- 'owner' is now semantically a fallback (break-glass / role-unavailable) not a fabrication

`auth.server.ts`:
- Added `AppRole` import from `./authz.server`
- Extended sign-in hook's select to include `role: userTable.role`; passes `role: rows[0]?.role as AppRole | undefined` into `insertAuthAuditLog`
- Extended sign-out hook identically
- sign-up/invite-redeemed hook now threads `role: pending?.role as AppRole | undefined` from the pending invite state (which carries the role injected by `user.create.before`)

**Part B — Extended wiring tests:**

Added describe block "document.tsx + consent.tsx Gate-3 route contract" to `per-assignment-wiring.test.ts` with 8 new pure-unit assertions:
- document: unassigned practitioner + doc.subjectId present → 403
- document: assigned practitioner (subject.id ∈ set) → 200
- document: owner (assignedIds undefined) → 200
- document: subject WITHOUT id + practitioner non-empty set → 403 (pins the pre-fix bug shape)
- consent: unassigned practitioner (loader) → 403
- consent: unassigned practitioner (action/POST) → 403
- consent: assigned practitioner → 200
- consent: owner → 200

All 17 tests pass (`DB_URL_STUBBED=1 npx vitest run tests/lib/per-assignment-wiring.test.ts`); full suite 296 pass / 79 skip.

## Verification Results

| Check | Result |
|-------|--------|
| Typecheck (`npx react-router typegen && npx tsc --noEmit`) | PASS |
| Unit tests (`DB_URL_STUBBED=1 npx vitest run`) | 296 pass, 79 skip (0 fail) |
| Build gate (`npm run build`) | PASS — exit 0, no .server client leak |
| `grep -c listAssignedSubjectIds app/routes/_app/ingest/document.tsx` ≥ 1 | 3 (import + call + ctx comment) |
| `grep -c "assertSubjectAccess(user, subject, user.tenantId!, assignedIds)" app/routes/_app/ingest/consent.tsx` == 2 | 2 (loader + action) |
| No 3-arg bug in document.tsx | CLEAN |
| `entry.role ?? 'owner'` in audit.server.ts | PRESENT |
| `role: userTable.role` in auth.server.ts | 2 occurrences (sign-in + sign-out) |

## Deviations from Plan

None — plan executed exactly as written. The node_modules symlink created for worktree testing was cleaned up before commit.

## Auth Gates

None encountered.

## Known Stubs

None — all code paths are fully wired. No placeholders or TODO markers introduced.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All changes are hardening of existing routes and audit writer.

## Self-Check

- [x] document.tsx exists and contains listAssignedSubjectIds import + 4-arg assertSubjectAccess
- [x] consent.tsx exists and contains 2x 4-arg assertSubjectAccess
- [x] audit.server.ts exists and contains `entry.role ?? 'owner'`
- [x] auth.server.ts exists and contains `role: userTable.role` in 2 selects
- [x] per-assignment-wiring.test.ts exists with "document.tsx + consent.tsx Gate-3 route contract" describe block
- [x] Commits 1503ef1, ce55194, 6f84ddb all exist

## Self-Check: PASSED
