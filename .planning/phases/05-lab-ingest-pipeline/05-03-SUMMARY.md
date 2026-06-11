---
phase: 05-lab-ingest-pipeline
plan: 03
subsystem: ui
tags: [react-pdf, pdfjs, lab-review, audit-log, consent-gate, assertSubjectAccess, drizzle-transaction, vercel-preview]

# Dependency graph
requires:
  - phase: 05-01
    provides: "4 ingest tables (labDocuments, labExtractions, auditLog, consentLog), data_source enum +lab, labExtraction resolved/approved columns + committedMetricId"
  - phase: 05-02
    provides: "upload action (ingest/upload.tsx), consent.server (checkConsent/insertConsent), audit.server (insertAuditLog, PHI-free AuditLogEntry), extractionWorker, ingest layout + review/consent stubs, ingest route block"
  - phase: 03-identity-tenancy-scoping
    provides: "requireUser, requireRole, assertSubjectAccess authz helpers (D-15 write-path gate)"
  - phase: 04-static-to-db
    provides: "getDb(), getOwnerSubject() tenant-scoped data access"
  - phase: 04.1-design-system-adoption
    provides: "Card/Badge/Button/PageHeader/Input UI primitives + brand tokens (--accent periwinkle, --danger, radii)"
provides:
  - "ingest section fully routable: index landing (redirect to upload), named ingest/upload route (single upload surface), review, consent, documents/:id"
  - "consent gate form (consent.tsx): loader checkConsent-redirect + action insertConsent('v1-pilot-self') + PHI-free auditLog (LAB-06/D-08/D-09)"
  - "authenticated PDF byte-streaming loader (document.tsx): requireUser + assertSubjectAccess before bytes, Content-Type application/pdf, no-store (T-05-DOC)"
  - "PdfPageViewer (react-pdf): page render with renderTextLayer + grounded snippet highlight, worker via import.meta.url, pdfjs-dist NOT a direct dep (D-06/Pitfall 6)"
  - "review surface (review.tsx): split-view PDF + extracted fields, status polling uploaded→processing→pending_review (D-11), per-field approve/edit/reject write path (no bulk-approve), assertSubjectAccess + auditLog + pdfBytes purge in transaction (LAB-04/LAB-05/D-15/CR-01)"
affects: [06-report-generation, 07-phi-compliance-hardening]

# Tech tracking
tech-stack:
  added: []  # react-pdf was installed in 05-01 Wave-0; this plan only consumes it
  patterns:
    - "react-pdf worker via new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url) — Vite bundles the peer-dep version (Pitfall 6: never add pdfjs-dist to direct deps)"
    - "Text-layer snippet highlight: concatenate .react-pdf__Page__textContent spans, whitespace-normalize, locate snippet, mark overlapping spans (D-06 grounding)"
    - "Status polling via useFetcher.load(loaderUrl) on setInterval gated by status==='processing' (D-11) — not shouldRevalidate"
    - "Per-field write path inside db.transaction: metrics INSERT (source='lab') + labExtractions UPDATE + auditLog INSERT atomically; assertSubjectAccess BEFORE the transaction (D-15)"
    - "Static auditLog table import (not dynamic import()) inside route actions — dynamic import() in an action body breaks React Router server-code tree-shaking (build error: 'Server-only module referenced by client')"
    - "pdfBytes purge: after any terminal extraction, if no pending_review rows remain set labDocuments.pdfBytes=null + status='completed' (T-05-PURGE / Open Question 2)"

key-files:
  created:
    - "remix-app/app/routes/_app/ingest/index.tsx"
    - "remix-app/app/routes/_app/ingest/document.tsx"
    - "remix-app/app/components/ui/PdfPageViewer.tsx"
  modified:
    - "remix-app/app/routes.ts (added index + documents/:id to existing ingest block)"
    - "remix-app/app/routes/_app/ingest/consent.tsx (stub → full consent gate)"
    - "remix-app/app/routes/_app/ingest/review.tsx (stub → full loader + UI + action)"
    - "remix-app/tests/lib/ingest/approve-action.test.ts (7 placeholders → 14 real assertions)"

