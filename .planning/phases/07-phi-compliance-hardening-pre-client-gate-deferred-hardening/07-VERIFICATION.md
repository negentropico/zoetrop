---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
verified: 2026-06-12T22:00:00Z
status: human_needed
score: 4/5
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "document.tsx (GET /ingest/documents/:id) Gate 3 gap — plan 07-07 wired 4-arg assertSubjectAccess with listAssignedSubjectIds and doc.subjectId; unassigned practitioner now gets 403, zero bytes"
    - "idx_psa_active_unique full index breaking revoke-then-reassign — plan 07-08 replaced full index with partial (WHERE revoked_at IS NULL) in schema.ts + migration 0014; applied to live Neon (human-checkpoint approved, pg_indexes.indexdef verified); assign→revoke→reassign round-trip test 15/15 passed live"
  gaps_remaining:
    - "assignSubject 23505 idempotent-duplicate path is dead code: plan 07-08 replaced substring matching with (err as { code?: string }).code === '23505' but drizzle-orm 0.45.2 wraps all query errors in DrizzleQueryError (only .cause, not .code); the Postgres error code lives on err.cause.code. A double-assign on an already-active row throws unhandled 500 instead of returning { assigned: true, alreadyExists: true }."
  regressions: []
gaps:
  - truth: "assignSubject distinguishes a true active-duplicate (Postgres error code 23505) from other errors via structured code matching, not fragile substring matching"
    status: failed
    reason: "The implementation checks (err as { code?: string }).code === '23505' but drizzle-orm 0.45.2 wraps all pg-core query errors in DrizzleQueryError (pg-core/session.js lines 41/48/59/66/81/98). DrizzleQueryError only carries .cause, .query, .params, .message — no .code property. The Postgres 23505 lives on err.cause.code (the underlying NeonDbError). The check can never be true. A double-assign on an already-active assignment rethrows the DrizzleQueryError as an unhandled 500 instead of returning { assigned: true, alreadyExists: true }. The round-trip test (assign→unassign→assign) never triggers a 23505 and therefore cannot catch this. Old substring matching is completely removed."
    artifacts:
      - path: "remix-app/app/lib/assignments.server.ts"
        issue: "Line 72: (err as { code?: string }).code === '23505' — inspects DrizzleQueryError wrapper, not the underlying NeonDbError. Code is at err.cause.code. This path is permanently dead on drizzle-orm >=0.44."
    missing:
      - "Replace the single-layer check with a two-layer isUniqueViolation helper: const code = (err as { code?: string }).code ?? ((err as { cause?: { code?: string } }).cause?.code); return code === '23505';"
      - "Extend assignments.test.ts round-trip describe block with a double-assign step (call assignSubject twice while active) asserting the second call returns { assigned: true, alreadyExists: true } — this test currently fails against the existing code and proves the fix"
human_verification:
  - test: "Sign out and sign back in as owner. Run: SELECT action, user_id, role, tenant_id, timestamp FROM audit_log WHERE action IN ('sign-in','sign-out') ORDER BY timestamp DESC LIMIT 5;"
    expected: "Recent sign-in and sign-out rows present with no PHI values. role column should now show the actor's real role (not hardcoded 'owner') — verify at least one non-owner sign-in has the correct role if any practitioner/client accounts have signed in."
    why_human: "Requires live Neon psql access and a recent auth cycle; cannot be verified by grep alone"
  - test: "Attempt UPDATE on audit_log as app_user: SET ROLE app_user; UPDATE audit_log SET action='x' WHERE id=(SELECT id FROM audit_log LIMIT 1); RESET ROLE;"
    expected: "0 rows updated or RLS policy violation — audit_log UPDATE is denied for app_user"
    why_human: "DB-layer immutability property (AUTH-04); requires live psql session as app_user"
  - test: "Owner UI round-trip: /settings/assignments — assign a practitioner to a subject, confirm assignment appears in the list, unassign it, confirm removal, then re-assign the same pair."
    expected: "Assign works. Unassign works. Re-assign (after unassign) creates a new active assignment and the practitioner regains access — this is the CR-02 regression check in the live UI. Also attempt to assign the same pair TWICE while active (double-assign) and verify the response from the server."
    why_human: "Visual/behavioral check; also confirms the partial index live behavior and surfaces the double-assign 500 defect if it is reached"
