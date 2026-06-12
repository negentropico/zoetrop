---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
verified: 2026-06-12T20:42:11Z
status: gaps_found
score: 4/5
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Client-role users cannot read subject PHI — all 13 PHI loaders now use requireSubjectCtx (CR-02 closed by plan 07-06)"
    - "assertSubjectAccess Gate 3 now enforces per-assignment access in 5 practitioner-admitting routes (CR-01 partially closed by plan 07-05)"
  gaps_remaining:
    - "document.tsx PDF byte-streaming loader (GET /ingest/documents/:id) still skips Gate 3 — no listAssignedSubjectIds call and no subject.id passed; an unassigned practitioner can fetch raw lab PDFs"
    - "idx_psa_active_unique is a full unique index (not partial on revoked_at IS NULL) — revoke-then-reassign is permanently broken, silently returning 'Already assigned'"
  regressions: []
gaps:
  - truth: "assertSubjectAccess enforces per-assignment access for practitioners at runtime on ALL practitioner-admitting routes (AUTH-03 ROADMAP SC-4)"
    status: partial
    reason: "5 of 6 practitioner-admitting routes now resolve listAssignedSubjectIds and pass it as the 4th arg to assertSubjectAccess. The PDF byte-streaming route document.tsx (GET /ingest/documents/:id) — the highest PHI-density artifact — still calls assertSubjectAccess with only 3 arguments and no subject.id. An unassigned practitioner in the tenant can directly fetch the full raw lab PDF for any subject by crafting a GET request. This defeats the Gate 3 protection added to review.tsx: the review loader is gated, but the PDF URL it renders (PdfPageViewer pdfUrl=/ingest/documents/...) is directly accessible. This was flagged as new CR-01 in the post-closure code review (07-REVIEW.md)."
    artifacts:
      - path: "remix-app/app/routes/_app/ingest/document.tsx"
        issue: "Line 46: assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!) — no 4th arg (assignedSubjectIds never resolved), no subject.id in the object. Gate 3 is permanently skipped for practitioners."
    missing:
      - "Add: const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: doc.subjectId };"
      - "Add: const assignedIds = user.role === 'practitioner' ? await listAssignedSubjectIds(ctx, user.id) : undefined;"
      - "Change: assertSubjectAccess(user, { tenantId: doc.tenantId, id: doc.subjectId }, user.tenantId!, assignedIds);"

  - truth: "practitioner_subject_assignments unique index allows revoke-then-reassign (the assignment lifecycle is not one-shot) (AUTH-03 ROADMAP SC-4 implied — assignment management UI is useless if revoke is permanent)"
    status: failed
    reason: "idx_psa_active_unique in both schema.ts and migration 0010 is a full unique index (no WHERE revoked_at IS NULL predicate). After a revocation, the revoked row still occupies the unique key. A subsequent assignSubject for the same (tenant, practitioner, subject) triple hits the unique constraint; the catch block matches 'unique'/'duplicate'/'23505' and returns { assigned: true, alreadyExists: true }, which the UI displays as 'Already assigned.' But listAssignedSubjectIds filters revokedAt IS NULL and returns nothing — the practitioner has no actual access and cannot be re-granted it. The owner-facing /settings/assignments UI is permanently broken after a single revoke for any given (practitioner, subject) pair. No later migration (0012, 0013) fixes this."
    artifacts:
      - path: "remix-app/db/schema.ts"
        issue: "Line 288: uniqueIndex('idx_psa_active_unique').on(t.tenantId, t.practitionerId, t.subjectId) — not a partial index; no .where(sql`revoked_at IS NULL`)"
      - path: "remix-app/migrations/0010_practitioner_assignments.sql"
        issue: "Line 19: CREATE UNIQUE INDEX idx_psa_active_unique ... USING btree (tenant_id, practitioner_id, subject_id) — no WHERE clause"
      - path: "remix-app/app/lib/assignments.server.ts"
        issue: "Lines 63-66: catch block matches 'unique'/'duplicate'/'23505' and returns alreadyExists:true — masks the revoked-row collision as idempotent success"
    missing:
      - "In schema.ts line 288: replace uniqueIndex('idx_psa_active_unique').on(t.tenantId, t.practitionerId, t.subjectId) with uniqueIndex('idx_psa_active_unique').on(t.tenantId, t.practitionerId, t.subjectId).where(sql`revoked_at IS NULL`)"
      - "Generate and apply a new migration to drop the full index and create the partial index on the live Neon project"
      - "OR alternatively: modify assignSubject to un-revoke an existing revoked row (SET revoked_at = NULL) on conflict instead of treating it as a duplicate"
      - "In assignments.server.ts: replace substring-based error matching with structured code check: (err as { code?: string }).code === '23505'"
      - "Add an assign→unassign→assign round-trip test to assignments.test.ts to catch this regression"