key-decisions:
  - "index.tsx is a loader-only redirect to /ingest/upload — single upload surface preserved (LAB-04); no Dropzone/action duplication"
  - "document.tsx created in Task 1 (not Task 2) as a Rule-3 blocking fix: react-router typegen scans every registered route file, so registering documents/:id required the file to exist before typecheck could pass"
  - "auditLog written via static schema import inside db.transaction — the initial dynamic import() form tripped React Router's 'Server-only module referenced by client' build guard"
  - "consent action records action:'consent' auditLog entry (lifecycle event) in addition to the consentLog row"

patterns-established:
  - "react-pdf worker config via import.meta.url with pdfjs-dist as peer-dep-only (Pitfall 6)"
  - "Grounded-snippet text-layer highlight over the react-pdf text content layer (D-06)"
  - "Loader-polling for async background-job status via useFetcher (D-11)"

requirements-completed: [LAB-04, LAB-05, LAB-06]

# Metrics
duration: ~18min
completed: 2026-06-10
---

# Phase 5 Plan 03: Lab Review Surface + Write-Path Closure Summary

**Human-in-the-loop lab review surface: react-pdf side-by-side viewer with grounded-snippet highlight, status-polling review list, and a per-field approve/edit/reject write path that gates every metrics insert behind `assertSubjectAccess` + a PHI-free `auditLog` inside a Drizzle transaction — no bulk-approve bypass. Code complete (Tasks 1-3 committed); the end-to-end Vercel-preview UAT (Task 4) is the one open item, pending human verification.**

## Status