---

# Phase 7: PHI Compliance Hardening — Verification Report (Re-verification Round 3)

**Phase Goal:** PHI Compliance Hardening — RLS + Isolation Engineering (pre-client gate, part 1). On the existing Neon project: atomic host-portable RLS enable+policies (GUC-based), withTenantDb SET LOCAL wrapper + pool-leak test, cross-tenant isolation tests in CI, practitioner→subject assignments (AUTH-03), immutable auth/access audit log (AUTH-04).
**Verified:** 2026-06-12T22:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap-closure plans 07-07 (document.tsx Gate 3 + consent.tsx Gate 3 + audit role) and 07-08 (partial unique index + structured error matching)

## Re-verification Summary

Previous verification (2026-06-12T20:42Z) returned `gaps_found` with 2 blockers:

- Blocker 1 (document.tsx PDF stream skipping Gate 3) — **FIXED by plan 07-07.** Confirmed in codebase: `document.tsx` lines 50-55 build TenantCtx, resolve `assignedIds` role-conditionally, and call `assertSubjectAccess(user, { tenantId: doc.tenantId, id: doc.subjectId }, user.tenantId!, assignedIds)`. Old 3-arg call is gone. 17/17 wiring tests pass.
- Blocker 2 (full unique index breaking revoke-then-reassign) — **FIXED by plan 07-08.** Schema defines `.where(sql\`revoked_at IS NULL\`)`. Migration 0014 authored and applied to live Neon (human-verified per SUMMARY). SUMMARY attests: `pg_indexes.indexdef` = `... WHERE (revoked_at IS NULL)`. Round-trip test (assign→unassign→assign) reports 15 passed live.

One new blocker surfaces from the plan 07-08 code review (07-REVIEW.md CR-01): the structured 23505 error matching is dead code on drizzle-orm 0.45.2 (wrong error layer). This was plan 07-08 must-have truth #3 and it is FAILED (see gaps below).

The post-gates (typecheck PASS, npm run build PASS, DB_URL_STUBBED=1 vitest 296 passed / 80 skipped / 0 failed) are confirmed: full vitest suite re-run at verification time shows 296 passed / 80 skipped, consistent with SUMMARY claims.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NOBYPASSRLS app_user role live on Neon with host-portable GUC RLS on all 16 PHI tables; cross-tenant isolation tests passing; withTenantDb SET LOCAL wrapper non-leaking (TEN-02, TEN-03) | VERIFIED | `0011_rls_policies.sql` — 16 ENABLE ROW LEVEL SECURITY, NOBYPASSRLS, current_setting predicates; `rls-isolation.test.ts` 3 skip-guarded describe blocks; DB_URL_STUBBED=1 vitest exits 0 with 3 skipped |
| 2 | Every tenant/subject-scoped data read in data.server.ts, consent.server.ts, and audit.server.ts runs inside withTenantDb(ctx) (TEN-03) | VERIFIED | `data.server.ts` imports withTenantDb and wraps all 10 entity reads; `consent.server.ts` wraps both checkConsent and insertConsent; `audit.server.ts` exports session-path insertAuditLog + admin insertAuditLogAdmin + admin insertAuthAuditLog |
| 3 | Client-role users cannot read subject PHI — all 13 dashboard/metrics/insights/protocol loaders enforce a role gate via requireSubjectCtx | VERIFIED | requireSubjectCtx exported from authz.server.ts (line 127); grep -rc returns 1 for all 13 target loaders; requireSubjectCtx calls assertSubjectAccess which denies client role at Gate 1; 5/5 require-subject-ctx.test.ts tests passing |
| 4 | assertSubjectAccess enforces per-assignment access for practitioners on ALL practitioner-admitting routes including document.tsx PDF byte stream (AUTH-03 SC-4) | VERIFIED | document.tsx lines 50-55 confirmed: TenantCtx built from doc row, assignedIds resolved role-conditionally, 4-arg assertSubjectAccess with `id: doc.subjectId` present; old 3-arg call gone; consent.tsx loader (line 40) and action (line 65) both 4-arg; per-assignment-wiring.test.ts 17/17 pass covering document + consent Gate-3 matrix |
| 5 | Better-Auth auth events (sign-in, sign-out, sign-up, invite-redeemed) are written to the immutable audit_log; audit_log is INSERT+SELECT only for app_user; auth audit rows carry the real actor role (AUTH-04) | VERIFIED | auth.server.ts session.create.after and session.delete.after selects include `role: userTable.role` (2 occurrences confirmed); user.create.after threads `pending?.role`; audit.server.ts insertAuthAuditLog inserts `entry.role ?? 'owner'` (fallback only when unavailable); 0011 migration has audit_immutable_select + audit_insert_only + REVOKE UPDATE/DELETE |

