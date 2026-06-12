---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 45
files_reviewed_list:
  - docs/COMPLIANCE-RUNBOOK.md
  - remix-app/app/lib/assignments.server.ts
  - remix-app/app/lib/audit.server.ts
  - remix-app/app/lib/auth.server.ts
  - remix-app/app/lib/authz.server.ts
  - remix-app/app/lib/consent.server.ts
  - remix-app/app/lib/data.server.ts
  - remix-app/app/lib/db.server.ts
  - remix-app/app/lib/ingest/ingest.server.ts
  - remix-app/app/routes.ts
  - remix-app/app/routes/_app/dashboard.tsx
  - remix-app/app/routes/_app/ingest/consent.tsx
  - remix-app/app/routes/_app/ingest/review.tsx
  - remix-app/app/routes/_app/ingest/upload.tsx
  - remix-app/app/routes/_app/insights/correlations.tsx
  - remix-app/app/routes/_app/insights/genetics.tsx
  - remix-app/app/routes/_app/insights/index.tsx
  - remix-app/app/routes/_app/metrics/category.tsx
  - remix-app/app/routes/_app/metrics/detail.tsx
  - remix-app/app/routes/_app/metrics/index.tsx
  - remix-app/app/routes/_app/protocol/cessation.tsx
  - remix-app/app/routes/_app/protocol/compare.tsx
  - remix-app/app/routes/_app/protocol/index.tsx
  - remix-app/app/routes/_app/protocol/supplements.tsx
  - remix-app/app/routes/_app/protocol/version-detail.tsx
  - remix-app/app/routes/_app/protocol/versions.tsx
  - remix-app/app/routes/_app/reports/detail.tsx
  - remix-app/app/routes/_app/reports/generate.tsx
  - remix-app/app/routes/_app/reports/index.tsx
  - remix-app/app/routes/_app/settings/assignments.tsx
  - remix-app/app/routes/_app/settings/index.tsx
  - remix-app/db/schema.ts
  - remix-app/migrations/0010_practitioner_assignments.sql
  - remix-app/migrations/0011_rls_policies.sql
  - remix-app/migrations/0012_app_user_set_grant.sql
  - remix-app/migrations/0013_audit_log_nullable_subject.sql
  - remix-app/tests/db/auth-audit.test.ts
  - remix-app/tests/db/rls-isolation.test.ts
  - remix-app/tests/lib/assignments.test.ts
  - remix-app/tests/lib/consent.test.ts
  - remix-app/tests/lib/data.server.test.ts
  - remix-app/tests/lib/ingest/approve-action.test.ts
  - remix-app/tests/lib/per-assignment-wiring.test.ts
  - remix-app/tests/lib/report-generator.test.ts
  - remix-app/tests/lib/require-subject-ctx.test.ts
findings:
  critical: 2
  warning: 8
  info: 6
  total: 16
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 45 (plus `app/routes/_app/ingest/document.tsx`, read out-of-list to verify CR-01 fix completeness)
**Status:** issues_found

## Summary

This re-review verifies the two gap-closure plans (07-05 AUTH-03 wiring, 07-06 `requireSubjectCtx`) and re-reviews the full phase scope.

**Prior-blocker verification:**

- **Old CR-02 (client-role PHI loaders) — FIXED.** All 13 PHI read loaders (dashboard, metrics ×3, insights ×3, protocol ×6) now call `requireSubjectCtx`, which runs `assertSubjectAccess` Gate 1 (client → 403) and Gate 2 (cross-tenant → 403). Verified by grep across the route tree and by reading each loader. `tests/lib/require-subject-ctx.test.ts` pins the gate behavior.
- **Old CR-01 (Gate 3 dead code) — PARTIALLY FIXED.** `listAssignedSubjectIds` is now wired through `ingest/upload.tsx`, `ingest/review.tsx` (loader + action), `reports/generate.tsx`, `reports/index.tsx`, and `reports/detail.tsx` as planned. **However, `ingest/documents/:id` (`document.tsx`) — the raw PHI PDF byte-stream — was missed** (new CR-01 below). The review surface is Gate-3-protected, but the PDF endpoint it embeds is not, so the protection is trivially bypassable for the highest-density PHI artifact in the system.