- **Tasks 1-3 (code): COMPLETE and committed** — `301d826`, `b12692e`, `6e15a2c`
- **Task 4 (E2E UAT on Vercel preview): DEFERRED / PENDING HUMAN VERIFICATION** — not attempted by the executor (a blocking human-verify checkpoint against a real deploy with a real lab PDF). Infra is fully staged; the owner runs it. See [Task 4 section](#task-4-e2e-uat--deferred--pending-human-verification) below.
- **Plan is NOT marked complete**, and the **phase is NOT marked complete** — phase verification + the human E2E are the orchestrator's next steps.

## Performance

- **Duration:** ~18 min (code execution; Task 4 UAT time not included — owner-run later)
- **Started:** 2026-06-10 (Wave 3 execution)
- **Completed (code):** 2026-06-10
- **Tasks:** 3 of 4 (code); Task 4 deferred to human UAT
- **Files modified:** 3 created + 4 modified

## Accomplishments

- **Single upload surface preserved (LAB-04):** `routes.ts` reconciled — added `index('routes/_app/ingest/index.tsx')` + `route('ingest/documents/:id', 'routes/_app/ingest/document.tsx')` into the *existing* ingest layout block (no duplicate block). The named `ingest/upload` route still resolves to the 05-02 `upload.tsx`. `index.tsx` is a lightweight loader-redirect to `/ingest/upload`, never a second upload form.
- **Consent gate (LAB-06 / D-08 / D-09):** `consent.tsx` filled — loader runs `requireUser → assertSubjectAccess → checkConsent` (redirects to `?next` if already consented); action runs `requireUser → assertSubjectAccess → insertConsent(subject.id, user.id, 'v1-pilot-self')` + a PHI-free `auditLog` entry, then redirects. The form is generic enough for future client intake (D-09).
- **Authenticated PDF byte stream (T-05-DOC):** `document.tsx` loader at `ingest/documents/:id` — `requireUser` + `assertSubjectAccess(user, {tenantId: doc.tenantId}, user.tenantId)` before any bytes; decodes base64 → `Content-Type: application/pdf` with `no-store`. Cross-tenant docId → 403. Purged bytes → 410.
- **PdfPageViewer (LAB-04 / D-06 / Pitfall 6):** `"use client"` react-pdf `<Document>/<Page>` with `renderTextLayer`, worker via `import.meta.url` (pdfjs-dist remains a peer dep only — NOT in direct dependencies). After render, the grounded `sourceTextSnippet` is located in the text-layer DOM and highlighted.
- **Review surface (LAB-04 / D-11):** `review.tsx` — loader returns `{doc, extractions}` tenant/subject-scoped (and a docId-less document-list fallback); the component renders a split view (left = `PdfPageViewer` for the selected extraction's page with its snippet highlighted; right = per-field extraction list) and polls the loader every 3s via `useFetcher` while `status==='processing'`, showing status badges across uploaded → processing → pending_review.
- **Write path closed (LAB-05 / D-15 / CR-01):** `review.tsx` action handles per-field `approve | edit-approve | reject` keyed by `extractionId`. Sequence: `requireUser → requireRole(['owner','practitioner']) → load extraction → assertSubjectAccess BEFORE any write`. Approve/edit-approve run inside a Drizzle transaction: INSERT `metrics` (`source: 'lab'`, resolved dictionary fields + approved value/unit, tenant/subject) + UPDATE `labExtractions` (status=approved, reviewedAt/By, committedMetricId) + INSERT `auditLog` (no PHI). Reject updates status + writes an `auditLog` row and writes no metric. After any terminal transition, if no `pending_review` rows remain, `pdfBytes` is purged and the doc is marked `completed` (T-05-PURGE). There is no bulk-approve control (T-05-BULK).
- **Cross-plan contracts GREEN:** `approve-action.test.ts` expanded from 7 placeholder assertions to 14 real ones (requireRole-first 403 for client, cross-tenant assertSubjectAccess 403, D-15 sequence lock, PHI-free AuditLogEntry type, no-bulk-approve intent set). `ingest-review.test.ts` (skip-guarded live-Neon) skips cleanly without `DATABASE_URL_UNPOOLED` — runs GREEN with env.

## Task Commits

1. **Task 1: Ingest layout + index landing + consent route + routes.ts registration (incl. document.tsx blocking fix)** — `301d826` (feat)
2. **Task 2: PdfPageViewer (react-pdf) + authed PDF byte stream + review loader/UI with polling + per-field action** — `b12692e` (feat)
3. **Task 3: approve-action.test.ts GREEN — D-15 sequence + PHI-free auditLog + no-bulk-approve contracts** — `6e15a2c` (test)

**Plan metadata:** _(this SUMMARY commit)_

_Note: Task 4 (E2E UAT on Vercel preview) is deferred to human verification — no executor commit._

## Files Created/Modified

- `remix-app/app/routes.ts` — added `index` + `documents/:id` to the existing ingest layout block (single upload surface preserved)
- `remix-app/app/routes/_app/ingest/index.tsx` *(created)* — loader-only redirect to `/ingest/upload` (lightweight landing, no upload form)
- `remix-app/app/routes/_app/ingest/consent.tsx` *(stub → full)* — consent gate loader + `insertConsent('v1-pilot-self')` action + auditLog + generic consent UI
- `remix-app/app/routes/_app/ingest/document.tsx` *(created)* — auth+authz PDF byte-streaming loader (T-05-DOC)
- `remix-app/app/components/ui/PdfPageViewer.tsx` *(created)* — react-pdf page render with text-layer snippet highlight (D-06)
- `remix-app/app/routes/_app/ingest/review.tsx` *(stub → full)* — review loader + split-view UI with polling + per-field approve/edit/reject write-path action
- `remix-app/tests/lib/ingest/approve-action.test.ts` *(7 → 14 assertions)* — D-15 sequence + PHI-free audit + no-bulk-approve contracts
- `remix-app/tests/parity/ingest-review.test.ts` — unchanged (skip-guarded live-Neon loader-scoping test; runs GREEN with `DATABASE_URL_UNPOOLED`, skips cleanly without)

## Decisions Made

- **index.tsx = loader redirect to /ingest/upload** — the lightweight-landing option that most strongly preserves the single-upload-surface invariant (LAB-04); no risk of a second Dropzone/action.
- **document.tsx created in Task 1, not Task 2** — `react-router typegen` scans every route registered in `routes.ts`; registering `documents/:id` made typecheck fail until the file existed (Rule 3 blocking). Created with its full T-05-DOC implementation rather than a throwaway stub.
- **auditLog via static schema import inside the transaction** — see Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created document.tsx during Task 1 to unblock typecheck**
- **Found during:** Task 1 (typecheck step)
- **Issue:** Registering `route('ingest/documents/:id', 'routes/_app/ingest/document.tsx')` in `routes.ts` made `react-router typegen` fail with `FileNotFoundError` — typegen scans every registered route file, and `document.tsx` didn't exist yet (it was listed as a Task 2 deliverable).
- **Fix:** Created `document.tsx` with its full auth+authz PDF byte-streaming implementation (T-05-DOC) during Task 1 instead of a placeholder stub. The route registration and the file landed together.
- **Files modified:** `remix-app/app/routes/_app/ingest/document.tsx` (created)
- **Verification:** `npm run typecheck` passes.
- **Committed in:** `301d826` (Task 1 commit)

**2. [Rule 3 - Blocking] Replaced dynamic import() of auditLog with a static schema import in review.tsx**
- **Found during:** Task 2 (build step)
- **Issue:** `npm run build` failed with `Server-only module referenced by client … '~/lib/audit.server' imported by route 'review.tsx'`. The root cause was a dynamic `(await import('../../../../db/schema')).auditLog` inside the action's transaction body — the dynamic `import()` defeated React Router's static analysis that strips server-only code from the client bundle.
- **Fix:** Imported `auditLog` statically at the top of `review.tsx` alongside the other schema tables and removed the now-unused `insertAuditLog` import; the transaction inserts directly into `auditLog` via `tx.insert(auditLog)`. (`insertAuditLog` from `audit.server.ts` is still used elsewhere — e.g. consent.tsx — unchanged.)
- **Files modified:** `remix-app/app/routes/_app/ingest/review.tsx`
- **Verification:** `npm run build` completes (all 3 Vite environments build; react-pdf worker bundles to `pdf.worker.min-*.mjs`; `review` client chunk 433 kB).
- **Committed in:** `b12692e` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking)
**Impact on plan:** Both fixes were necessary to make typecheck/build pass; neither changed scope. `document.tsx` was a planned Task 2 deliverable simply created one task earlier; the auditLog import change is purely mechanical (static vs dynamic import of the same table).

## Issues Encountered

- **react-pdf "use client" sourcemap warnings during build** — `Dropzone.tsx` and `PdfPageViewer.tsx` emit `Error when using sourcemap for reporting an error: Can't resolve original location of error` warnings (the `"use client"` directive offsets sourcemap line 0). Cosmetic only — the build succeeds and the worker bundles correctly. Not fixed (out of scope; pre-existing for Dropzone).
- **Post-build ENOENT on `build/client/.vite`** — a React Router CLI manifest-cleanup step throws `ENOENT: scandir 'build/client/.vite'` *after* all three Vite environments report `✓ built`. This is a tooling cleanup artifact, not a build failure — the client/SSR bundles are produced. Noted, not blocking.

## Automated Verification Results

- `npm run typecheck` — **PASS** (clean, 0 errors)
- `npm run build` — **PASS** (client + SSR + default-SSR environments all `✓ built`; react-pdf worker bundled `pdf.worker.min-*.mjs`; `review` chunk 433 kB / gzip 128 kB)
- `npm run test` (full suite) — **195 pass / 58 skip** (was 188 pass before this plan; +7 from the approve-action expansion)
  - `tests/lib/ingest/approve-action.test.ts` — **14/14 GREEN**
  - `tests/parity/ingest-review.test.ts` — **3 skipped** (skip-guarded live-Neon; no `DATABASE_URL_UNPOOLED` in the local vitest process → clean GREEN-SKIP; runs and passes with both `DATABASE_URL` + `DATABASE_URL_UNPOOLED` exported)
- **LAB-04 grep gates:**
  - Single upload surface: `grep -E "ingest/upload.*routes/_app/ingest/upload.tsx" app/routes.ts` → MATCH; `grep -c "routes/_app/ingest/layout.tsx" app/routes.ts` → 1
  - No bulk-approve control: `grep -ic "approve.all\|approveAll" app/routes/_app/ingest/review.tsx` → 0 code paths (only documentation comments referencing the *absence* of bulk-approve)
- **Write-path gates:** `grep -c "assertSubjectAccess" app/routes/_app/ingest/review.tsx` ≥ 1 and it appears before the `metrics` insert (line 119 vs line 142); `grep -c "source: 'lab'" review.tsx` = 2; `pdfjs-dist` absent from `package.json` dependencies.

## Task 4: E2E UAT — DEFERRED / PENDING HUMAN VERIFICATION

**This is the one open item.** It is a blocking human-verify checkpoint the executor cannot perform: it requires the human owner to run the full upload → extract → review → approve flow against a real lab PDF on a live Vercel preview. It confirms the behaviors unit tests cannot: `waitUntil` actually starting the background extraction on a real React Router/Vercel deploy (Risk #1), the real PDF rendering with the located snippet, per-field-only review, approved-only writes with `source='lab'`, and the `consentLog` + PHI-free `auditLog` rows.

### Infra readiness (staged — owner can run this any time)

- `ANTHROPIC_API_KEY` is set in Vercel **Preview + Production** environments.
- GitHub repo connected: `negentropico/zoetrop`, `rootDirectory=remix-app`.
- A git-linked preview built successfully: **https://zoetrop-gtpsezj4x-negentropico.vercel.app** (SSO-protected; owner-accessible in browser).
- The `003-remix-foundation` branch carries Tasks 1-3; pushing further commits re-triggers a preview deploy.

### Exact UAT steps (owner runs)

1. On the Vercel preview ( **https://zoetrop-gtpsezj4x-negentropico.vercel.app** , or the latest preview for `003-remix-foundation`), sign in as owner and open `/ingest/upload`. First upload should present the consent gate; consent, then upload a real **text-extractable** lab PDF.
2. Confirm the upload action responds in **under ~2s** and the review page shows status `processing`, transitioning to `pending_review` within **~30-60s**. If it stays `uploaded` indefinitely, `waitUntil` did not start — report it (fallback: Vercel Cron-drain pattern, RESEARCH.md line 199).
3. On `/ingest/review?docId=…`, confirm the **real PDF page renders** beside the extracted fields and the **grounded snippet is located/highlighted**; confirm each field has its **own Approve / Edit / Reject** and there is **NO single bulk-approve control**.
4. Approve a couple of fields (edit one value first), reject one. Confirm the **approved metrics appear on the dashboard/metrics screens with `source='lab'`**, the rejected one does **not**, and (via Drizzle Studio or a quick query) a **`consentLog` row** and **`auditLog` rows** (upload, extraction-complete, approve, reject) exist with **NO clinical values** in `audit_log`.
5. Reply **"approved"** if all pass, or describe failures.

### Acceptance criteria (must be TRUE for Task 4 to close)

- Upload returns <2s and `labDocuments.status` reaches `processing` within ~5s then `pending_review` (waitUntil confirmed on real deploy)
- Review renders the real PDF page with the located snippet; review is per-field only (no bulk-approve)
- Approved metrics appear with `source='lab'`; rejected extraction writes no metric
- `consentLog` row exists for the subject; `audit_log` has upload/extraction-complete/approve/reject rows with no PHI value columns
- Owner replies "approved"

**Resume signal:** Type "approved" after the end-to-end flow passes on the preview, or describe what failed.

## User Setup Required

- `ANTHROPIC_API_KEY` in Vercel Preview + Production — **DONE** (staged by orchestrator).
- No further code-side setup. The only open action is the owner-run E2E UAT above.

## Next Phase Readiness

- **Code for LAB-04/LAB-05/LAB-06 is complete and committed.** The ingest pipeline is end-to-end wired (upload → extract → review → approve) pending the human E2E confirmation.
- **Phase 6 (report generation)** consumes the `metrics` rows written here (`source='lab'`, tenant/subject-scoped) — that contract is in place.
- **Open item before phase close:** the Task 4 E2E UAT (owner) + phase verification (orchestrator). Do not mark the phase complete until both clear.

## Self-Check: PASSED (code deliverables — Tasks 1-3)

**Created files exist:**
- FOUND: `remix-app/app/routes/_app/ingest/index.tsx`
- FOUND: `remix-app/app/routes/_app/ingest/document.tsx`
- FOUND: `remix-app/app/components/ui/PdfPageViewer.tsx`

**Modified files exist:**
- FOUND: `remix-app/app/routes.ts`
- FOUND: `remix-app/app/routes/_app/ingest/consent.tsx`
- FOUND: `remix-app/app/routes/_app/ingest/review.tsx`
- FOUND: `remix-app/tests/lib/ingest/approve-action.test.ts`

**Commits exist:**
- FOUND: `301d826` (Task 1)
- FOUND: `b12692e` (Task 2)
- FOUND: `6e15a2c` (Task 3)

**Open item (explicitly NOT passed — by design):** Task 4 E2E UAT on Vercel preview — DEFERRED / PENDING HUMAN VERIFICATION. The code Self-Check passes; the single outstanding item is the human-run end-to-end flow, which is the orchestrator's/owner's next step.

---
*Phase: 05-lab-ingest-pipeline*
*Plan: 03 (code complete; E2E UAT pending human verification)*
*Completed (code): 2026-06-10*
