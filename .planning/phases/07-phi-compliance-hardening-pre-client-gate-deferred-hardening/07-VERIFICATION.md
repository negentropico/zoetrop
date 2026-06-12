---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
verified: 2026-06-12T14:00:00Z
status: gaps_found
score: 3/5
overrides_applied: 0
gaps:
  - truth: "assertSubjectAccess enforces per-assignment access for practitioners (owner retains tenant-wide access) (D-07) — AUTH-03"
    status: failed
    reason: "listAssignedSubjectIds has zero call sites in any route or loader. Every assertSubjectAccess call in every practitioner-admitting route (upload.tsx, review.tsx, reports/generate.tsx, reports/index.tsx, reports/detail.tsx) passes only 3 arguments — the optional 4th assignedSubjectIds parameter is never populated. Gate 3 in assertSubjectAccess is therefore permanently skipped at runtime. An unassigned practitioner can upload PDFs, approve extractions, and generate reports for any subject in the tenant. The assignments service, the assertSubjectAccess extension, and the unit tests are all correctly implemented — the wiring from the route to the assignment lookup is absent."
    artifacts:
      - path: "remix-app/app/lib/assignments.server.ts"
        issue: "listAssignedSubjectIds is defined correctly but has zero call sites outside its own definition and a comment in assignments.server.ts"
      - path: "remix-app/app/routes/_app/ingest/upload.tsx"
        issue: "assertSubjectAccess(user, subject, user.tenantId!) — missing 4th arg; practitioner role admitted at line 65 but assignment never checked"
      - path: "remix-app/app/routes/_app/ingest/review.tsx"
        issue: "Both loader (line 55) and action (line 120) call assertSubjectAccess with 3 args. Line 120 also passes only {tenantId} without subject.id — so even if assignedSubjectIds were added, Gate 3 would deny all practitioners (subject.id undefined check fails)"
      - path: "remix-app/app/routes/_app/reports/generate.tsx"
        issue: "assertSubjectAccess(user, subject, user.tenantId!) — no 4th arg; practitioner admitted at line 42"
    missing:
      - "In each practitioner-admitting route: resolve assignments before the access check: const assignedIds = user.role === 'practitioner' ? await listAssignedSubjectIds(ctx, user.id) : undefined; assertSubjectAccess(user, subject, user.tenantId!, assignedIds)"
      - "In review.tsx action (line 120): pass extraction.subjectId as subject.id — currently {tenantId: extraction.tenantId} is passed which means subject.id is undefined, breaking Gate 3 even after the 4th arg is added"

  - truth: "Client-role users cannot read subject PHI — dashboard/metrics/insights/protocol loaders enforce role gate (AUTH-03 / phase contract 'authz.server.ts:62 client role always 403')"
    status: failed
    reason: "dashboard.tsx, metrics/index.tsx, metrics/category.tsx, metrics/detail.tsx, insights/index.tsx, insights/correlations.tsx, insights/genetics.tsx, protocol/index.tsx, protocol/versions.tsx, protocol/version-detail.tsx, protocol/supplements.tsx, protocol/cessation.tsx, protocol/compare.tsx — all 13 loaders call only requireUser and then build a full TenantCtx for the owner subject. No requireRole, no assertSubjectAccess. A user with a client-role invite can load /dashboard, /metrics, /insights/genetics (genetic PHI), and the full protocol surface. The _app layout loader gates authentication only; React Router 7 child loaders run independently of the layout, so the layout gate does not protect child routes."
    artifacts:
      - path: "remix-app/app/routes/_app/dashboard.tsx"
        issue: "loader (line 98-118) calls only requireUser — no requireRole or assertSubjectAccess"
      - path: "remix-app/app/routes/_app/metrics/index.tsx"
        issue: "loader calls only requireUser + getOwnerSubject + getMetrics(ctx)"
      - path: "remix-app/app/routes/_app/metrics/category.tsx"
        issue: "loader calls only requireUser + getOwnerSubject + getMetrics(ctx, category)"
      - path: "remix-app/app/routes/_app/metrics/detail.tsx"
        issue: "loader calls only requireUser + getOwnerSubject"
      - path: "remix-app/app/routes/_app/insights/index.tsx"
        issue: "loader calls only requireUser"
      - path: "remix-app/app/routes/_app/insights/correlations.tsx"
        issue: "loader calls only requireUser"
      - path: "remix-app/app/routes/_app/insights/genetics.tsx"
        issue: "loader calls only requireUser — genetic PHI (subject_genotypes) readable by client role"
      - path: "remix-app/app/routes/_app/protocol/index.tsx"
        issue: "no role gate in loader"
      - path: "remix-app/app/routes/_app/protocol/versions.tsx"
        issue: "no role gate in loader"
      - path: "remix-app/app/routes/_app/protocol/version-detail.tsx"
        issue: "no role gate in loader"
      - path: "remix-app/app/routes/_app/protocol/supplements.tsx"
        issue: "no role gate in loader"
      - path: "remix-app/app/routes/_app/protocol/cessation.tsx"
        issue: "no role gate in loader"
      - path: "remix-app/app/routes/_app/protocol/compare.tsx"
        issue: "no role gate in loader"
    missing:
      - "Add assertSubjectAccess(user, subject, user.tenantId!) to each of these 13 loaders (assertSubjectAccess already denies client role at Gate 1). Or centralize as requireSubjectCtx(request) helper used by all 13."