**New blocking findings:** the missed PDF route (CR-01) and a schema defect in `practitioner_subject_assignments` — the "active unique" index is a full unique index, not a partial one, so revoke-then-reassign is permanently broken while reporting success (CR-02). The RLS migration set (0011–0013), `withTenantDb`, the break-glass hardening in `auth.server.ts`, and the isolation tests are otherwise solid work.

## Critical Issues

### CR-01: `ingest/documents/:id` PDF stream skips Gate 3 — unassigned practitioner can read raw lab PDFs (CR-01 fix route missed)

**File:** `remix-app/app/routes/_app/ingest/document.tsx:46`
**Issue:** The CR-01 gap-closure (plan 07-05) wired `assignedSubjectIds` through upload, review, and all three reports routes — but not through the PDF byte-streaming loader. Line 46 reads:

```ts
assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!);
```

Two defects compound: (a) no `assignedSubjectIds` is passed, so Gate 3 is skipped entirely for practitioners; (b) no `id` is passed on the subject object, so even if assigned IDs were supplied, Gate 3 could not evaluate. Result: any practitioner in the tenant — including one with **zero assignments** — can fetch `GET /ingest/documents/:id` and stream the complete raw lab PDF (the most PHI-dense artifact in the system). This defeats the Gate 3 protection on `review.tsx`: the review loader is gated, but the PDF URL it renders (`PdfPageViewer pdfUrl={/ingest/documents/...}`) is directly fetchable. The same enforcement asymmetry the prior review flagged as CR-01 persists on this route.
**Fix:**
```ts
const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: doc.subjectId };
const assignedIds =
  user.role === "practitioner"
    ? await listAssignedSubjectIds(ctx, user.id)
    : undefined;
assertSubjectAccess(user, { tenantId: doc.tenantId, id: doc.subjectId }, user.tenantId!, assignedIds);
```
`per-assignment-wiring.test.ts` Test 5 already proves the no-`id` shape fails closed under Gate 3 — extend the wiring to this route and add it to the route inventory the test documents.

### CR-02: `idx_psa_active_unique` is a full unique index — revoke-then-reassign is permanently broken and silently reports success

**File:** `remix-app/migrations/0010_practitioner_assignments.sql:19`, `remix-app/db/schema.ts:288`, `remix-app/app/lib/assignments.server.ts:61-69`
**Issue:** `assignments.server.ts` documents a soft-delete model ("unique active index … unique on tenant_id + practitioner_id + subject_id" with `revokedAt` marking revocation), but the migration creates an **unconditional** unique index:

```sql
CREATE UNIQUE INDEX "idx_psa_active_unique" ON "practitioner_subject_assignments"
  USING btree ("tenant_id","practitioner_id","subject_id");
```

There is no `WHERE revoked_at IS NULL` predicate. Trace the lifecycle:
1. Owner assigns practitioner P to subject S → row inserted, active.
2. Owner unassigns → `revokedAt` set (row retained — soft delete).
3. Owner re-assigns P to S → INSERT violates the unique index (the revoked row still occupies the key) → `assignSubject`'s catch matches `"duplicate"` in the error message → returns `{ assigned: true, alreadyExists: true }` → the UI shows **"Already assigned."** (success).