**Score:** 4/5 truths verified (Truth 4 is newly VERIFIED — CR-01 and CR-02 blockers from previous round both closed)

### assignSubject Idempotency Defect (Plan 07-08 Must-Have #3 — FAILED)

Plan 07-08 must-have truth #3 — "assignSubject distinguishes a true active-duplicate via structured code matching, not fragile substring matching" — is NOT met. The code `(err as { code?: string }).code === '23505'` checks the wrong error layer. Drizzle-orm 0.45.2 wraps all pg-core query errors in `DrizzleQueryError` which only has `.cause` (the underlying `NeonDbError` carries `.code`). The 23505 path is dead code; a double-assign throws unhandled 500. The old substring matching is gone but the replacement is equally non-functional.

**Impact on phase goal (AUTH-03 SC-4):** The core AUTH-03 requirement — practitioners access only assigned subjects, assignment lifecycle works (assign/revoke/reassign) — IS satisfied. The partial index fix and round-trip test cover the lifecycle correctly. The dead idempotency guard affects the double-assign edge case only: it converts a UI-prevented scenario (the UI shows already-assigned) from a graceful `alreadyExists: true` response into an unhandled 500. This is a correctness defect in plan 07-08's own must-have but is NOT a blocker against AUTH-03's access-control semantics.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `remix-app/app/routes/_app/ingest/document.tsx` | Gate-3-wired PDF byte-stream loader with listAssignedSubjectIds and 4-arg assertSubjectAccess | VERIFIED | 3 occurrences of listAssignedSubjectIds (import + ctx comment + call); 4-arg call with `id: doc.subjectId` present; pre-stream positioning confirmed; old 3-arg call gone |
| `remix-app/app/routes/_app/ingest/consent.tsx` | Gate-3-wired consent loader + action with listAssignedSubjectIds | VERIFIED | 2x `assertSubjectAccess(user, subject, user.tenantId!, assignedIds)` confirmed (loader line 40, action line 65); listAssignedSubjectIds imported; no bare 3-arg calls remain |
| `remix-app/app/lib/audit.server.ts` | insertAuthAuditLog with real role via entry.role | VERIFIED | `entry.role ?? 'owner' as AppRole` in insertAuthAuditLog; `role?: AppRole` in AuthAuditEntry interface; fallback is semantic (break-glass), not fabrication |
| `remix-app/app/lib/auth.server.ts` | Sign-in + sign-out hooks with role: userTable.role in selects | VERIFIED | 2 occurrences of `role: userTable.role` (sign-in and sign-out hooks); `role: rows[0]?.role as AppRole | undefined` passed to insertAuthAuditLog; sign-up hook threads `pending?.role` |
| `remix-app/tests/lib/per-assignment-wiring.test.ts` | New describe block for document.tsx + consent.tsx Gate-3 matrix | VERIFIED | Lines 160-238 confirmed: 4 document scenarios + 4 consent scenarios (8 new tests); total 17/17 passing |
| `remix-app/db/schema.ts` | Partial unique index with .where(sql`revoked_at IS NULL`) | VERIFIED | Line 291: `uniqueIndex('idx_psa_active_unique').on(t.tenantId, t.practitionerId, t.subjectId).where(sql\`revoked_at IS NULL\`)` confirmed; `sql` imported from drizzle-orm |
| `remix-app/migrations/0014_psa_partial_unique_index.sql` | DROP + CREATE partial index WHERE revoked_at IS NULL | VERIFIED | DROP INDEX IF EXISTS present; CREATE UNIQUE INDEX ... WHERE revoked_at IS NULL present; hand-authored header comment |
| `remix-app/migrations/meta/_journal.json` | Entry idx=14 tag=0014_psa_partial_unique_index | VERIFIED | Confirmed present |
| `remix-app/app/lib/assignments.server.ts` | Structured 23505 error matching (not substring) | PARTIAL | `(err as { code?: string }).code === '23505'` present — substring matching removed; BUT check is at wrong error layer (DrizzleQueryError wraps the code to .cause.code); 23505 path is dead code on drizzle-orm 0.45.2 |
| `remix-app/tests/lib/assignments.test.ts` | describe.skipIf round-trip regression test | VERIFIED | describe.skipIf(!connectionString) block with "round-trip" title; assign→unassign→assign lifecycle with regression assertion; skip-guard mirrors rls-isolation.test.ts; 14 passed / 1 skipped in CI mode |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `document.tsx` | listAssignedSubjectIds → assertSubjectAccess Gate 3 | `user.role === "practitioner" ? await listAssignedSubjectIds(ctx, user.id) : undefined` before assertSubjectAccess | WIRED | Lines 50-55 confirmed; ctx built from doc row; subject shape includes id; 4-arg call present; pre-stream ordering verified |
| `consent.tsx` loader | listAssignedSubjectIds → assertSubjectAccess Gate 3 | same role-conditional pattern before assertSubjectAccess | WIRED | Lines 35-40 confirmed; ctx moved before gate; 4-arg call |
| `consent.tsx` action | listAssignedSubjectIds → assertSubjectAccess Gate 3 | same role-conditional pattern before assertSubjectAccess | WIRED | Lines 60-65 confirmed; ctx moved before gate; 4-arg call |
| `auth.server.ts` | insertAuthAuditLog with real role | `role: rows[0]?.role as AppRole \| undefined` in session.create.after and session.delete.after | WIRED | Both hooks confirmed; role selected from userTable and passed through |
| `schema.ts idx_psa_active_unique` | live Neon partial index via migration 0014 | `DROP INDEX IF EXISTS + CREATE UNIQUE INDEX ... WHERE revoked_at IS NULL` | WIRED (per SUMMARY + human-checkpoint) | Migration 0014 applied; SUMMARY attests pg_indexes.indexdef contains WHERE (revoked_at IS NULL); ledger entry 16; live round-trip 15/15 |
| `assignments.server.ts assignSubject catch` | Postgres 23505 via `(err as { code?: string }).code === '23505'` | structured code check | NOT_WIRED (dead code) | DrizzleQueryError has no .code property; code is at err.cause.code; check never matches; double-assign throws 500 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|-------------|--------|-------------------|--------|
| `document.tsx:loader` | doc (tenantId, subjectId, pdfBytes) | getDb() select from labDocuments | Yes — Neon, BYPASSRLS admin path (pre-Gate 3 lookup is noted deficiency in review IN-01/WR-03, not a blocker) | FLOWING — gated before bytes decoded |
| `assignments.server.ts:listAssignedSubjectIds` | subjectIds[] | withTenantDb + tx.select from practitioner_subject_assignments WHERE revoked_at IS NULL | Yes — Neon, RLS-governed app_user path; partial index live means active-only rows | VERIFIED (FLOWING) |
| `audit.server.ts:insertAuthAuditLog` | audit_log row | getDb() INSERT (admin path, neondb_owner) | Yes — writes to Neon with actor's real role | VERIFIED (FLOWING) |
| `assignments.server.ts:assignSubject 23505 catch` | { assigned, alreadyExists } return value | DrizzleQueryError.code (undefined) | No — dead code path; double-assign produces unhandled 500 | DISCONNECTED (idempotency guard only, not auth path) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| per-assignment-wiring.test.ts (17 tests) | DB_URL_STUBBED=1 npx vitest run tests/lib/per-assignment-wiring.test.ts | 17 passed / 0 failed | PASS |
| assignments.test.ts (CI mode) | DB_URL_STUBBED=1 npx vitest run tests/lib/assignments.test.ts | 14 passed / 1 skipped / 0 failed | PASS |
| Full vitest suite | DB_URL_STUBBED=1 npx vitest run | 296 passed / 80 skipped (36 files) | PASS |
| document.tsx — no old 3-arg call | grep -q "assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!)" app/routes/_app/ingest/document.tsx | NOT_FOUND | PASS |
| consent.tsx — 2x 4-arg calls | grep -c "assertSubjectAccess(user, subject, user.tenantId!, assignedIds)" app/routes/_app/ingest/consent.tsx | 2 | PASS |
| assignments.server.ts — no substring matching | grep -c "msg.includes\|message.*unique" app/lib/assignments.server.ts | 0 | PASS |
| schema.ts — partial index | grep -E "uniqueIndex.*where\(sql" db/schema.ts | PRESENT | PASS |
| DrizzleQueryError layer check | Checked node_modules/drizzle-orm/errors.js — DrizzleQueryError has .cause not .code | err.code undefined | FAIL (23505 dead code) |

