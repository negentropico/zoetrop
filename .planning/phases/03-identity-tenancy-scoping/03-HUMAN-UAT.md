---
status: partial
phase: 03-identity-tenancy-scoping
source: [03-VERIFICATION.md]
started: 2026-06-09
updated: 2026-06-09
---

## Current Test

[awaiting human testing — both items are post-deploy; user pre-approved deferral]

## Tests

### 1. Session persists across a full browser restart (AUTH-01)
expected: After signing in at /login, fully quit and reopen the browser to zoetrop.vercel.app/dashboard — still authenticated, no re-login. Mechanism is code-verified (30-day persistent `better-auth.session_token` cookie observed in the local smoke test); this confirms it in a real browser post-deploy.
result: passed — owner verified login works (2026-06-09)

### 2. PILOT_BASIC_AUTH deleted from Vercel + prod returns 200 (D-05)
expected: After this branch is merged to production and deployed, delete the `PILOT_BASIC_AUTH` env var from Vercel (Production + Preview) and confirm `curl -I https://zoetrop.vercel.app/` returns HTTP 200 (not 401). Code side already done (removed from root.tsx). Blocked pre-deploy because production still runs the old Basic-Auth code; tracked in `.planning/todos/pending/delete-pilot-basic-auth-post-deploy.md`. OWNER_INVITE_TOKEN already pre-staged to Vercel Prod+Preview.
result: [pending]

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
