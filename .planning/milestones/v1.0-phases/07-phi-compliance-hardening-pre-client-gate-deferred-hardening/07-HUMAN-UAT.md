---
status: passed
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
source: [07-VERIFICATION.md]
started: 2026-06-12T21:35:00Z
updated: 2026-06-12T22:05:00Z
verified_by: chrome-devtools + live Neon (orange-paper-97068012)
---

## Current Test

[all tests complete]

## Tests

### 1. AUTH-04 live audit log check

expected: Sign out and sign back in as owner; recent sign-in/sign-out rows present in audit_log with real role and no PHI values.
result: PASS — Signed out via the account menu in Chrome (http://localhost:5173) → row id=73 `action=sign-out, role=owner, subject_id=null, table_name=null`. Signed back in through the real Better-Auth `/api/auth/sign-in/email` endpoint (HTTP 200, session cookie set, role=owner) → row id=74 `action=sign-in, role=owner, subject_id=null, table_name=null`. Both fresh rows carry the actor role and zero PHI. Note: actor was the owner, so role=owner is correct-but-not-discriminating for the WR-04 "real role vs hardcoded owner" fix — that fix is confirmed at source level (insertAuthAuditLog now threads entry.role from the user row); a non-owner sign-in would show its true role.

### 2. audit_log immutability check

expected: `SET ROLE app_user; UPDATE audit_log ...` → denied for app_user.
result: PASS — Inside a transaction (mirroring withTenantDb) `SET LOCAL ROLE app_user` then `UPDATE audit_log SET action='TAMPERED' WHERE id=74` → "permission denied for table audit_log". DELETE likewise denied. Row 74 unchanged (action still 'sign-in'). REVOKE UPDATE/DELETE + RLS immutability hold on live Neon.

### 3. /settings/assignments owner UI round-trip (re-assign now works)

expected: assign → appears → unassign → removed → re-assign SAME pair → succeeds with real access (partial-index fix live).
result: PASS — In Chrome as owner: assigned practitioner test@test.com → subject "Owner" ("Assignment created.", row visible). Unassigned ("No active assignments"). RE-ASSIGNED the same pair → "Assignment created." with a fresh active row. Live DB confirmed exactly 1 revoked + 1 active row for the same (tenant, practitioner, subject) triple — the partial unique index `WHERE revoked_at IS NULL` lets them coexist, proving CR-02 closed end-to-end. Double-assign of the already-active pair returned a graceful "Unable to create assignment. Try again." flash with NO duplicate row and NO 500/error-boundary — milder than 07-REVIEW.md CR-01 predicted (the thrown 23505 is caught at the route action and rendered as a generic error rather than crashing). Access control unaffected (fail-closed). Test rows cleaned up afterward (PSA back to 0).

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None blocking. One non-blocking UX defect carried from 07-REVIEW.md CR-01: assignSubject's 23505 idempotency guard checks err.code but drizzle wraps the pg code on err.cause.code, so a double-assign shows a generic "Unable to create assignment" instead of an idempotent "Already assigned". No access-control or data-integrity impact (verified live: no duplicate, no crash). Fix via `/gsd:code-review 7 --fix`.