### Probe Execution

No probe scripts found in `scripts/*/tests/probe-*.sh`. Live migration verification attested by orchestrator via human checkpoint (Task 2 of plan 07-08) with pg_indexes.indexdef proof.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TEN-02 | 07-01, 07-02, 07-03 | Postgres RLS prevents cross-tenant/cross-subject row returns | VERIFIED | 0011 RLS policies with GUC predicates on 16 PHI tables; rls-isolation.test.ts 3 skip-guarded blocks; all entity reads via withTenantDb |
| TEN-03 | 07-01, 07-02, 07-03 | Tenant/subject context set per-request via SET LOCAL inside a transaction, no pool leak | VERIFIED | withTenantDb issues SET LOCAL (transaction-scoped GUCs); pool non-leak test in rls-isolation.test.ts; 0012 migration grants SET permission |
| AUTH-03 | 07-01, 07-04, 07-05, 07-06, 07-07, 07-08 | Practitioner accesses only assigned subjects | VERIFIED (core access control) | Gate 3 now wired in all 6 practitioner-admitting routes (including document.tsx — the final gap from previous round); consent.tsx also wired; per-assignment-wiring.test.ts 17/17; assignment lifecycle (assign/revoke/reassign) proven by partial index + round-trip test. Residual defect: double-assign 500 (idempotency guard dead code, does not block access-control semantics). |
| AUTH-04 | 07-02, 07-04, 07-07 | Auth + access events in immutable audit log | VERIFIED | sign-in/out/sign-up hooks in auth.server.ts; real actor role threaded from userTable.role and pending invite; insertAuthAuditLog admin path; audit_log INSERT+SELECT-only RLS; REVOKE UPDATE/DELETE defense-in-depth |

