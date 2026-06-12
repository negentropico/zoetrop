---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 42
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
  - remix-app/tests/lib/report-generator.test.ts
findings:
  critical: 4
  warning: 10
  info: 7
  total: 21
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 42
**Status:** issues_found

## Summary

The core RLS machinery is sound: `withTenantDb` parameterizes the GUC values through Drizzle's `sql` template (no injection path), `SET LOCAL` is correctly transaction-scoped, the `NULLIF(current_setting(...), '')` empty-claims guard fails closed, `FORCE ROW LEVEL SECURITY` covers the owner role inside `SET LOCAL ROLE app_user`, and audit_log immutability is enforced at both policy and grant level. The isolation tests exercise real cross-tenant reads, WITH CHECK rejection, and pool non-leak against live Neon.

However, the review found four blocker-class defects. The two most serious are authorization gaps that contradict the phase's own stated contracts: AUTH-03 per-assignment practitioner scoping was built (table, service, `assertSubjectAccess` parameter, unit tests) but is **never invoked from any route** — it is dead code, so any practitioner in the tenant has full subject access; and the dashboard/metrics/insights/protocol PHI loaders apply **no role gate at all**, so a client-role user can read every PHI surface. Additionally, the lab-ingest pipeline's PHI reads/writes still run on the admin `getDb()` path (bypassing RLS, contradicting the runbook's compliance claim), and the assignments service has a soft-delete vs. non-partial-unique-index conflict that permanently bricks re-assignment after a revoke while reporting success.

## Critical Issues

### CR-01: AUTH-03 per-assignment practitioner scoping is dead code — no route enforces it

**File:** `remix-app/app/lib/assignments.server.ts:150` (definition), `remix-app/app/routes/_app/ingest/upload.tsx:69`, `remix-app/app/routes/_app/ingest/review.tsx:120`, `remix-app/app/routes/_app/ingest/consent.tsx:34`, `remix-app/app/routes/_app/reports/generate.tsx:48`, `remix-app/app/routes/_app/reports/index.tsx:33`, `remix-app/app/routes/_app/reports/detail.tsx:63`
**Issue:** `listAssignedSubjectIds` is never called from any route or loader (verified by grep: zero call sites outside its own definition and a comment). Every `assertSubjectAccess` caller omits the `assignedSubjectIds` 4th argument, which per `authz.server.ts:96` causes Gate 3 (the per-assignment check) to be skipped entirely. Concretely: a practitioner who has **never been assigned** to the subject can upload lab PDFs (`upload.tsx` allows `["owner","practitioner"]`), approve/reject extractions and commit metrics (`review.tsx` action), and generate reports (`generate.tsx`). The RLS layer does not compensate — policies key only on `app.tenant_id`/`app.subject_id` GUCs, which these routes populate from the owner subject regardless of assignment. The `/settings/assignments` UI therefore manages a table that has **zero enforcement effect**. The claim in `authz.server.ts:11` ("Phase 7 AUTH-03 COMPLETE") and the comment that the "7 existing callers are owner-context" are both wrong — upload, review, and generate explicitly admit practitioners.
**Fix:** In every action/loader that admits the practitioner role, resolve assignments before the access check:
```typescript
const assignedIds =
  user.role === "practitioner"
    ? await listAssignedSubjectIds(ctx, user.id)
    : undefined;
assertSubjectAccess(user, { tenantId: subject.tenantId, id: subject.id }, user.tenantId!, assignedIds);
```
Note that `assertSubjectAccess` Gate 3 also requires `subject.id` to be present — `review.tsx:120` and `reports/detail.tsx:63` currently pass only `{ tenantId }`, which would deny ALL practitioners once `assignedSubjectIds` is supplied; pass the subject id (`extraction.subjectId`, `report.subjectId`) too.

### CR-02: Client-role users can read all subject PHI — dashboard/metrics/insights/protocol loaders have no role gate

**File:** `remix-app/app/routes/_app/dashboard.tsx:97-100`, `remix-app/app/routes/_app/metrics/index.tsx:55-59`, `remix-app/app/routes/_app/metrics/category.tsx:62-65`, `remix-app/app/routes/_app/metrics/detail.tsx:41-44`, `remix-app/app/routes/_app/insights/index.tsx` / `correlations.tsx` / `genetics.tsx` (loaders), `remix-app/app/routes/_app/protocol/index.tsx` / `versions.tsx` / `version-detail.tsx` / `supplements.tsx` / `cessation.tsx` / `compare.tsx` (loaders)
**Issue:** These 13 loaders call only `requireUser` and then build a full `TenantCtx` for the owner subject — no `requireRole`, no `assertSubjectAccess`. The stated authz contract (`authz.server.ts:62`: "client role → always 403 — clients never access subject data directly") is enforced only on ingest/reports routes. A user holding a `client`-role invite for the tenant can load `/dashboard`, `/metrics/*`, `/insights/genetics`, `/protocol/*`, etc. and receive the subject's blood-work metrics, genotypes (`subject_genotypes` — genetic PHI), supplements, cessation log, and correlations. The `_app/layout.tsx` loader gates authentication only, and in React Router 7 child loaders run independently of the layout anyway. RLS does not block this: the loader sets the GUCs to the owner subject itself, so `app_user` queries pass the policy.
**Fix:** Add the same gate used on ingest routes to every PHI loader, immediately after `requireUser`:
```typescript
const subject = await getOwnerSubject(user.tenantId!);
assertSubjectAccess(user, { tenantId: subject.tenantId, id: subject.id }, user.tenantId!);
```
(or centralize: have a `requireSubjectCtx(request)` helper that does requireUser → getOwnerSubject → assertSubjectAccess → return ctx, and use it in all 13 loaders).

### CR-03: Re-assignment after revoke is permanently impossible and misreported as success

**File:** `remix-app/db/schema.ts:288`, `remix-app/migrations/0010_practitioner_assignments.sql:19`, `remix-app/app/lib/assignments.server.ts:61-69`
**Issue:** `unassignSubject` soft-deletes (sets `revoked_at`), leaving the row in place. But `idx_psa_active_unique` is a **plain** unique index on `(tenant_id, practitioner_id, subject_id)` — not a partial index on `revoked_at IS NULL` despite the schema comment calling it a "Unique active assignment". After an owner unassigns a practitioner, any future `assignSubject` for the same pair hits the unique violation, which the catch block at `assignments.server.ts:65` deliberately swallows and reports as `{ assigned: true, alreadyExists: true }`. The UI shows "Already assigned." (success styling) while `listAssignments`/`listAssignedSubjectIds` (which filter `revokedAt IS NULL`) return nothing. Net effect: assign → unassign → assign silently leaves the practitioner unassigned forever, with the owner told the assignment exists. Once CR-01 is fixed this becomes a hard access-denial bug for legitimately re-assigned practitioners.
**Fix:** Make the index partial and reactivate on conflict:
```sql
DROP INDEX idx_psa_active_unique;
CREATE UNIQUE INDEX idx_psa_active_unique
  ON practitioner_subject_assignments (tenant_id, practitioner_id, subject_id)
  WHERE revoked_at IS NULL;
```
In Drizzle: `uniqueIndex('idx_psa_active_unique').on(...).where(isNull(t.revokedAt))`. Alternatively, in `assignSubject`, UPDATE the revoked row (`SET revoked_at = NULL, assigned_by = ..., assigned_at = now()`) when the insert conflicts. Also stop classifying errors by `msg.includes("unique")` — match the Postgres error `code === "23505"` from the driver error object.

### CR-04: Lab-ingest PHI reads/writes still run on the admin `getDb()` path, bypassing RLS

**File:** `remix-app/app/routes/_app/ingest/upload.tsx:123-134`, `remix-app/app/routes/_app/ingest/review.tsx:53-91` (loader reads), `remix-app/app/routes/_app/ingest/review.tsx:109-113` (extraction lookup), `:158-169` (dedup read), `:273-296` (`maybePurgeDocBytes`), `docs/COMPLIANCE-RUNBOOK.md:28`
**Issue:** The phase contract (Wave 3) and the runbook's compliance record ("The app runs all PHI queries as `app_user` (never as `neondb_owner`)", COMPLIANCE-RUNBOOK.md line 28) state that all request-scoped tenant/subject reads and writes go through `withTenantDb`. The lab-ingest pipeline violates this on its highest-sensitivity table: the `labDocuments` INSERT carrying the full PDF bytes (`upload.tsx:126`) runs as `neondb_owner` (BYPASSRLS) inside a live HTTP session where a valid `TenantCtx` already exists three lines above (`upload.tsx:70`). The review loader reads `lab_documents` (including `pdfBytes`) and `lab_extractions` on the admin path; the action's extraction lookup, the metrics dedup read, and the document purge/complete UPDATE all do the same. None of these are bootstrap or background contexts — they have full session ctx in hand. The RLS backstop that this phase exists to provide is absent on exactly the PHI ingress path, and the runbook's documented posture is factually wrong as a compliance record.
**Fix:** Route each through the existing wrapper, e.g. for the upload insert:
```typescript
await withTenantDb(ctx, (tx) =>
  tx.insert(labDocuments).values({ id: docId, tenantId: ctx.tenantId, subjectId: ctx.subjectId, ... })
);
```
Same for the review loader reads (ctx is constructible via `getOwnerSubject` in the no-docId branch; for the docId branch, fetch the doc id/tenant/subject columns first or read inside `withTenantDb` and rely on RLS returning zero rows cross-tenant), the dedup read, and `maybePurgeDocBytes`. The only legitimate admin-path consumers in this pipeline are `extractionWorker` (no session) and `getOwnerSubject` (ctx bootstrap). Update COMPLIANCE-RUNBOOK.md if any admin-path exception is intentionally retained.

## Warnings

### WR-01: Auth audit events hardcode `role: 'owner'`, falsifying the audit trail

**File:** `remix-app/app/lib/audit.server.ts:142`
**Issue:** `insertAuthAuditLog` writes `role: 'owner' as AppRole` for every sign-in, sign-out, sign-up, and invite-redeemed event regardless of the actor's actual role. The comment "role resolved post-auth" is aspirational — it is never resolved. A practitioner or client signing in is recorded in the immutable audit log as an owner action. For a log whose purpose is compliance attribution (AUTH-04), recording a wrong role is worse than omitting it. The session hooks in `auth.server.ts:117-123` already query the user row for `tenantId`; fetching `role` in the same select is free.
**Fix:** Select `role` alongside `tenantId` in the session create/delete hooks and thread it through `AuthAuditEntry`; for sign-up, the role is available on the `pending` invite / created user. Make `role` a required field of `AuthAuditEntry` so future call sites cannot omit it.

### WR-02: Migration 0011 grants app_user full DML on all RLS-excluded tables; runbook claims otherwise

**File:** `remix-app/migrations/0011_rls_policies.sql:112-114`, `docs/COMPLIANCE-RUNBOOK.md:35`
**Issue:** `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user` includes `user`, `session`, `account`, `verification`, `invites`, and `tenants` — none of which have RLS. Inside any `withTenantDb` transaction, code running as `app_user` can read/write every tenant's users, session tokens, invite hashes, and the entire tenants table. The runbook states "tenants is admin-only with no app_user access path" — false: app_user has unrestricted DML on it. This defeats the least-privilege intent of the role split; a SQL-level bug or injection inside a tenant transaction would not be contained for these tables.
**Fix:** Replace the blanket grant with explicit per-table grants on the 16 RLS-governed tables, or follow the blanket grant with `REVOKE ALL ON "user", session, account, verification, invites, tenants FROM app_user;` (Better-Auth adapter queries run as `neondb_owner` outside `withTenantDb`, so app_user needs no access to them). Update the runbook to match reality.

### WR-03: No default-privilege or RLS coverage for future tables — silent drift trap

**File:** `remix-app/migrations/0011_rls_policies.sql:112-114`
**Issue:** `GRANT ... ON ALL TABLES` / `ON ALL SEQUENCES` applies only to objects existing at migration time. There is no `ALTER DEFAULT PRIVILEGES` and no documented checklist step for new tables. Any future migration that adds a PHI table will (a) fail at runtime with permission-denied under `withTenantDb` (best case, confusing), or (b) if someone "fixes" it with a grant but forgets the `ENABLE/FORCE ROW LEVEL SECURITY` + policy, ship a PHI table with **no RLS at all** while every existing signal (tests, runbook) says RLS is on. The phase's own 0013 migration history shows schema evolution continues.
**Fix:** Add `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;` (and `USAGE ON SEQUENCES`) plus a migration-checklist note (in COMPLIANCE-RUNBOOK.md) requiring ENABLE+FORCE RLS + policy for every new tenant/subject-scoped table. Consider a CI test that asserts every table with a `tenant_id` column has `relrowsecurity = true`.

### WR-04: `assertSubjectAccess` passes null/unknown roles — contradicts its own fail-closed contract

**File:** `remix-app/app/lib/authz.server.ts:80-103`, `remix-app/tests/lib/assignments.test.ts:135-141`
**Issue:** The module header (line 5) claims "All helpers are fail-closed: missing or unknown roles are denied, never granted." `assertSubjectAccess` only denies the literal string `"client"`; a `null`, `undefined`, or unrecognized role passes Gates 1 and 3 and gets tenant-wide access. The unit test at `assignments.test.ts:135` codifies this loophole as expected behavior ("owner-ish"). Routes that call `assertSubjectAccess` without a preceding `requireRole` (consent.tsx loader/action, review.tsx loader, reports/index.tsx loader, reports/detail.tsx loader) therefore grant subject access to any authenticated same-tenant user whose role is null/garbage. Roles default to "client" at signup so this is currently latent, but it is one bad migration or adapter change away from being live, and the defense layers explicitly disagree with each other.
**Fix:** Invert Gate 1 to an allow-list:
```typescript
if (user.role !== "owner" && user.role !== "practitioner") {
  throw new Response("You don't have permission to view this.", { status: 403 });
}
```
Update the two tests that lock in the null-role pass-through.

### WR-05: Approve action accepts unvalidated edited values — NaN/garbage can be committed as metrics

**File:** `remix-app/app/routes/_app/ingest/review.tsx:137-144`
**Issue:** `parseFloat(editedValueStr)` is used without a finiteness check. A crafted POST (or an edge-case through the hidden inputs) with `editedValue="abc"` yields `NaN`, and Postgres `real` accepts `NaN` — committing a NaN clinical value to `metrics` that will poison status classification and charts. `editedUnit` is likewise free text with no length/content validation against the resolved unit.
**Fix:**
```typescript
const parsed = parseFloat(editedValueStr);
if (!Number.isFinite(parsed)) {
  return { ok: false, error: "Invalid value" };
}
```
and validate `editedUnit` (max length, non-empty, optionally must equal `resolvedUnit` when the analyte is recognized).

### WR-06: Approving an unrecognized analyte silently miscategorizes it as `hematology`

**File:** `remix-app/app/routes/_app/ingest/review.tsx:185`
**Issue:** `category: extraction.resolvedCategory ?? "hematology"` — extractions flagged `unrecognized: true` (no dictionary match, or unit mismatch) have `resolvedCategory = null`, so approving one writes a metrics row asserting the analyte belongs to Hematology. This is a silent data-integrity error in clinical data: the LAB pipeline's whole design (D-02) is to surface unrecognized analytes, yet approval erases that signal into a fabricated category.
**Fix:** Either block approval of `unrecognized` extractions until the reviewer selects a category (return a 400 with a clear message), or require an explicit `category` form field for unrecognized rows — never default.

### WR-07: Review loader ships full PDF base64 (`pdfBytes`) to the client in loader JSON, re-sent on every 3s poll

**File:** `remix-app/app/routes/_app/ingest/review.tsx:56-65, 69-91`
**Issue:** Both loader branches do `db.select().from(labDocuments)` with no column projection and return `doc` / `docs` directly. The row includes `pdfBytes` (base64, up to ~13MB for a 10MB PDF). The component never uses it — the PDF is fetched separately via `/ingest/documents/:id`. So every review page load, every document in the list view, and every 3-second poll while processing serializes megabytes of PHI document bytes into loader JSON. Beyond waste, it widens PHI exposure surface (the bytes appear in the hydration payload / single-fetch responses where only metadata is needed).
**Fix:** Project explicit columns:
```typescript
db.select({ id: labDocuments.id, fileName: labDocuments.fileName, status: labDocuments.status,
            errorMessage: labDocuments.errorMessage, createdAt: labDocuments.createdAt,
            tenantId: labDocuments.tenantId, subjectId: labDocuments.subjectId })
```
in both branches.

### WR-08: Raw internal error messages from the extraction worker are rendered to the client

**File:** `remix-app/app/lib/ingest/ingest.server.ts:204-214`, `remix-app/app/routes/_app/ingest/review.tsx:729-738`
**Issue:** The worker stores `err.message` verbatim into `labDocuments.errorMessage` ("server-side only — V7, no stack to client" per its own comment), but the review loader returns the row and the UI renders `currentDoc.errorMessage` directly. Anthropic SDK errors, unpdf parse errors, and Postgres errors can carry internal details (model names, internal paths, constraint names, API diagnostics). The V7 containment claim is void.
**Fix:** Map to a user-safe string at the boundary — store a category (`'pdf-parse-failed' | 'llm-failed' | 'db-failed'`) or have the loader replace `errorMessage` with a generic message, keeping the raw message admin-side only.

### WR-09: Assignment action accepts arbitrary IDs — no validation that the practitioner/subject belong to the tenant

**File:** `remix-app/app/routes/_app/settings/assignments.tsx:129-153`, `remix-app/app/lib/assignments.server.ts:42-70`
**Issue:** The action trusts `practitionerId` and `subjectId` from form data. `assignSubject` inserts them with only FK validation; the psa RLS policy checks only the row's `tenant_id` column (which comes from ctx). An owner can therefore create an assignment row referencing a user from **another tenant** (or a client/owner-role user in their own tenant) and a subject from another tenant. Today `assertSubjectAccess` Gate 2 still blocks the cross-tenant read, but the assignments table — the input to the AUTH-03 authorization decision once CR-01 is fixed — can contain semantically invalid grants, and a cross-tenant practitioner-id row means tenant A's owner is writing rows referencing tenant B's principal.
**Fix:** In the action (or in `assignSubject`), verify before insert: the practitioner row exists with `tenantId === ctx.tenantId && role === 'practitioner'`, and the subject row exists with `tenantId === ctx.tenantId`. Return a 400 otherwise.

### WR-10: Dedup check and purge run outside the write transaction on the admin path — race allows duplicate metric inserts; dedup WHERE omits tenant_id

**File:** `remix-app/app/routes/_app/ingest/review.tsx:158-173, 231, 263, 273-296`
**Issue:** The same-day dedup SELECT runs on `getDb()` (admin) **before** the `withTenantDb` transaction that inserts the metric. Two concurrent approves of extractions for the same analyte/day both read "no existing metric" and both insert — exactly the duplicate the dedup exists to prevent (the metrics table has no unique constraint to backstop it). The dedup WHERE also filters only `subjectId + name + day`, omitting `tenantId` (defense-in-depth WHERE is the stated D-11 convention everywhere else). `maybePurgeDocBytes` similarly reads-then-updates non-transactionally on the admin path.
**Fix:** Move the dedup SELECT inside the `withTenantDb` transaction (RLS then also scopes it), add `eq(metrics.tenantId, extraction.tenantId)`, and consider a partial unique index on `(tenant_id, subject_id, name, date_trunc('day', timestamp))` if same-day uniqueness is a real invariant. Fold the purge read+update into the same transaction.

## Info

### IN-01: Dead variable with nonsensical conditional type in extraction worker

**File:** `remix-app/app/lib/ingest/ingest.server.ts:98`
**Issue:** `let resolvedCategory: typeof doc.status extends string ? string : never | undefined;` — the type expression is meaningless (`never | undefined` = `undefined`, and the conditional is constant), and the variable is declared but never assigned or read; the insert uses `dictEntry.category` directly.
**Fix:** Delete the declaration.

### IN-02: db.server.ts comments attribute the app_user role to migration 0010; it is created in 0011

**File:** `remix-app/app/lib/db.server.ts:61, 68, 83`
**Issue:** Three comments say the role "is created by migration 0010 (Plan 02)". Migration 0010 creates `practitioner_subject_assignments`; the role and grants live in 0011 (`0011_rls_policies.sql:101-105`). Misleading during incident response/rollback.
**Fix:** Update the comments to reference 0011.

### IN-03: app_user is created WITH LOGIN although it is only ever entered via SET ROLE

**File:** `remix-app/migrations/0011_rls_policies.sql:103`
**Issue:** `CREATE ROLE app_user ... LOGIN` — the app never connects as app_user (it connects as neondb_owner and switches via `SET LOCAL ROLE`). A LOGIN role with no password is mostly inert, but NOLOGIN removes a needless authentication surface and matches the actual usage model.
**Fix:** `ALTER ROLE app_user NOLOGIN;` in a follow-up migration (verify Neon permits it for owner-created roles).

### IN-04: Consent action is not idempotent — duplicate consent_log rows on resubmit

**File:** `remix-app/app/routes/_app/ingest/consent.tsx:52-77`
**Issue:** The action calls `insertConsent` without re-checking `checkConsent` (the loader checks, the action does not). A double-submit or direct POST writes duplicate consent rows for the same subject/version. Harmless for the gate (existence check) but noisy for a compliance record.
**Fix:** Call `checkConsent(ctx)` in the action and skip the insert (still redirect) when consent already exists, or add a unique index on `(subject_id, consent_version)`.

### IN-05: Upload form's manual fetch expects JSON from a document POST — specific validation errors are likely never shown

**File:** `remix-app/app/routes/_app/ingest/upload.tsx:184-203`
**Issue:** The component bypasses React Router's fetcher and POSTs directly to `/ingest/upload`. When the action returns a data object (size/MIME/magic-byte errors), a document POST to the route path returns the re-rendered HTML page, not JSON — `response.json()` throws and the generic catch shows "Upload failed. Please try again.", hiding the specific message the action carefully constructed.
**Fix:** Use `useFetcher()` / `fetcher.submit(formData, { method: "post", encType: "multipart/form-data" })` and read `fetcher.data.error`, letting React Router handle the `.data` protocol and redirects.

### IN-06: Dashboard/cessation loaders take a second `now` parameter that is dead in production

**File:** `remix-app/app/routes/_app/dashboard.tsx:97`, `remix-app/app/routes/_app/protocol/cessation.tsx` (loader signature)
**Issue:** `loader({ request }, now: Date = new Date())` — React Router invokes loaders with a single argument, so `now` always takes its default in production; it exists only for tests. Unconventional and easy to misread as injectable.
**Fix:** Extract the date-dependent derivation into a pure helper that takes `now`, and test that helper instead.

### IN-07: Cross-tenant docId probing distinguishable via 404 vs 403

**File:** `remix-app/app/routes/_app/ingest/review.tsx:74-79`
**Issue:** A nonexistent `docId` returns 404; an existing doc in another tenant returns 403 (assertSubjectAccess after the unscoped admin-path fetch). The status difference confirms document-ID existence across tenants. `reports/detail.tsx` shows the correct pattern (tenant-scoped query → uniform 404).
**Fix:** Tenant-scope the doc query (`and(eq(labDocuments.id, docId), eq(labDocuments.tenantId, user.tenantId!))`) and return 404 for both cases (this also dovetails with the CR-04 withTenantDb retrofit, where RLS yields zero rows cross-tenant).

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