But `listAssignedSubjectIds` filters `revokedAt IS NULL`, so the practitioner has **no access** — and never can again for that (tenant, practitioner, subject) triple. AUTH-03 access management is one-shot: every revocation is irreversible, and the failure is masked as success. This is an incorrect-behavior + false-success defect in the phase's core access-control feature.
**Fix:** Replace with a partial unique index and regenerate the migration:
```sql
DROP INDEX "idx_psa_active_unique";
CREATE UNIQUE INDEX "idx_psa_active_unique" ON "practitioner_subject_assignments"
  ("tenant_id","practitioner_id","subject_id") WHERE "revoked_at" IS NULL;
```
(Drizzle: `uniqueIndex(...).on(...).where(sql\`revoked_at IS NULL\`)`.) Alternatively, have `assignSubject` un-revoke the existing row (`SET revoked_at = NULL`) on conflict. Add an assign→unassign→assign round-trip test to `assignments.test.ts` — the current suite (pure unit, no DB) cannot catch this.

## Warnings

### WR-01: Open redirect via unvalidated `next` parameter in consent route

**File:** `remix-app/app/routes/_app/ingest/consent.tsx:41-42, 59, 76`
**Issue:** Both loader and action pass a user-controlled `next` value (query string / hidden form field) directly to `redirect(next)`. `?next=https://evil.example/phish` redirects an authenticated user off-site immediately after they grant PHI-processing consent — a classic open-redirect phishing primitive on a compliance-sensitive flow.
**Fix:** Validate before redirecting: `const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/ingest/upload";`

### WR-02: Consent loader/action skip Gate 3 — unassigned practitioner can record consent for the subject

**File:** `remix-app/app/routes/_app/ingest/consent.tsx:34, 55`
**Issue:** `assertSubjectAccess(user, subject, user.tenantId!)` is called without `assignedSubjectIds` in both loader and action. A practitioner with no active assignment can submit the form and create a `consent_log` row (`v1-pilot-self`, `consentedByUserId` = the practitioner) for a subject they are not authorized for — and thereby unlock the upload consent gate for that subject. Consent is a legal record; who may create it should be at least as restricted as who may upload.
**Fix:** Wire the same `listAssignedSubjectIds` conditional used in `upload.tsx:71-75` into both the loader and action.

### WR-03: Approve action commits unvalidated edited values — `NaN` and arbitrary units can land in clinical `metrics` rows

**File:** `remix-app/app/routes/_app/ingest/review.tsx:155-166, 206`
**Issue:** Three input-validation gaps on the PHI write path:
1. `parseFloat(editedValueStr)` is never checked — `editedValue="abc"` yields `NaN`, which Postgres `real` stores (`'NaN'` is a valid float). A clinical metric with value `NaN` corrupts status computation and charts downstream.
2. `editedUnit` is free text committed verbatim to `metrics.unit` with no validation against the resolved/raw unit.
3. Line 206: `category: extraction.resolvedCategory ?? "hematology"` — an **unrecognized** analyte can be approved (the UI allows it; `isPending` ignores `unrecognized`), and its metric row is silently mislabeled as `hematology` with no reference ranges.
**Fix:** Reject the action with 400 when `Number.isFinite(approvedValue)` is false; block approve for `unrecognized` extractions or require an explicit category; constrain `editedUnit` to the resolved unit or a known-unit list.

### WR-04: `insertAuthAuditLog` hardcodes `role: 'owner'` — falsified rows in the immutable audit log

**File:** `remix-app/app/lib/audit.server.ts:142`
**Issue:** Every auth event (sign-in, sign-out, sign-up, invite-redeemed) is written with `role: 'owner'` regardless of the actual actor. A client or practitioner signing in produces an immutable audit row claiming an owner acted. The comment ("role resolved post-auth") explains why the role is awkward to obtain, not why recording a wrong value is acceptable — for a compliance audit trail, wrong data is worse than missing data, and rows can never be corrected (UPDATE is denied by design).
**Fix:** Add `role` to `AuthAuditEntry` and resolve it at the call sites — the session hooks in `auth.server.ts` already query the `user` row for `tenantId` (lines 117-123) and can select `role` in the same query; `user.create.after` has it from the consumed invite / break-glass state.