**Note:** COMP-02/COMP-03 are mapped to Phase 8 per REQUIREMENTS.md and are correctly deferred. No orphaned Phase 7 requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `remix-app/app/lib/assignments.server.ts` | 72 | `(err as { code?: string }).code === '23505'` — checks wrong error layer; DrizzleQueryError has no .code on drizzle-orm 0.45.2 | Warning | Idempotency guard is dead code; double-assign throws 500 instead of graceful alreadyExists return. Does not affect access control — the double-assign scenario is a UI-edge case, not the auth path. |
| `remix-app/app/lib/audit.server.ts` | 143 | `entry.role ?? 'owner' as AppRole` — fallback still inflates privilege to owner when role unavailable | Warning (carried forward WR-01) | For NULL-role sign-ins or user-create events where pending is null, falsified owner claim in immutable log. Reduced from prior BLOCKER since main paths are now threaded. Compliance concern only. |
| `remix-app/app/routes/_app/ingest/consent.tsx` | 47, 68, 85 | Unvalidated `next` parameter passed to `redirect()` — open redirect | Warning (carried forward WR-02) | Phishing risk on consent flow; unchanged from prior review; not in this wave's scope |
| `remix-app/app/routes/_app/ingest/document.tsx` | 37-41 | Full PHI row (including pdfBytes) fetched on admin BYPASSRLS path before Gate 2 validates tenancy | Info (carried forward WR-03) | RLS backstop never sees this read; pre-authz PHI fetch on admin path. App-layer gate prevents serving; low immediate risk. |