human_verification:
  - test: "Sign in as a practitioner with no assignments and attempt to access /ingest/upload"
    expected: "Should receive a 403 Forbidden response if AUTH-03 is enforced"
    why_human: "AUTH-03 per-assignment gate is dead code (CR-01 confirmed by grep) — this will currently succeed, confirming the gap"
  - test: "Sign in as a client-role user and attempt to load /dashboard, /metrics, /insights/genetics"
    expected: "Should receive 403 for each route if role gate is enforced"
    why_human: "CR-02 gap confirmed by grep — these routes have no requireRole or assertSubjectAccess. Confirming in a live browser establishes the real exposure."
  - test: "Owner /settings/assignments assign-then-unassign round-trip"
    expected: "Assign a practitioner to a subject; it appears in the list. Unassign it; it disappears."
    why_human: "The UI renders; the service logic is correct. But CR-03 (non-partial unique index) means re-assigning after a revoke will silently report 'already assigned' while the assignment does not exist. Human confirm assigns and un-assign sequence works; then re-assign and verify it takes effect."
  - test: "Verify sign-in/sign-out auth audit rows land in audit_log via psql query"
    expected: "SELECT action, user_id, tenant_id FROM audit_log WHERE action IN ('sign-in','sign-out') ORDER BY timestamp DESC LIMIT 5 shows recent rows with no PHI values"
    why_human: "This requires live Neon access and a recent sign-in cycle; cannot be verified by grep alone"
  - test: "Attempt UPDATE on audit_log as app_user"
    expected: "SET ROLE app_user; UPDATE audit_log SET action='x' WHERE id=(SELECT id FROM audit_log LIMIT 1) — expect 0 rows updated or policy-denied error"
    why_human: "Immutability is a live DB-layer property; confirms AUTH-04 RLS enforcement"
---

# Phase 7: PHI Compliance Hardening — Verification Report