human_verification:
  - test: "Sign out and sign back in as owner. Run: SELECT action, user_id, tenant_id, timestamp FROM audit_log WHERE action IN ('sign-in','sign-out') ORDER BY timestamp DESC LIMIT 5;"
    expected: "Recent sign-in and sign-out rows present with no PHI values. Note: role column will show 'owner' for all rows (WR-04 from code review — hardcoded, does not block AUTH-04 core function)."
    why_human: "Requires live Neon psql access and a recent auth cycle; cannot be verified by grep alone"
  - test: "Attempt UPDATE on audit_log as app_user: SET ROLE app_user; UPDATE audit_log SET action='x' WHERE id=(SELECT id FROM audit_log LIMIT 1); RESET ROLE;"
    expected: "0 rows updated or RLS policy violation — audit_log UPDATE is denied for app_user"
    why_human: "DB-layer immutability property (AUTH-04); requires live psql session"
  - test: "Owner UI round-trip: /settings/assignments — assign a practitioner to a subject, confirm it appears in the list, unassign it, confirm removal."
    expected: "Assign/unassign round-trip visible in the UI. NOTE: re-assigning after unassign will currently report 'Already assigned' while granting no access (CR-02 / partial index gap)."
    why_human: "Visual/behavioral check on the management UI; also surfaces the partial-index re-assignment bug"
---

# Phase 7: PHI Compliance Hardening — Verification Report (Re-verification)

**Phase Goal:** PHI Compliance Hardening — RLS + Isolation Engineering (pre-client gate, part 1). On the existing Neon project: atomic host-portable RLS enable+policies (GUC-based), `withTenantDb` SET LOCAL wrapper + pool-leak test, cross-tenant isolation tests in CI, practitioner→subject assignments (AUTH-03), immutable auth/access audit log (AUTH-04).
**Verified:** 2026-06-12T20:42:11Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plans 07-05 and 07-06

## Re-verification Summary

Previous verification (2026-06-12T14:00:00Z) returned `gaps_found` with 2 blockers:
- CR-01: `listAssignedSubjectIds` had zero call sites — Gate 3 permanently skipped at runtime
- CR-02: 13 PHI read loaders had no role gate — client-role users could read all PHI

