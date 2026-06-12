---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
reviewed: 2026-06-12T21:23:37Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - remix-app/app/routes/_app/ingest/document.tsx
  - remix-app/app/routes/_app/ingest/consent.tsx
  - remix-app/app/lib/audit.server.ts
  - remix-app/app/lib/auth.server.ts
  - remix-app/app/lib/assignments.server.ts
  - remix-app/db/schema.ts
  - remix-app/migrations/0014_psa_partial_unique_index.sql
  - remix-app/tests/lib/per-assignment-wiring.test.ts
  - remix-app/tests/lib/assignments.test.ts
findings:
  critical: 1
  warning: 3
  info: 5
  total: 9
status: issues_found
---

# Phase 7: Code Review Report (gap-closure round 2)

**Reviewed:** 2026-06-12T21:23:37Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found
**Diff base:** `1bfb5dace624d4466dca29158a3f8d9d229e71bc`

## Summary

This review verifies the round-2 gap-closure wave against the prior report at this path and reviews the 9 changed files at standard depth.

**Prior-blocker verification:**

- **Prior CR-01 (document.tsx PDF stream skips Gate 3) — FIXED, sound.** `document.tsx:50-55` now builds `TenantCtx`, resolves `assignedIds` via the role-conditional `listAssignedSubjectIds` call, and passes the critical `{ tenantId: doc.tenantId, id: doc.subjectId }` subject shape to `assertSubjectAccess`. Traced through `authz.server.ts:78-106`: Gate 2 fires on cross-tenant docs, Gate 3 denies unassigned practitioners (empty array ≠ undefined), and the no-`id` regression shape is pinned by `per-assignment-wiring.test.ts:189-197`. The 410 purged-bytes check and byte streaming happen strictly after the gate.
- **Prior CR-02 (full unique index breaks revoke-then-reassign) — FIXED, sound.** Migration 0014 drops and recreates `idx_psa_active_unique` with `WHERE revoked_at IS NULL`; `db/schema.ts:291` matches (`uniqueIndex(...).where(sql\`revoked_at IS NULL\`)`). The live-Neon round-trip test (`assignments.test.ts:265-303`) proves assign → unassign → re-assign restores real active access.
- **Prior WR-02 (consent route skips Gate 3) — FIXED, sound.** Both the loader (`consent.tsx:36-40`) and the action (`consent.tsx:61-65`) wire the same role-conditional `assignedIds` into `assertSubjectAccess`, and the matrix is pinned by `per-assignment-wiring.test.ts:204-237`.
- **Prior WR-04 (audit log hardcodes `role: 'owner'`) — PARTIALLY FIXED.** The real actor role is now threaded from the session hooks (`auth.server.ts:120-130, 144-156`) and from the invite/break-glass state in `user.create.after` (`auth.server.ts:235-236`). However the `?? 'owner'` fallback remains and still inflates privilege in the immutable log on the role-unavailable paths (WR-01 below).
- **Prior WR-08 (substring error matching) — FIX IS UNSOUND.** The structured `code === '23505'` check inspects the wrong error layer for drizzle-orm 0.45.x and can never match (new CR-01 below).

Prior findings WR-01 (open redirect) and the document.tsx slice of WR-06 (admin-path PHI read) were not in this wave's fix scope and remain open in reviewed files — carried forward below as WR-02/WR-03. Prior WR-03 (review.tsx approve validation), WR-05 (assignments action ID validation), WR-07 (`requireSubjectCtx` skips Gate 3), and IN-01–IN-06 touch files outside this round's diff and remain open as recorded in the prior report (this report supersedes that file; those items should be tracked from this note).

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: 23505 check inspects the wrong error layer — drizzle-orm ≥0.44 wraps query errors in `DrizzleQueryError`, so the idempotent-duplicate path is dead code

**File:** `remix-app/app/lib/assignments.server.ts:72`
**Issue:** The gap-closure replaced the fragile message-substring match with:

```ts
if ((err as { code?: string }).code === '23505') {
  return { assigned: true, alreadyExists: true };
}
```