**Phase Goal:** PHI Compliance Hardening — Pre-Client Gate (deferred hardening): host-portable RLS with NOBYPASSRLS app_user role live on Neon, all tenant/subject-scoped data access through withTenantDb (TEN-02, TEN-03), practitioner-subject assignment enforcement (AUTH-03), auth events in immutable audit_log (AUTH-04).
**Verified:** 2026-06-12T14:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NOBYPASSRLS app_user role live on Neon with host-portable GUC RLS on all 16 PHI tables; cross-tenant isolation tests passing; withTenantDb SET LOCAL wrapper non-leaking (TEN-02, TEN-03) | VERIFIED | `0011_rls_policies.sql` has ENABLE+FORCE RLS + GUC predicates on 16 tables; `0012` grants SET permission; `rls-isolation.test.ts` has 3 skip-guarded blocks (confirmed by grep); orchestrator confirms live tests 3/3 passing |
| 2 | Every tenant/subject-scoped data read in data.server.ts, consent.server.ts, and audit.server.ts runs inside withTenantDb(ctx) (TEN-03) | VERIFIED | `data.server.ts` imports withTenantDb and wraps all 10 entity reads; `consent.server.ts` wraps both checkConsent and insertConsent; `audit.server.ts` has both session-path withTenantDb and admin insertAuditLogAdmin; getOwnerSubject correctly kept on admin path with documented rationale |
| 3 | assertSubjectAccess enforces per-assignment access for practitioners at runtime; listAssignedSubjectIds is called before every assertSubjectAccess in practitioner-admitting routes (AUTH-03) | FAILED | `listAssignedSubjectIds` has zero call sites in any route. All 7 assertSubjectAccess calls in practitioner-admitting routes pass only 3 arguments. Gate 3 in assertSubjectAccess is permanently skipped. The function, service, table, and unit tests are correctly built — the wiring is absent. CR-01 confirmed by grep. |
| 4 | Client-role users cannot access PHI via dashboard/metrics/insights/protocol loaders — every loader enforces a role gate | FAILED | 13 loaders call only requireUser with no requireRole or assertSubjectAccess. Confirmed by grep returning zero matches across dashboard.tsx, metrics/, insights/, and protocol/. The authz.server.ts module comment ("client role — always 403") is not honored by these routes. CR-02 confirmed by grep. |
| 5 | Better-Auth auth events (sign-in, sign-out, sign-up, invite-redeemed) are written to the immutable audit_log via the admin path; audit_log is INSERT+SELECT only for app_user (AUTH-04) | VERIFIED | `auth.server.ts` wires `session.create.after`, `session.delete.after`, and `user.create.after` to call `insertAuthAuditLog` with best-effort try/catch; `insertAuthAuditLog` in `audit.server.ts` uses getDb() admin path and writes `subjectId: null` (migration 0013 made the column nullable); `0011_rls_policies.sql` contains `audit_insert_only` and `audit_immutable_select` policies plus REVOKE UPDATE/DELETE |