Gap-closure plans 07-05 and 07-06 executed. Full vitest suite now shows 288 passed / 79 skipped. Production build is clean. The prior 2 blockers are **partially** resolved: CR-02 is fully closed; CR-01 is partially closed. The post-closure code review (07-REVIEW.md) identified 2 new critical findings outside the gap plans' declared scope. Both are evaluated here.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NOBYPASSRLS app_user role live on Neon with host-portable GUC RLS on all 16 PHI tables; cross-tenant isolation tests passing; withTenantDb SET LOCAL wrapper non-leaking (TEN-02, TEN-03) | VERIFIED | `0011_rls_policies.sql` — ENABLE ROW LEVEL SECURITY count = 16 (grep confirmed); NOBYPASSRLS present; current_setting('app.tenant_id', true) predicates; `rls-isolation.test.ts` has 3 skip-guarded describe.skipIf blocks (confirmed); DB_URL_STUBBED=1 vitest run exits 0 with 3 skipped |
| 2 | Every tenant/subject-scoped data read in data.server.ts, consent.server.ts, and audit.server.ts runs inside withTenantDb(ctx) (TEN-03) | VERIFIED | `data.server.ts` imports withTenantDb and wraps all 10 entity reads; `consent.server.ts` wraps both checkConsent and insertConsent; `audit.server.ts` exports withTenantDb session-path insertAuditLog + admin insertAuditLogAdmin + admin insertAuthAuditLog; getOwnerSubject on admin path with documented rationale |
| 3 | Client-role users cannot read subject PHI — all 13 dashboard/metrics/insights/protocol loaders enforce a role gate via requireSubjectCtx | VERIFIED | `requireSubjectCtx` exported from authz.server.ts (line 127, confirmed); grep -rc "requireSubjectCtx(request)" returns 1 for all 13 target loaders (dashboard, metrics×3, insights×3, protocol×6); requireSubjectCtx calls assertSubjectAccess which denies client role at Gate 1; `require-subject-ctx.test.ts` 5/5 passing; genetics.tsx genetic PHI confirmed gated |
| 4 | assertSubjectAccess enforces per-assignment access for practitioners on ALL practitioner-admitting routes (AUTH-03 SC-4) | FAILED (BLOCKER) | 5 routes correctly wired (upload, review loader+action, generate, index, detail — confirmed by grep). `document.tsx` (GET /ingest/documents/:id — raw lab PDF stream) was NOT wired in plan 07-05 and remains 3-arg only (line 46: `assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!)` — no 4th arg, no subject.id). An unassigned practitioner can fetch raw PHI PDFs directly. New CR-01 from 07-REVIEW.md. |
| 5 | Better-Auth auth events (sign-in, sign-out, sign-up, invite-redeemed) are written to the immutable audit_log; audit_log is INSERT+SELECT only for app_user (AUTH-04) | VERIFIED | `auth.server.ts` wires session.create.after, session.delete.after, user.create.after to call insertAuthAuditLog with best-effort try/catch; `insertAuthAuditLog` in audit.server.ts uses getDb() admin path; `0011_rls_policies.sql` has audit_immutable_select + audit_insert_only policies + REVOKE UPDATE/DELETE; 0013 migration made subjectId nullable for auth rows |

**Score:** 4/5 truths verified

### Assignment Lifecycle Defect (Second Gap)