No `TBD`, `FIXME`, or `XXX` debt markers found in Phase 7 modified files.

### Human Verification Required

### 1. AUTH-04 Live Audit Log Role Check

**Test:** Sign out and sign back in as owner. Run: `SELECT action, user_id, role, tenant_id, timestamp FROM audit_log WHERE action IN ('sign-in','sign-out') ORDER BY timestamp DESC LIMIT 5;`
**Expected:** Recent sign-in and sign-out rows present with no PHI values. `role` column should carry the actor's real role (not hardcoded 'owner' for all rows) — verify if any non-owner actors have signed in.
**Why human:** Requires live Neon psql access and a recent auth cycle; cannot be verified by grep alone.

### 2. audit_log Immutability Check

**Test:** `SET ROLE app_user; UPDATE audit_log SET action='x' WHERE id=(SELECT id FROM audit_log LIMIT 1); RESET ROLE;`
**Expected:** 0 rows updated or RLS policy violation — audit_log UPDATE is denied for app_user.
**Why human:** DB-layer immutability property (AUTH-04); requires live psql session as app_user.

### 3. /settings/assignments Owner UI Round-Trip

**Test:** Sign in as owner. Go to `/settings/assignments`. Assign a practitioner to the owner subject. Confirm assignment appears in the list. Unassign. Confirm removal. Re-assign the same pair — this is the CR-02 regression check.
**Expected:** Assign/unassign/re-assign all succeed. The re-assign after unassign should create a new active assignment (previously this would silently fail and report "Already assigned"). Also attempt to submit the assign form a second time while the assignment is already active and observe whether the response is graceful (alreadyExists) or an error.
**Why human:** Visual/behavioral check on management UI; confirms partial index live behavior; also surfaces the double-assign 500 defect if triggered.

## Gaps Summary

**One gap against plan 07-08 must-have #3 (does NOT block AUTH-03 core requirement):**

**assignSubject 23505 dead-code path (07-REVIEW.md CR-01):** Plan 07-08 replaced substring error matching with `(err as { code?: string }).code === '23505'`. This is structurally dead code on drizzle-orm 0.45.2: `queryWithCache` in `pg-core/session.js` wraps all query errors in `DrizzleQueryError` (which only carries `.cause`, not `.code`). The Postgres `23505` unique_violation lives on `err.cause.code` (the underlying `NeonDbError`). The check `err.code === '23505'` is always false. A double-assign on an already-active (tenant, practitioner, subject) triple rethrows the `DrizzleQueryError` as an unhandled 500 instead of returning the documented `{ assigned: true, alreadyExists: true }`.

**Impact assessment:** The core AUTH-03 access-control requirement (practitioners access only assigned subjects; assignment lifecycle works across assign/revoke/reassign) IS satisfied. The broken idempotency guard only affects the double-assign scenario — a UI-edge case where the owner submits the assign form twice while the same assignment is already active. The access-control consequence is nil (the assignment already exists; no unauthorized access is created or prevented). The UX consequence is an unhandled 500 on what should be a graceful idempotent response.

**Fix:** `const code = (err as { code?: string }).code ?? ((err as { cause?: { code?: string } }).cause?.code); if (code === '23505') { return { assigned: true, alreadyExists: true }; }` — check both layers to stay correct across drizzle versions. Extend the round-trip describe block with a double-assign step to pin the fix.

TEN-02, TEN-03, AUTH-03 (core access control), and AUTH-04 are fully verified. The RLS infrastructure, withTenantDb wrapper, Gate-3 wiring on all 6 practitioner-admitting routes + consent routes, requireSubjectCtx on all 13 PHI loaders, auth audit log with real actor roles, and the partial unique index enabling the full assignment lifecycle are all correctly implemented. Three human verification items remain for AUTH-04 live audit log confirmation and the /settings/assignments UI round-trip.

---

_Verified: 2026-06-12T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: after gap-closure plans 07-07 (Gate-3 document.tsx + consent.tsx + audit role) and 07-08 (partial unique index live on Neon + structured error matching)_