**Score:** 3/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `remix-app/app/lib/db.server.ts` | withTenantDb + TenantCtx beside getDb() | VERIFIED | Exports TenantCtx interface, withTenantDb function; SET LOCAL GUC + SET LOCAL ROLE app_user pattern; getDb() preserved; tsc clean |
| `remix-app/db/schema.ts` | practitionerSubjectAssignments table with FKs + unique index | VERIFIED | Table defined with tenant/practitioner/subject/assignedBy FKs, revokedAt soft-delete column, idx_psa_active_unique (plain unique — not partial, per CR-03) |
| `remix-app/tests/db/rls-isolation.test.ts` | 3 skip-guarded describe blocks; skips cleanly with DB_URL_STUBBED | VERIFIED | grep -c describe.skipIf returns 3; DB_URL_STUBBED=1 vitest run exits 0 with 3 skipped |
| `remix-app/migrations/0011_rls_policies.sql` | app_user NOBYPASSRLS + ENABLE/FORCE RLS on 16 PHI tables + audit immutability | VERIFIED | grep -c "ENABLE ROW LEVEL SECURITY" returns 16; NOBYPASSRLS present; current_setting('app.tenant_id') predicates; audit_immutable_select + audit_insert_only policies; REVOKE UPDATE/DELETE on audit_log |
| `remix-app/migrations/0010_practitioner_assignments.sql` | CREATE TABLE practitioner_subject_assignments | VERIFIED | File exists; CREATE TABLE present; idx_psa_active_unique present |
| `remix-app/app/lib/assignments.server.ts` | assign/unassign/list/listAssignedSubjectIds via withTenantDb | VERIFIED | All 4 functions exported; all use withTenantDb; soft-delete on unassignSubject; fail-closed on 0-row UPDATE |
| `remix-app/app/routes/_app/settings/assignments.tsx` | Owner-facing assign/unassign UI with requireRole(["owner"]) in loader and action | VERIFIED | requireRole(user, ["owner"]) called in both loader (line 65) and action (line 111); assignSubject/unassignSubject dispatched from action; route registered at routes.ts line 49 |
| `remix-app/app/lib/authz.server.ts` | assertSubjectAccess with optional assignedSubjectIds; backward-compatible | VERIFIED | 4-arg signature present; Gate 3 logic correct (practitioner + assignedSubjectIds !== undefined → deny unless subject.id in set); owners skip Gate 3; clients denied at Gate 1 |
| `remix-app/app/lib/auth.server.ts` | insertAuthAuditLog wired to session.create/delete and user.create.after hooks | VERIFIED | All three hooks present with best-effort try/catch wrapping; sign-in/sign-out/sign-up/invite-redeemed events dispatched |
| `remix-app/app/lib/audit.server.ts` | insertAuditLog (withTenantDb), insertAuditLogAdmin (admin), insertAuthAuditLog (admin, PHI-free) | VERIFIED | All three functions exported; correct path split documented; insertAuthAuditLog PHI-free (userId/action/tenantId/entityId only) |
| `docs/COMPLIANCE-RUNBOOK.md` | Phase 7 engineering-done / Phase 8 deferred boundary | VERIFIED | Phase 7 Status section present; RLS, app_user, withTenantDb, deferred Phase 8 items all documented |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `db.server.ts` | GUC set_config + SET LOCAL ROLE | `db.transaction` with sql template | VERIFIED | `set_config('app.tenant_id', ...)` + `SET LOCAL ROLE app_user` confirmed in withTenantDb body |
| `data.server.ts` | withTenantDb | `import { withTenantDb }` from ./db.server | VERIFIED | import present; 10 entity reads wrap body in withTenantDb(ctx, async (tx) => {...}) |
| `auth.server.ts` | audit_log via admin path | `databaseHooks.session.create.after` → insertAuthAuditLog | VERIFIED | Hook present; insertAuthAuditLog imported and called |
| `settings/assignments.tsx` | assignments.server.ts | assignSubject/unassignSubject called from action | VERIFIED | Both functions called in action; route registered |
| Routes (practitioner-admitting) | listAssignedSubjectIds → assertSubjectAccess Gate 3 | Should call listAssignedSubjectIds before assertSubjectAccess | NOT_WIRED | Zero call sites for listAssignedSubjectIds in any route. assertSubjectAccess called with 3 args everywhere. CR-01 confirmed. |
| Dashboard/metrics/insights/protocol loaders | assertSubjectAccess or requireRole | Should call either after requireUser | NOT_WIRED | Zero grep matches for assertSubjectAccess or requireRole in these 13 loaders. CR-02 confirmed. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|-------------|--------|-------------------|--------|
| `data.server.ts:getMetrics` | metrics rows | withTenantDb + tx.select from metrics table | Yes — queries Neon via RLS-governed app_user | VERIFIED (FLOWING) |
| `audit.server.ts:insertAuthAuditLog` | audit_log row | getDb() INSERT (admin path, bypassRLS) | Yes — writes to Neon | VERIFIED (FLOWING) |
| `assignments.server.ts:listAssignedSubjectIds` | subjectIds array | withTenantDb + tx.select from practitioner_subject_assignments | Yes — queries correctly | ORPHANED — function flows correctly but is never called from any route |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| assignments.test.ts assertSubjectAccess unit tests (14 cases) | DB_URL_STUBBED=1 npx vitest run tests/lib/assignments.test.ts | 14 passed | PASS |
| rls-isolation.test.ts skips cleanly with no DB | DB_URL_STUBBED=1 npx vitest run tests/db/rls-isolation.test.ts | 3 skipped | PASS |
| Live rls-isolation.test.ts 3/3 (reported by orchestrator) | npm test -- tests/db/rls-isolation.test.ts against live Neon | 3/3 passed (orchestrator-reported) | PASS (human-attested, not re-run here) |