The `practitioner_subject_assignments` unique index is a full index (not partial on `revoked_at IS NULL`), making the assignment lifecycle one-shot: revoke-then-reassign is permanently broken and silently reports success. This is not captured as a separate numbered "truth" above because it was not in the original must-haves, but it is a BLOCKER against AUTH-03 SC-4 (which requires a functional "owner-facing assign/unassign UI") and is documented as a gap per the code review.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `remix-app/app/lib/db.server.ts` | withTenantDb + TenantCtx beside getDb() | VERIFIED | Exports TenantCtx interface, withTenantDb with SET LOCAL GUCs + SET LOCAL ROLE app_user; getDb() preserved; tsc clean |
| `remix-app/db/schema.ts` | practitionerSubjectAssignments table with FKs + partial unique index | PARTIAL | Table defined with all FKs and revokedAt; BUT uniqueIndex at line 288 is not partial (no WHERE revoked_at IS NULL); migration 0010 reflects the same defect |
| `remix-app/tests/db/rls-isolation.test.ts` | 3 skip-guarded describe blocks; skips cleanly with DB_URL_STUBBED | VERIFIED | grep -c describe.skipIf returns 3; DB_URL_STUBBED=1 exits 0 with 3 skipped |
| `remix-app/migrations/0011_rls_policies.sql` | app_user NOBYPASSRLS + ENABLE/FORCE RLS on 16 PHI tables + audit immutability | VERIFIED | 16 ENABLE ROW LEVEL SECURITY statements; NOBYPASSRLS; current_setting predicates; audit_immutable_select + audit_insert_only policies; REVOKE UPDATE/DELETE on audit_log |
| `remix-app/migrations/0010_practitioner_assignments.sql` | CREATE TABLE practitioner_subject_assignments | VERIFIED | File exists; CREATE TABLE present; idx_psa_active_unique present (but full, not partial — covered in gap above) |
| `remix-app/app/lib/assignments.server.ts` | assign/unassign/list/listAssignedSubjectIds via withTenantDb | VERIFIED | All 4 functions exported; all use withTenantDb; soft-delete on unassignSubject; fail-closed on 0-row UPDATE |
| `remix-app/app/routes/_app/settings/assignments.tsx` | Owner-facing assign/unassign UI with requireRole(["owner"]) in loader and action | VERIFIED | requireRole(user, ["owner"]) in both loader and action; assignSubject/unassignSubject dispatched from action; route registered |
| `remix-app/app/lib/authz.server.ts` | assertSubjectAccess (4-arg, backward-compat) + requireSubjectCtx helper | VERIFIED | 4-arg signature at line 78; requireSubjectCtx exported at line 127; Gate 3 logic correct; backward-compatible |
| `remix-app/app/lib/auth.server.ts` | insertAuthAuditLog wired to session.create/delete and user.create.after hooks | VERIFIED | All three hooks present with best-effort try/catch; sign-in/sign-out/sign-up/invite-redeemed events dispatched |
| `remix-app/app/lib/audit.server.ts` | insertAuditLog (withTenantDb), insertAuditLogAdmin (admin), insertAuthAuditLog (admin, PHI-free) | VERIFIED | All three functions exported; correct path split; insertAuthAuditLog PHI-free |
| `remix-app/tests/lib/per-assignment-wiring.test.ts` | 6+ unit tests proving unassigned practitioner 403, owner pass, assigned pass, missing id 403 | VERIFIED | File exists; 9 passing tests (DB_URL_STUBBED=1 vitest run exits 0) |
| `remix-app/tests/lib/require-subject-ctx.test.ts` | 5 unit tests proving client 403, owner pass, requireSubjectCtx exported | VERIFIED | File exists; 5 passing tests (DB_URL_STUBBED=1 vitest run exits 0) |
| `docs/COMPLIANCE-RUNBOOK.md` | Phase 7 engineering-done / Phase 8 deferred boundary | VERIFIED | Phase 7 Status section present with RLS, app_user, withTenantDb, Phase 8 deferrals documented |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `db.server.ts` | GUC set_config + SET LOCAL ROLE | db.transaction with sql template | VERIFIED | set_config('app.tenant_id', ...) + SET LOCAL ROLE app_user in withTenantDb body |
| `data.server.ts` | withTenantDb | import { withTenantDb } from ./db.server | VERIFIED | Import present; 10 entity reads wrapped |
| `auth.server.ts` | audit_log via admin path | databaseHooks.session.create.after → insertAuthAuditLog | VERIFIED | Hook present; insertAuthAuditLog called |
| `settings/assignments.tsx` | assignments.server.ts | assignSubject/unassignSubject from action | VERIFIED | Both called in action; route registered |
| 5 practitioner-admitting routes | listAssignedSubjectIds → assertSubjectAccess Gate 3 | listAssignedSubjectIds(ctx, user.id) before assertSubjectAccess | VERIFIED | upload.tsx:73, review.tsx:59/88/142, generate.tsx:53, index.tsx:38, detail.tsx:67 — all confirmed by grep |
| `document.tsx` (GET /ingest/documents/:id) | listAssignedSubjectIds → Gate 3 | Should call before streaming PDF bytes | NOT_WIRED | Line 46 passes only 3 args; no listAssignedSubjectIds import; no subject.id on the subject object |
| 13 PHI read loaders | requireSubjectCtx | requireSubjectCtx(request) in every loader | VERIFIED | grep -rc returns 1 for all 13 files (dashboard, metrics×3, insights×3, protocol×6) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|-------------|--------|-------------------|--------|
| `data.server.ts:getMetrics` | metrics rows | withTenantDb + tx.select | Yes — Neon via RLS-governed app_user | VERIFIED (FLOWING) |
| `assignments.server.ts:listAssignedSubjectIds` | subjectIds[] | withTenantDb + tx.select from practitioner_subject_assignments | Yes — but assignment lifecycle broken (partial index gap) | PARTIAL — data flows correctly; assignSubject can produce unrecoverable revoked rows after un-assign |
| `audit.server.ts:insertAuthAuditLog` | audit_log row | getDb() INSERT (admin path) | Yes — writes to Neon | VERIFIED (FLOWING) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| per-assignment-wiring.test.ts (9 tests) | DB_URL_STUBBED=1 npx vitest run tests/lib/per-assignment-wiring.test.ts | 9 passed / 0 failed | PASS |
| require-subject-ctx.test.ts (5 tests) | DB_URL_STUBBED=1 npx vitest run tests/lib/require-subject-ctx.test.ts | 5 passed / 0 failed | PASS |
| Full vitest suite | DB_URL_STUBBED=1 npx vitest run | 288 passed / 79 skipped (36 files) | PASS |
| Production build | npm run build | exit 0 — client + server bundles clean, no .server leak | PASS |
| TypeScript typecheck | npx react-router typegen && npx tsc --noEmit | exit 0 | PASS |
| rls-isolation.test.ts skip-guard | DB_URL_STUBBED=1 npx vitest run tests/db/rls-isolation.test.ts | 3 skipped (skip-guards work) | PASS |