But this project runs drizzle-orm **0.45.2** (verified in `node_modules`), and since drizzle-orm 0.44.0 every query error is wrapped before it reaches application code: `pg-core/session.js` `queryWithCache` throws `new DrizzleQueryError(queryString, params, e)` on every execution path (lines 41, 48, 59, 66, 81, 98), and the neon-serverless prepared-query methods all route through it. `DrizzleQueryError` carries only `query`, `params`, `cause`, and `message` — **no `code` property**. The Postgres `23505` lives on `err.cause.code` (the underlying `NeonDbError`). The transaction wrapper in `withTenantDb` rethrows this wrapped error unchanged.

Consequence: the check can never match. Assigning an already-active (tenant, practitioner, subject) triple — e.g. an owner double-submitting the assignment form — rethrows the `DrizzleQueryError`, and the owner gets an unhandled 500 instead of the documented `{ assigned: true, alreadyExists: true }` idempotent success. The contract documented in the file header ("On 23505 unique_violation (structured code check), returns { assigned: true, alreadyExists: true }") is not met. This failure is fail-closed (no false success, no access granted), but it is incorrect behavior in the phase's core access-management feature, and the new DB round-trip test cannot catch it: the assign → unassign → assign sequence never produces a unique violation, so the one code path this handler exists for has **zero test coverage**.
**Fix:**
```ts
function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string }).code ??
    ((err as { cause?: { code?: string } }).cause?.code);
  return code === '23505';
}
// optionally also confirm constraint:
// (err.cause as { constraint?: string })?.constraint === 'idx_psa_active_unique'
```
Checking both layers keeps the code correct across drizzle versions. Then extend the round-trip test with a duplicate step: call `assignSubject` twice while active and assert the second call returns `{ assigned: true, alreadyExists: true }` — that assertion fails against the current code and proves the fix.

## Warnings

### WR-01: `insertAuthAuditLog` falls back to `role: 'owner'` — privilege-inflating default still writes falsified rows to the immutable audit log

**File:** `remix-app/app/lib/audit.server.ts:143`; `remix-app/app/lib/auth.server.ts:235-236`
**Issue:** Prior WR-04 is only partially closed. `entry.role ?? 'owner' as AppRole` still records the **highest-privilege role** whenever the caller cannot resolve one. Concrete reachable paths: (a) a user row whose `role` column is NULL (`role` is `required: false` in Better-Auth additionalFields) signing in/out — `rows[0]?.role` is `null`, `null ?? 'owner'` → logged as owner; (b) any non-invite user-create where `pending` is null in `user.create.after` (`auth.server.ts:235` reads role only from `pending?.role`, never from the created user row, even though the adjacent `tenantId` lookup at lines 224-227 already demonstrates the user-row fallback pattern) — the actual role would be the `client` default, yet the audit row claims `owner`. For a compliance audit trail where UPDATE is denied by design, an unverifiable claim of owner-level action can never be corrected. The break-glass path does not need this fallback — it passes `pending.role` (`"owner"`) explicitly.
**Fix:** In `user.create.after`, resolve role like tenantId: `const role = (pending?.role ?? (typeof userAny["role"] === "string" ? userAny["role"] : undefined)) as AppRole | undefined;`. In `insertAuthAuditLog`, replace the fallback with the least-privilege value (`entry.role ?? 'client'`) or make `audit_log.role` nullable for auth events so "unknown" is recorded honestly instead of as `owner`.

### WR-02: Open redirect via unvalidated `next` parameter in consent route (carried forward — prior WR-01, still open)

**File:** `remix-app/app/routes/_app/ingest/consent.tsx:47, 68, 85`
**Issue:** Both the loader and the action pass user-controlled `next` (query string / hidden form field) directly to `redirect(next)`. `?next=https://evil.example/phish` or `?next=//evil.example` redirects an authenticated user off-site immediately after granting PHI-processing consent — a phishing primitive on a compliance-sensitive flow. Unchanged since the prior report; re-flagged because the file was modified this wave without closing it.
**Fix:** Sanitize once and reuse in loader and action: `const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/ingest/upload";`

### WR-03: document.tsx still reads the full PHI row (including `pdfBytes`) on the admin BYPASSRLS path before authorization (carried forward — document.tsx slice of prior WR-06)