### Probe Execution

No probe scripts found in `scripts/*/tests/probe-*.sh`. Live migration verification attested by orchestrator.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TEN-02 | 07-01, 07-02, 07-03 | Postgres RLS prevents cross-tenant/cross-subject row returns | VERIFIED | 0011 RLS policies with GUC predicates; rls-isolation.test.ts 3/3 live; all entity reads via withTenantDb |
| TEN-03 | 07-01, 07-02, 07-03 | Tenant/subject context set per-request via SET LOCAL inside a transaction, no pool leak | VERIFIED | withTenantDb uses SET LOCAL (true = transaction-scoped); pool non-leak test in rls-isolation.test.ts; 0012 grants SET permission |
| AUTH-03 | 07-01, 07-04 | Practitioner accesses only assigned subjects | FAILED (BLOCKER) | assertSubjectAccess Gate 3 logic is correct and unit-tested. But listAssignedSubjectIds is never called from any route. The per-assignment check is permanently bypassed at runtime for all practitioner users. |
| AUTH-04 | 07-02, 07-04 | Auth + access events in immutable audit log | VERIFIED | sign-in/out/sign-up hooks in auth.server.ts; insertAuthAuditLog (admin, PHI-free); audit_log INSERT+SELECT-only RLS; REVOKE UPDATE/DELETE as defense-in-depth |

**Note:** COMP-02/COMP-03 are mapped to Phase 8 per the requirements document and are correctly deferred. No orphaned requirements found for Phase 7.

**Note on invites/RLS discrepancy:** ROADMAP SC-1 lists `invites` in the RLS table set; Plan 02 and 07-CONTEXT.md D-04 explicitly exclude `invites` as Better-Auth managed (Pitfall 4). The 07-RESEARCH.md RLS map (referenced by SC-1) also marks invites as "may skip RLS." The ROADMAP SC-1 wording is ambiguous rather than contradictory; the D-04 architectural decision is the authoritative ruling. This is a wording gap in SC-1, not a code gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `remix-app/app/lib/audit.server.ts` | 142 | `role: 'owner' as AppRole` hardcoded in insertAuthAuditLog | Warning | Every sign-in/sign-out/sign-up event is recorded as 'owner' regardless of actual role; a practitioner signing in is misrecorded (WR-01 from code review) |
| `remix-app/db/schema.ts` | 288 | `uniqueIndex('idx_psa_active_unique').on(t.tenantId, t.practitionerId, t.subjectId)` | Warning | Not a partial index on `revoked_at IS NULL`. After revoke, re-assigning the same pair hits the unique constraint and is silently reported as success while listAssignments returns nothing (CR-03 from code review). Latent — only becomes a hard denial bug once CR-01 is fixed. |
| `remix-app/app/lib/authz.server.ts` | 80-103 | null/undefined role passes Gates 1 and 3 (only literal "client" is denied) | Warning | A user whose role is null or garbage gets tenant-wide access. Currently latent (roles default to "client"), but contradicts fail-closed claim in module header (WR-04 from code review). |
| `remix-app/migrations/0011_rls_policies.sql` | 113 | `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user` includes non-RLS tables | Warning | app_user has DML on user/session/account/verification/invites/tenants — tables with no RLS. Contradicts COMPLIANCE-RUNBOOK "tenants is admin-only with no app_user access path" (WR-02 from code review). |

No `TBD`, `FIXME`, or `XXX` debt markers found in Phase 7 modified files.

### Human Verification Required

### 1. AUTH-03 Practitioner Blocking (Gap Confirmation)

**Test:** Sign in as a practitioner with no assignments. Navigate to `/ingest/upload`, select a subject, attempt to upload a PDF.
**Expected:** Should receive a 403 Forbidden if AUTH-03 per-assignment enforcement is active. Will currently succeed (gap confirmed by grep).
**Why human:** Confirms live runtime behavior of the CR-01 dead-code gap.