### Probe Execution

No probe scripts found in `scripts/*/tests/probe-*.sh`. Live migration verification attested by orchestrator (Plan 02 blocking human checkpoint).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TEN-02 | 07-01, 07-02, 07-03 | Postgres RLS prevents cross-tenant/cross-subject row returns | VERIFIED | 0011 RLS policies with GUC predicates on 16 PHI tables; rls-isolation.test.ts 3 skip-guarded blocks; all entity reads via withTenantDb |
| TEN-03 | 07-01, 07-02, 07-03 | Tenant/subject context set per-request via SET LOCAL inside a transaction, no pool leak | VERIFIED | withTenantDb issues SET LOCAL (transaction-scoped GUCs); pool non-leak test in rls-isolation.test.ts; 0012 migration grants SET permission |
| AUTH-03 | 07-01, 07-04, 07-05, 07-06 | Practitioner accesses only assigned subjects | FAILED (BLOCKER) | Gate 3 is wired in 5/6 practitioner-admitting routes. document.tsx (the PDF byte-streaming endpoint — highest PHI density) is not wired: assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!) at line 46, no 4th arg, no subject.id. Additionally, revoke-then-reassign is permanently broken (partial index missing), making the assignment management UI non-functional after a single revoke cycle. |
| AUTH-04 | 07-02, 07-04 | Auth + access events in immutable audit log | VERIFIED | sign-in/out/sign-up hooks in auth.server.ts; insertAuthAuditLog (admin, PHI-free); audit_log INSERT+SELECT-only RLS; REVOKE UPDATE/DELETE defense-in-depth |

**Note:** COMP-02/COMP-03 are mapped to Phase 8 per REQUIREMENTS.md and are correctly deferred. No orphaned Phase 7 requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `remix-app/app/routes/_app/ingest/document.tsx` | 46 | `assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!)` — 3-arg, no subject.id | BLOCKER | Unassigned practitioner can stream raw lab PDF bytes; Gate 3 is permanently skipped for this route |
| `remix-app/db/schema.ts` | 288 | `uniqueIndex('idx_psa_active_unique').on(...)` — full index, not partial on `revoked_at IS NULL` | BLOCKER | Revoke-then-reassign is permanently broken; assignSubject returns false success; active assignment impossible after first revoke |
| `remix-app/migrations/0010_practitioner_assignments.sql` | 19 | `CREATE UNIQUE INDEX idx_psa_active_unique ... USING btree (tenant_id, practitioner_id, subject_id)` — no WHERE clause | BLOCKER | Same defect reflected in the live DB; requires a new migration to drop+recreate as partial index |
| `remix-app/app/lib/assignments.server.ts` | 63-66 | Error matching via `msg.includes("unique") \|\| msg.includes("duplicate") \|\| msg.includes("23505")` | Warning | Fragile string matching; also the mechanism that converts the partial-index collision into false success |
| `remix-app/app/lib/audit.server.ts` | 142 | `role: 'owner' as AppRole` hardcoded in insertAuthAuditLog | Warning | Every sign-in/out/sign-up audit row claims role='owner' regardless of actual actor; practitioner/client sign-in rows are falsified in the immutable log |
| `remix-app/app/routes/_app/ingest/consent.tsx` | 34, 55 | `assertSubjectAccess(user, subject, user.tenantId!)` — 3-arg in both loader and action | Warning | An unassigned practitioner can record consent for a subject they are not authorized for; consent is a legal record |

No `TBD`, `FIXME`, or `XXX` debt markers found in Phase 7 modified files.

### Human Verification Required

### 1. AUTH-04 Live Audit Log Check