### WR-05: Assignment action accepts arbitrary IDs — no check that `practitionerId` is a practitioner in the tenant or that `subjectId` belongs to the tenant

**File:** `remix-app/app/routes/_app/settings/assignments.tsx:129-153`, `remix-app/app/lib/assignments.server.ts:42-70`
**Issue:** The action forwards form-supplied `practitionerId`/`subjectId` straight to `assignSubject`. FKs only verify the referenced rows *exist* — not their tenancy or role; the psa RLS `WITH CHECK` validates only the row's `tenant_id` column, not the referenced entities. A crafted owner POST can create assignment rows pointing at a client-role user, an owner, a user from another tenant, or a subject from another tenant. Gate 2 prevents these rows from granting actual cross-tenant access today, but the authorization table accumulates semantically invalid grants (e.g., a client-role user holding a "practitioner" assignment that becomes live if that user is ever promoted), and the UI renders raw IDs for them.
**Fix:** In the action, verify `practitionerId` resolves to a `role = 'practitioner'` user with `tenantId = user.tenantId` (the loader already runs this exact query) and that `subjectId` resolves to a subject in the tenant; return a validation error otherwise.

### WR-06: Ingest PHI reads/writes run on the admin (BYPASSRLS) path, sidestepping the RLS backstop this phase built