### 2. CR-02 Client PHI Exposure (Gap Confirmation)

**Test:** Sign in as a client-role user. Navigate to `/dashboard` and `/insights/genetics`.
**Expected:** Should receive 403 if role gate is enforced. Will currently succeed (gap confirmed by grep — 13 loaders have no role gate).
**Why human:** Confirms live runtime exposure of the CR-02 missing role gate.

### 3. /settings/assignments Owner UI Round-Trip

**Test:** Sign in as owner. Go to `/settings/assignments`. Assign a practitioner to the owner subject. Confirm assignment appears in the list. Unassign. Confirm removal. Attempt re-assign (verifies CR-03 partial-index gap).
**Expected:** Assign/unassign works. Re-assign should succeed but will currently report "Already assigned." (CR-03).
**Why human:** Visual/behavioral check on the management UI; also surfaces the CR-03 re-assignment bug.

### 4. AUTH-04 Live Audit Log Check

**Test:** Sign out and sign back in as owner. Run: `SELECT action, user_id, tenant_id, timestamp FROM audit_log WHERE action IN ('sign-in','sign-out') ORDER BY timestamp DESC LIMIT 5;`
**Expected:** Recent sign-in and sign-out rows present with no PHI values. Role column will show 'owner' for all (WR-01 gap — hardcoded, not blocking AUTH-04 core function).
**Why human:** Requires live Neon psql access and a recent auth cycle.

### 5. audit_log Immutability Check

**Test:** `SET ROLE app_user; UPDATE audit_log SET action='x' WHERE id=(SELECT id FROM audit_log LIMIT 1); RESET ROLE;`
**Expected:** 0 rows updated or RLS policy violation — audit_log UPDATE is denied for app_user.
**Why human:** DB-layer property requiring live psql session as app_user.

## Gaps Summary

Two blockers prevent the AUTH-03 phase goal from being achieved:

**Blocker 1 — AUTH-03 dead code (CR-01):** The per-assignment practitioner gate in `assertSubjectAccess` is correct and unit-tested, but `listAssignedSubjectIds` is never called from any route. Every `assertSubjectAccess` call in every practitioner-admitting route passes only 3 arguments — the 4th `assignedSubjectIds` parameter is always `undefined`, which causes Gate 3 to be skipped. A practitioner who has never been assigned to any subject can upload lab PDFs, approve extractions, commit metrics, and generate reports. The `practitioner_subject_assignments` table and `/settings/assignments` UI manage data that has zero enforcement effect at runtime.

Fix: In each practitioner-admitting route, resolve `const assignedIds = user.role === "practitioner" ? await listAssignedSubjectIds(ctx, user.id) : undefined;` and pass it as the 4th argument to `assertSubjectAccess`. Additionally fix `review.tsx` action line 120 to pass `{ tenantId: extraction.tenantId, id: extraction.subjectId }` instead of just `{ tenantId: extraction.tenantId }` so Gate 3 has a subject id to check.

**Blocker 2 — CR-02 missing role gate on 13 PHI loaders:** dashboard.tsx and all metrics/insights/protocol loaders call only `requireUser` — no `requireRole` or `assertSubjectAccess`. A client-role user can read every PHI surface including genetic data, cessation logs, supplement plans, and blood work metrics. The `authz.server.ts` module's own contract ("client role → always 403") is not honored by these routes.

Fix: Add `assertSubjectAccess(user, subject, user.tenantId!)` to each of these 13 loaders (it already denies the client role at Gate 1), or centralize as a `requireSubjectCtx(request)` helper.

These two gaps mean AUTH-03 (practitioner scoping) and the stated phase contract (client role never accesses subject data directly) are not achieved at runtime. All TEN-02/TEN-03 and AUTH-04 truths are verified. The RLS infrastructure, withTenantDb wrapper, assignment service, and audit log are all correctly implemented.

---

_Verified: 2026-06-12T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