**Test:** Sign out and sign back in as owner. Run: `SELECT action, user_id, tenant_id, timestamp FROM audit_log WHERE action IN ('sign-in','sign-out') ORDER BY timestamp DESC LIMIT 5;`
**Expected:** Recent sign-in and sign-out rows present with no PHI values. Note: role column will show 'owner' for all rows (WR-04 audit entry — role is hardcoded, does not block AUTH-04 core function but produces falsified rows for non-owner actors).
**Why human:** Requires live Neon psql access and a recent auth cycle; cannot be verified by grep alone.

### 2. audit_log Immutability Check

**Test:** `SET ROLE app_user; UPDATE audit_log SET action='x' WHERE id=(SELECT id FROM audit_log LIMIT 1); RESET ROLE;`
**Expected:** 0 rows updated or RLS policy violation — audit_log UPDATE is denied for app_user.
**Why human:** DB-layer immutability property (AUTH-04); requires live psql session as app_user.

### 3. /settings/assignments Owner UI Round-Trip

**Test:** Sign in as owner. Go to `/settings/assignments`. Assign a practitioner to the owner subject. Confirm assignment appears in the list. Unassign. Confirm removal. Attempt re-assign.
**Expected:** Assign/unassign works. Re-assign should succeed but will currently report "Already assigned" while the practitioner gets no access (partial index gap — active gap, see gaps above).
**Why human:** Visual/behavioral check on the management UI; also surfaces the partial-index re-assignment bug in a live context.

## Gaps Summary

**One blocker remains against AUTH-03 (ROADMAP SC-4):**

**Blocker 1 — document.tsx PDF stream missing Gate 3 (new CR-01 from post-closure code review):** The gap-closure plan 07-05 wired `listAssignedSubjectIds` into 5 practitioner-admitting routes but did not include `document.tsx` (GET /ingest/documents/:id), which streams raw PDF bytes. Line 46 calls `assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!)` with no 4th argument and no `id` on the subject object. An unassigned practitioner in the tenant can directly fetch raw lab PDFs by crafting a GET request to this endpoint. This is the highest PHI-density artifact in the system. The `review.tsx` loader is Gate-3-protected, but the PDF URL it renders is freely accessible to any authenticated tenant member.

Fix: In document.tsx — add `import { listAssignedSubjectIds } from "~/lib/assignments.server";`, construct `ctx` from `{ userId: user.id, tenantId: user.tenantId!, subjectId: doc.subjectId }`, resolve `const assignedIds = user.role === "practitioner" ? await listAssignedSubjectIds(ctx, user.id) : undefined;`, and pass `{ tenantId: doc.tenantId, id: doc.subjectId }` as the subject object plus `assignedIds` as the 4th arg.

**Blocker 2 — partial index missing (new CR-02 from post-closure code review):** `idx_psa_active_unique` in both `schema.ts` (line 288) and `migrations/0010_practitioner_assignments.sql` (line 19) is a full unique index with no `WHERE revoked_at IS NULL` predicate. After any revocation, the revoked row permanently occupies the unique key. Re-assigning the same (tenant, practitioner, subject) triple produces a unique constraint violation; the `assignSubject` catch returns `{ assigned: true, alreadyExists: true }` — false success. `listAssignedSubjectIds` filters `revokedAt IS NULL` and returns nothing, so the practitioner has no access and cannot ever be re-granted it. The `/settings/assignments` owner UI is one-shot per (practitioner, subject) pair. This is a correctness defect in Phase 7's core AUTH-03 access management feature.

Fix: Replace the full index with a partial index: `uniqueIndex('idx_psa_active_unique').on(t.tenantId, t.practitionerId, t.subjectId).where(sql\`revoked_at IS NULL\`)` in schema.ts; generate and apply a new migration to drop and recreate the index. Add an assign→unassign→assign round-trip test to `assignments.test.ts`.

These two gaps mean AUTH-03 is not fully achieved at runtime: (a) raw PHI PDFs are accessible to unassigned practitioners, and (b) the assignment management lifecycle is irrecoverably broken after one revoke cycle.

TEN-02, TEN-03, and AUTH-04 are fully verified. The RLS infrastructure, withTenantDb wrapper, requireSubjectCtx helper, 5-route per-assignment wiring, and auth audit log are all correctly implemented.

---

_Verified: 2026-06-12T20:42:11Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: after gap-closure plans 07-05 (CR-01 partial) and 07-06 (CR-02 closed)_