**File:** `remix-app/app/routes/_app/ingest/document.tsx:37-41`
**Issue:** The loader runs `db.select().from(labDocuments).where(eq(labDocuments.id, docId))` on `getDb()` (neondb_owner, BYPASSRLS), pulling every column — including the base64 PDF bytes, the densest PHI artifact in the system — for an attacker-supplied `docId` **before** `assertSubjectAccess` runs. App-layer authz currently prevents the bytes from being served, but the RLS backstop this phase built never sees the read, so a single future regression in this loader's gate ordering has no second layer. The prior report's fix guidance for pre-authz lookups was: select only the columns needed for the gate, then read PHI inside `withTenantDb` after the gate passes.
**Fix:** Two-step read: admin-path `select({ tenantId, subjectId })` for the authz check; after `assertSubjectAccess` passes, fetch `fileName`/`pdfBytes` via `withTenantDb(ctx, ...)` so the byte read is RLS-governed.

## Info

### IN-01: document.tsx sets `app.subject_id` GUC from an attacker-influenced row value before Gate 2 validates tenancy

**File:** `remix-app/app/routes/_app/ingest/document.tsx:50-55`
**Issue:** `ctx.subjectId` is `doc.subjectId` — derived from whatever `docId` the caller supplied, possibly cross-tenant — and `withTenantDb` sets it as `app.subject_id` for the `listAssignedSubjectIds` query **before** `assertSubjectAccess` Gate 2 rejects the cross-tenant doc. Safe today (`ctx.tenantId` is the user's own, and the PSA query filters tenant + practitioner explicitly), but it is the same latent footgun class as prior IN-04: RLS-scoped queries running under unvalidated row-derived GUCs.
**Fix:** Cheap early gate before the lookup: `if (doc.tenantId !== user.tenantId) throw new Response("Not found", { status: 404 });` — then build `ctx` from validated values.

### IN-02: 403/404 split is an existence oracle for cross-tenant document IDs

**File:** `remix-app/app/routes/_app/ingest/document.tsx:43-55`
**Issue:** A nonexistent `docId` returns 404; an existing doc in another tenant returns 403. A cross-tenant caller can confirm which UUIDs exist. Practical risk is low (UUIDv4 keyspace), but the asymmetry is gratuitous.
**Fix:** Return 404 for cross-tenant doc IDs (combine with the IN-01 fix).

### IN-03: Consent action has no duplicate guard — double-submit creates duplicate rows in a legal-record table

**File:** `remix-app/app/routes/_app/ingest/consent.tsx:57-85`; `remix-app/db/schema.ts:388-397`
**Issue:** The action inserts unconditionally (no `checkConsent` re-check) and `consent_log` has no unique constraint on `(subjectId, consentVersion)`, so a double-click or replayed POST writes duplicate consent records. The gate logic (`checkConsent` existence test) is unaffected, but duplicates in a consent ledger are noise in a compliance artifact.
**Fix:** Re-run `checkConsent(ctx)` at the top of the action and redirect if already consented; optionally add a partial unique index on `(subject_id, consent_version)`.

### IN-04: Assigned practitioner can record `v1-pilot-self` self-consent on behalf of the subject

**File:** `remix-app/app/routes/_app/ingest/consent.tsx:72`
**Issue:** Gate 3 now correctly restricts the action to assigned practitioners (and owners), but an assigned practitioner clicking "I consent" still writes a consent row whose version string (`v1-pilot-self`, presented as "your own lab data") asserts self-consent the subject never gave. `consentedByUserId` records the true actor, so provenance is recoverable, but the version semantics misstate the consent basis. Acceptable for the single-subject pilot (owner = subject); becomes a real compliance defect at M1 client intake.
**Fix:** Restrict the consent action to the owner role for the pilot, or introduce a distinct version (e.g. `v1-practitioner-attested`) when `user.role === "practitioner"`.

### IN-05: Round-trip test cleanup swallows all errors — failed FK-ordered deletes silently leak fixtures into live Neon

**File:** `remix-app/tests/lib/assignments.test.ts:240-263`
**Issue:** Every `afterAll` delete chains `.catch(() => undefined)`, so if the first delete fails (e.g. transient connection error), the dependent deletes also fail silently and the disposable tenant/users/subject rows persist in the live database. Timestamped IDs prevent cross-run collisions, but rows accumulate invisibly in a PHI-adjacent production-tier DB.
**Fix:** Log the caught error (`.catch((e) => console.warn("fixture cleanup failed:", e))`) so leaks are at least visible in test output.

---

_Reviewed: 2026-06-12T21:23:37Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
