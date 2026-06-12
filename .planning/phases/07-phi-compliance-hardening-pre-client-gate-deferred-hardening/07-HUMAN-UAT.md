---
status: partial
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
source: [07-VERIFICATION.md]
started: 2026-06-12T21:35:00Z
updated: 2026-06-12T21:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. AUTH-04 live audit log check

expected: Sign out and sign back in as owner, then run `SELECT action, user_id, role, tenant_id, timestamp FROM audit_log WHERE action IN ('sign-in','sign-out') ORDER BY timestamp DESC LIMIT 5;` against live Neon. Recent sign-in/sign-out rows present with no PHI values; new rows after the 07-07 fix should carry the real actor role (owner rows show 'owner' legitimately; any practitioner/client sign-in after deploy should show its true role, not a falsified 'owner').
result: [pending]

### 2. audit_log immutability check

expected: `SET ROLE app_user; UPDATE audit_log SET action='x' WHERE id=(SELECT id FROM audit_log LIMIT 1); RESET ROLE;` → 0 rows updated or RLS policy violation — audit_log UPDATE is denied for app_user.
result: [pending]

### 3. /settings/assignments owner UI round-trip (re-assign now works)

expected: Sign in as owner → /settings/assignments → assign a practitioner to a subject → appears in list → unassign → removed → re-assign the SAME pair → succeeds and grants real access (partial-index fix live on Neon). Note: a double-assign of an already-active pair currently returns a 500 instead of a graceful "Already assigned" (known non-blocking defect — 23505 check reads the wrong error layer; fix via /gsd:code-review 7 --fix).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