**File:** `remix-app/app/routes/_app/ingest/upload.tsx:128-139`, `remix-app/app/routes/_app/ingest/review.tsx:54-100, 120-124, 179-190, 300-316`, `remix-app/app/routes/_app/ingest/document.tsx:35-39`
**Issue:** The phase's stated model is app-layer checks first, RLS as DB backstop (D-11). But session-bound PHI operations in the ingest flow still use `getDb()` (neondb_owner, BYPASSRLS) with hand-written WHERE clauses: the `labDocuments` insert in the upload action, the doc/extraction SELECTs in the review loader and action (the extraction is loaded **by bare id with no tenant WHERE** at review.tsx:121-124 before the authz check), the dedup metrics SELECT (review.tsx:179-190, subject-only WHERE, no tenant predicate), and `maybePurgeDocBytes`. Each is currently guarded by app-layer authz, but none gets the RLS backstop — a single future WHERE-clause mistake on these paths has no second layer. This is exactly the failure class RLS was added to absorb.
**Fix:** Route session-bound ingest reads/writes through `withTenantDb(ctx, ...)` (the audit insert on the same code path already is). Where a pre-authz lookup must run on the admin path (resolving a row's tenant for the check), select only `tenantId`/`subjectId`, then re-read PHI columns inside `withTenantDb` after the gate.

### WR-07: All 13 `requireSubjectCtx` PHI read loaders skip Gate 3 — an unassigned practitioner reads the full PHI surface

**File:** `remix-app/app/lib/authz.server.ts:127-146` (and all 13 callers)
**Issue:** `requireSubjectCtx` calls `assertSubjectAccess(user, subject, user.tenantId!)` with no 4th argument, so a practitioner with **zero active assignments** can read metrics, genotypes, cessation logs, correlations, supplements, and protocol data via every dashboard/metrics/insights/protocol loader — while the same practitioner is 403'd from the reports *list* and the ingest review surface. `require-subject-ctx.test.ts` Test 3 documents this as intentional ("read loaders are owner-data surfaces"), so this is a recorded design decision rather than an oversight — but the enforcement asymmetry is incoherent: AUTH-03 per-assignment scoping protects report summaries and lab extractions while leaving the underlying raw PHI (genotypes are the most sensitive data class in the system) open to any tenant practitioner. Under the single-subject pilot the practical exposure is "practitioner not yet assigned to the one subject" — precisely the state every newly invited practitioner is in.
**Fix:** Add the standard `assignedIds` conditional inside `requireSubjectCtx` (one central change covers all 13 loaders), or record an explicit ADR accepting tenant-wide practitioner read access for the pilot with a Phase 8 closure item.

### WR-08: `assignSubject` detects unique violations by error-message substring matching

**File:** `remix-app/app/lib/assignments.server.ts:61-68`
**Issue:** `msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505")` is fragile: driver error messages are not contractual, `23505` is a `code` property (not normally present in the message text), wrapped/localized messages break the match, and any *other* constraint error whose message happens to contain "unique" is misreported as idempotent success. This is also the mechanism that converts the CR-02 revoked-row collision into a false "Already assigned."
**Fix:** Inspect the structured error: `(err as { code?: string }).code === "23505"` (optionally also `constraint === "idx_psa_active_unique"`), otherwise rethrow.

## Info

### IN-01: Dead variable with nonsensical conditional type in extraction worker

**File:** `remix-app/app/lib/ingest/ingest.server.ts:98`
**Issue:** `let resolvedCategory: typeof doc.status extends string ? string : never | undefined;` — the conditional type is meaningless and the variable is never assigned or read; the insert uses `dictEntry.category` directly at line 176.
**Fix:** Delete the declaration.

### IN-02: Dead helper `getSparkData` always returns null

**File:** `remix-app/app/routes/_app/metrics/index.tsx:114-117`
**Issue:** Function unconditionally returns `null` and its parameter is unused.
**Fix:** Delete it (and the `Sparkline` import if then unused).

### IN-03: Dead error-rendering branch in report generate page

**File:** `remix-app/app/routes/_app/reports/generate.tsx:114-125`
**Issue:** The component renders an error when `actionData` contains `error`, but the action only ever returns `redirect(...)` or throws — it never returns an `{ error }` object, so a `generateReport` failure surfaces as an unstyled error boundary, never this message.
**Fix:** Wrap `generateReport` in try/catch and return `{ error: true }`, or remove the dead branch.

### IN-04: Assignment lookup runs with row-derived tenant GUCs before the authz gate

**File:** `remix-app/app/routes/_app/ingest/review.tsx:85-90, 135-143`
**Issue:** `ctx` is built from `doc`/`extraction` row values (attacker-influenced via `docId`/`extractionId`) and `withTenantDb` sets those as GUCs to run `listAssignedSubjectIds` **before** `assertSubjectAccess` validates tenancy. Outcome is safe today (the psa query also filters `practitionerId = user.id`, and Gate 2 fires before Gate 3 acts on the result), but executing RLS-scoped queries under an unvalidated foreign-tenant GUC is a latent footgun — and the practitioner's assignments semantically belong to `user.tenantId` anyway.
**Fix:** Use `tenantId: user.tenantId!` in the ctx passed to `listAssignedSubjectIds`.

### IN-05: TEN-03 "non-leak" test comment misdescribes what is exercised

**File:** `remix-app/tests/db/rls-isolation.test.ts:184-195`
**Issue:** The comment claims "the GUC is now unset/empty, so the RLS empty-claims guard returns no rows," but step 2 reads via `withTenantDb(ctxB)`, which sets fresh tenant-B GUCs — the test proves cross-tenant isolation again, not the unset-GUC fail-closed path. The empty-claims guard itself is untested.
**Fix:** Add a case that queries as `app_user` with no `set_config` calls and asserts zero rows.

### IN-06: Stale authz comment lists wired routes as "unbroken owner-context callers"

**File:** `remix-app/app/lib/authz.server.ts:68-72`
**Issue:** The comment says the "7 existing owner-context callers (ingest/{consent,document,upload,review}.tsx, reports/{generate,detail,index}.tsx) remain valid without modification" — but five of those seven now pass `assignedSubjectIds` (plan 07-05). The comment misstates current enforcement and is also where the two unwired routes (`consent`, `document` — WR-02 and CR-01) hide in plain sight.
**Fix:** Update the comment to list which callers pass Gate 3 data and which are deliberately exempt.

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
