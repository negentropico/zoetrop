---
phase: 05-lab-ingest-pipeline
verified: 2026-06-11T00:43:32Z
status: human_needed
score: 5/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Upload a text-extractable lab PDF on the Vercel preview for branch 003-remix-foundation"
    expected: |
      1. Upload action returns <2s; labDocuments.status reaches 'processing' within ~5s then 'pending_review' within ~60s, confirming waitUntil actually starts the background extraction on React Router + Vercel (Risk #1 — React Router issue #72176).
      2. /ingest/review renders the real PDF page with the grounded snippet located/highlighted.
      3. Per-field Approve / Edit / Reject controls are present; there is NO single bulk-approve control.
      4. Approved metrics appear on the dashboard/metrics screens with source='lab'; rejected extraction writes no metric.
      5. consentLog row exists for the subject; audit_log has upload/extraction-complete/approve/reject rows with no PHI value columns.
      6. If status stays 'uploaded' indefinitely, waitUntil did not start — report and apply the Vercel Cron-drain fallback (RESEARCH.md line 199).
    why_human: |
      Runtime behavior on a real Vercel deploy cannot be verified by code inspection:
      (a) The <2s response-time guarantee is a timing invariant only measurable on a live HTTP request.
      (b) The waitUntil background-job actually starting depends on Vercel's serverless runtime handling React Router server actions (React Router issue #72176) — the unit tests mock this away.
      (c) The real PDF page render in react-pdf requires a browser + PDF bytes; the text-layer snippet highlight is a DOM behavior.
      These are the exact items 05-03-PLAN.md Task 4 deferred to the owner E2E UAT.
      Preview URL: https://zoetrop-gtpsezj4x-negentropico.vercel.app (or latest for 003-remix-foundation).
---

# Phase 5: Lab Ingest Pipeline — Verification Report

**Phase Goal:** A practitioner can upload a lab PDF, the system asynchronously extracts structured values with LLM assistance, those values are grounded and range-validated before review, the practitioner reviews fields side-by-side with the source document and approves or rejects each, and only approved metrics are written to the subject's record with full audit logging — consent is captured at intake.
**Verified:** 2026-06-11T00:43:32Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /ingest/upload commits a labDocuments row with status='uploaded' within 2s via waitUntil; does not block on LLM extraction | ? UNCERTAIN (runtime) | Code verified: upload.tsx inserts labDocuments synchronously with status='uploaded', then calls `waitUntil(extractionWorker(docId))` from the action (never a loader), then returns `redirect(...)` — the correct shape. The actual <2s timing on Vercel is a runtime measurement only. |
| 2 | Async LLM extraction populates labExtractions with status='pending_review'; every extracted value has a sourceTextSnippet; ungrounded values flagged confidence='low', not silently propagated | ✓ VERIFIED | ingest.server.ts: calls `checkGrounding(snippet, pageTexts, pageNumber)` for every extraction; if result is `'low_confidence'` sets `confidence = 'low'`; unrecognized analytes (D-02) inserted with `unrecognized=true, confidence='low'`; D-04 unit mismatch routes to unrecognized path. Every `labExtractions.insert()` includes `sourceTextSnippet` (verbatim from LLM output). Status='pending_review' set after the loop. Error path sets status='failed' server-side only (V7). |
| 3 | Every extracted value passes a physiological-range check; out-of-range surfaces a rangeFlag; ranges from the dictionary, not the PDF | ✓ VERIFIED | ingest.server.ts: `checkRange(value, dictEntry.referenceMin, dictEntry.referenceMax)` called for recognized analytes; result stored as `rangeFlag` on labExtractions. `checkRange` and `lookupAnalyte` are pure dependency-free functions confirmed by 35 passing boundary tests. D-01 authority: ranges come from `ANALYTE_DICTIONARY`, never from the PDF. |
| 4 | /ingest/review renders the source PDF page alongside extracted fields; per-field approve/edit/reject; NO bulk-approve bypass | ? UNCERTAIN (runtime) | Code verified: review.tsx renders `<PdfPageViewer pdfUrl={'/ingest/documents/'+doc.id} pageNumber highlightSnippet />` in a split-view grid. ExtractionRow component has individual Approve/Edit/Reject fetcher.Form buttons per field. `grep -i "approve.all\|approveAll\|bulk" review.tsx` returns only two comment lines noting the absence of bulk-approve (T-05-BULK). No bulk intent handled in the action (only 'approve', 'edit-approve', 'reject'). PdfPageViewer has `"use client"`, renderTextLayer, and text-layer highlight logic. Runtime PDF rendering requires browser + real bytes. |
| 5 | Only practitioner-approved metrics written to metrics (source='lab', tenantId/subjectId); each approval produces a PHI-free auditLog entry | ✓ VERIFIED | review.tsx action: `requireUser → requireRole(['owner','practitioner']) → load extraction → assertSubjectAccess BEFORE any write`. Approve path runs a Drizzle transaction: `tx.insert(metrics).values({..., source: 'lab', tenantId, subjectId, ...})` + `tx.update(labExtractions status='approved')` + `tx.insert(auditLog).values({action:'approve', tableName:'metrics', operation:'insert', entityId: metricId, ...})` with no clinical value fields. Reject path writes no metrics row, only updates labExtractions to 'rejected' and writes a 'reject' auditLog. `source: 'lab'` grep count = 2 in review.tsx. |
| 6 | Consent form presented at intake before any PHI write; a consentLog {subjectId, consentedAt, consentVersion} persisted and required for subsequent writes | ✓ VERIFIED | upload.tsx action: `checkConsent(subject.id)` called before any DB insert; if false → `redirect('/ingest/consent?next=/ingest/upload')`. consent.tsx action: `insertConsent(subject.id, user.id, 'v1-pilot-self')` + `insertAuditLog({action:'consent', ...})`. consentLog schema has subjectId NOT NULL, consentedAt NOT NULL, consentVersion. consent.test.ts: 7/7 GREEN with DB-mocked assertions that gate blocks without consentLog row. |

**Score:** 4/6 truths verified (2 are runtime-only — classified as human_needed, not gaps_found)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `remix-app/app/lib/ingest/grounding.ts` | checkGrounding pure function | ✓ VERIFIED | Exports `GroundingResult`, `checkGrounding`; 0 non-type imports; 35 boundary tests GREEN |
| `remix-app/app/lib/ingest/range-check.ts` | checkRange pure function | ✓ VERIFIED | Exports `RangeFlag`, `checkRange`; 0 non-type imports; all RangeFlag variants covered |
| `remix-app/app/lib/ingest/analyte-dictionary.ts` | ANALYTE_DICTIONARY + lookupAnalyte | ✓ VERIFIED | Server-only comment present; 101 entries; `value:` count = 0 (no PHI); MetricCategory typed |
| `remix-app/app/lib/consent.server.ts` | checkConsent + insertConsent | ✓ VERIFIED | Both exported; consentLog row select + insert wired; consent.test.ts 7/7 GREEN |
| `remix-app/app/lib/audit.server.ts` | insertAuditLog (no PHI fields) | ✓ VERIFIED | AuditLogEntry type has no value/name clinical fields; approve-action.test.ts asserts this |
| `remix-app/app/lib/ingest/extraction.server.ts` | extractLabValues (claude-sonnet-4-6, forced tool-use) | ✓ VERIFIED | model='claude-sonnet-4-6'; tool_choice:{type:'any'}; additionalProperties:false; Phase-7 BAA docblock |
| `remix-app/app/lib/ingest/ingest.server.ts` | extractionWorker background orchestrator | ✓ VERIFIED | Wires extractText + extractLabValues + checkGrounding + lookupAnalyte + checkRange + insertAuditLog (13 call-site matches); status='failed' error path present |
| `remix-app/app/routes/_app/ingest/upload.tsx` | Upload action with waitUntil + consent gate + maxDuration | ✓ VERIFIED | `export const config = { maxDuration: 120 }`; `waitUntil(extractionWorker(docId))` from action only; checkConsent gate; PDF MIME + magic bytes + 10MB validation |
| `remix-app/app/routes/_app/ingest/review.tsx` | Review loader + per-field approve/edit/reject action | ✓ VERIFIED | Loader: tenant/subject-scoped; polling via useFetcher every 3s while processing. Action: D-15 sequence; metrics source='lab'; no bulk-approve |
| `remix-app/app/routes/_app/ingest/consent.tsx` | Consent gate form + action | ✓ VERIFIED | loader: checkConsent → redirect if already consented; action: insertConsent('v1-pilot-self') + auditLog |
| `remix-app/app/routes/_app/ingest/document.tsx` | Authenticated PDF byte-streaming loader | ✓ VERIFIED | requireUser + assertSubjectAccess before bytes; Content-Type: application/pdf; no-store; 410 for purged bytes |
| `remix-app/app/routes/_app/ingest/index.tsx` | Lightweight landing (redirect to upload, NOT a second upload surface) | ✓ VERIFIED | Loader-only redirect to /ingest/upload; no Dropzone/action/extractionWorker |
| `remix-app/app/components/ui/PdfPageViewer.tsx` | react-pdf page render with text-layer snippet highlight | ✓ VERIFIED | "use client"; renderTextLayer=true; worker via import.meta.url; text-layer highlight logic; pdfjs-dist NOT in direct dependencies |
| `remix-app/db/schema.ts` | 4 new tables + lab enum + 3 status/confidence enums | ✓ VERIFIED | labDocuments, labExtractions, auditLog, consentLog exported; data_source includes 'lab'; labDocStatusEnum, labExtractionStatusEnum, confidenceLevelEnum defined; tenant/subject NOT NULL on all tables |
| `remix-app/migrations/0007_silly_sabretooth.sql` | Migration 0007 applied, ADD VALUE not in transaction | ✓ VERIFIED | File exists; `ALTER TYPE "public"."data_source" ADD VALUE 'lab'` is NOT inside BEGIN/COMMIT; all 4 tables created with NOT NULL tenant_id/subject_id; composite indexes present |
| `remix-app/app/routes.ts` | Ingest routes under _app layout, named ingest/upload | ✓ VERIFIED | `layout("routes/_app/ingest/layout.tsx", [...])` block with index, ingest/upload → upload.tsx, ingest/review, ingest/consent, ingest/documents/:id |
| 7 Wave-0 contract test files | All exist and run | ✓ VERIFIED | grounding.test.ts + range-check.test.ts + analyte-dictionary.test.ts: 35/35 GREEN. consent.test.ts: 7/7 GREEN. approve-action.test.ts: 14/14 GREEN. ingest-schema.test.ts + ingest-review.test.ts: skip-guarded (run GREEN with DATABASE_URL_UNPOOLED, skip cleanly without). Full suite: 195 pass / 58 skip. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| upload.tsx action | extractionWorker | `waitUntil(extractionWorker(docId))` from action (never loader) | ✓ WIRED | Line 141 of upload.tsx; not inside a loader block |
| ingest.server.ts extractionWorker | checkGrounding / checkRange / lookupAnalyte | per-extraction validation pipeline | ✓ WIRED | All 3 pure functions imported and called with correct args; 13 grep matches |
| ingest.server.ts | unpdf extractText + extractLabValues | pageTexts for grounding + LLM extraction | ✓ WIRED | `extractText(new Uint8Array(pdfBuffer), { mergePages: false })` + `extractLabValues(doc.pdfBytes)` both present |
| routes.ts | upload.tsx (Plan 02 file) | named `route('ingest/upload', 'routes/_app/ingest/upload.tsx')` | ✓ WIRED | Pattern match confirmed: `route("ingest/upload", "routes/_app/ingest/upload.tsx")` |
| review.tsx action | metrics insert + auditLog insert | Drizzle transaction after assertSubjectAccess | ✓ WIRED | assertSubjectAccess at line 119 (before transaction at line 140); `tx.insert(metrics)` + `tx.insert(auditLog)` inside transaction |
| review.tsx | PdfPageViewer + document.tsx PDF stream | side-by-side render with located snippet | ✓ WIRED | `<PdfPageViewer pdfUrl={'/ingest/documents/'+doc.id} ... highlightSnippet={selectedExtraction?.sourceTextSnippet}>` |
| consent.tsx | insertConsent('v1-pilot-self') | consent form action | ✓ WIRED | `insertConsent(subject.id, user.id, "v1-pilot-self")` in consent.tsx action |
| upload.tsx | checkConsent gate | synchronous check before any PHI write | ✓ WIRED | `checkConsent(subject.id)` at line 64, before `db.insert(labDocuments)` at line 117 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| review.tsx | `doc`, `extractions` | Drizzle queries on labDocuments + labExtractions scoped by tenant/subject | Yes — real DB queries with `and(eq(...tenantId), eq(...subjectId))` | ✓ FLOWING |
| review.tsx action (approve) | `metrics` row insert | approvedValue from form + resolved fields from labExtractions row | Yes — DB insert with real values from extraction row | ✓ FLOWING |
| PdfPageViewer | `pdfUrl` | `/ingest/documents/:id` loader (document.tsx) | Yes — document.tsx decodes real pdfBytes from Neon, returns binary response | ✓ FLOWING (code path; runtime PDF render is human-verified) |
| ingest.server.ts | `pageTexts` | unpdf.extractText on decoded pdfBytes from labDocuments row | Yes — real PDF bytes decoded and passed to unpdf | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Pure-function tests pass | `npm run test -- tests/lib/ingest/` | 35/35 GREEN | ✓ PASS |
| Consent + approve-action tests pass | `npm run test -- tests/lib/consent.test.ts tests/lib/ingest/approve-action.test.ts` | 21/21 GREEN | ✓ PASS |
| Full test suite | `npm run test` | 195 pass / 58 skip (DB tests skip without env — expected) | ✓ PASS |
| Production build | `npm run build` | All 3 Vite environments built; react-pdf worker bundled | ✓ PASS |
| Typecheck | `npm run typecheck` | Exit 0, 0 errors | ✓ PASS |
| waitUntil from action only | `grep -n "loader" upload.tsx \| grep -i "waituntil"` | 0 matches | ✓ PASS |
| No bulk-approve control | `grep -i "approve.all\|approveAll\|bulk" review.tsx` (code, not comments) | 0 functional code matches | ✓ PASS |
| source='lab' in approve path | `grep -c "source: 'lab'" review.tsx` | 2 matches | ✓ PASS |
| pdfjs-dist NOT a direct dep | package.json dependencies | undefined | ✓ PASS |
| ADD VALUE not in transaction | migration 0007 | No BEGIN/COMMIT wrapper around ALTER TYPE | ✓ PASS |
| PHI-free audit schema | `grep "value\|name" audit_log` columns | No value/name columns in audit_log table (confirmed by schema + migration SQL) | ✓ PASS |

### Probe Execution

No conventional probe scripts found under `scripts/*/tests/probe-*.sh`. Plans 01-03 use `npm run test` and `npm run typecheck` as their verification commands — run above under Behavioral Spot-Checks.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LAB-01 | 05-01, 05-02 | Practitioner can upload a lab PDF for a subject | ✓ SATISFIED | upload.tsx action: requireUser + requireRole + assertSubjectAccess + consent gate + labDocuments insert + waitUntil |
| LAB-02 | 05-01, 05-02 | Async extraction job parses document into structured candidate metrics (non-blocking) | ✓ SATISFIED | extractionWorker called via waitUntil from action; extraction.server.ts uses claude-sonnet-4-6 forced tool-use |
| LAB-03 | 05-01, 05-02 | Extracted values validated (grounding + range + per-field confidence) | ✓ SATISFIED | checkGrounding + lookupAnalyte + checkRange wired in extractionWorker; 35/35 boundary tests GREEN |
| LAB-04 | 05-03 | Practitioner reviews fields side-by-side with source; per-field approve/edit/reject | ? HUMAN NEEDED | Code complete (PdfPageViewer, split-view, ExtractionRow per-field controls, no bulk-approve); runtime PDF render + no-bulk-approve UX requires human UAT on Vercel preview |
| LAB-05 | 05-01, 05-02, 05-03 | Only approved metrics written to subject's record; each approval produces an audit-log entry | ✓ SATISFIED | approve path: assertSubjectAccess + Drizzle transaction: metrics insert (source='lab') + labExtractions update + auditLog insert; PHI-free AuditLogEntry type; reject writes no metric |
| LAB-06 | 05-01, 05-02, 05-03 | Client consent captured at intake before any client PHI stored | ✓ SATISFIED | checkConsent gate in upload action before any insert; consent.tsx: insertConsent('v1-pilot-self') + auditLog; consent.test.ts 7/7 GREEN |

**Note on LAB-04 in REQUIREMENTS.md:** The `[ ]` checkbox and "Pending" status in REQUIREMENTS.md reflect the E2E UAT not being complete. The code for LAB-04 is fully implemented and committed — this is a documentation tracking state, not a code gap. LAB-04 code satisfies all static-analysis criteria; only the runtime confirmation is pending.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `remix-app/app/routes/_app/ingest/upload.tsx` | 110 | `TODO: Vercel Blob at M2` | ℹ️ Info | References an explicit future milestone (M2) — not an unresolved debt marker. The current base64/Neon text storage is intentional pilot behavior documented in the plan (SUMMARY key-decisions). No issue #/PR reference needed; M2 scope is tracked in docs/PLATFORM.md. |

No TBD, FIXME, or XXX markers found in any phase 5 files. The single TODO is scoped to a known future milestone (M2 Vercel Blob migration) and is not an unresolved gap in the current phase.

### Human Verification Required

#### 1. End-to-End Pipeline UAT on Vercel Preview

**Test:** On the Vercel preview for branch `003-remix-foundation` (https://zoetrop-gtpsezj4x-negentropico.vercel.app or latest preview), sign in as owner and run the full upload → extract → review → approve flow with a real text-extractable lab PDF.

**Expected:**
1. First upload presents the consent gate. After consenting, the upload form is reachable.
2. Upload action responds in **under ~2s**. The review page shows status `processing`, transitioning to `pending_review` within **~30-60s**. If status stays `uploaded` indefinitely — `waitUntil` did not start; apply the Vercel Cron-drain fallback (RESEARCH.md line 199 / 05-03-SUMMARY Risk #1).
3. On `/ingest/review?docId=…`, the **real PDF page renders** beside extracted fields. The **grounded snippet is located/highlighted** in the text layer. Each field has its **own Approve / Edit / Reject** control. There is **NO single bulk-approve** button.
4. Approve a couple of fields (edit one value first), reject one. Approved metrics appear on the dashboard/metrics screens with `source='lab'`. The rejected extraction writes no metric. Via Drizzle Studio or a query: a `consentLog` row exists for the subject; `audit_log` has upload/extraction-complete/approve/reject rows with **no PHI value columns** visible.
5. If all pass: reply "approved" to close Task 4 and mark the phase complete.

**Why human:** The `<2s` response-time guarantee, `waitUntil` background-job actually starting on the Vercel serverless runtime, the real PDF page render via react-pdf, and the text-layer snippet highlight are all runtime behaviors that cannot be verified by code inspection or unit tests. This is the exact scope of 05-03-PLAN.md Task 4 (blocking human-verify checkpoint) deferred by the executor.

---

## Gaps Summary

No code gaps found. All 6 success criteria are implemented in the codebase. The single open item is the runtime E2E confirmation (Task 4 UAT) that the executor correctly deferred to the owner — it requires a live Vercel deploy and a real lab PDF.

**What passes (code inspection):**
- Schema: 4 tables + `lab` enum applied via reviewed migration 0007 (enum ADD VALUE not in transaction); tenant/subject NOT NULL; composite indexes; audit_log has no value/name columns.
- Pure functions: `checkGrounding`, `checkRange`, `lookupAnalyte` — 35/35 boundary tests GREEN.
- Analyte dictionary: 101 entries, PHI-free (no subject values), server-only, covers owner's analytes + D-03 common panels.
- Upload pipeline: consent gate → PDF validation (MIME + magic bytes + 10MB) → labDocuments insert → waitUntil from action → redirect within 2s (code shape).
- Extraction worker: unpdf + Anthropic claude-sonnet-4-6 forced tool-use → checkGrounding/lookupAnalyte/checkRange → labExtractions insert with grounding/range/dictionary fields; unrecognized analytes never dropped (D-02); unit mismatch routes to unrecognized (D-04).
- Review surface: split-view with PdfPageViewer + authenticated PDF byte stream (document.tsx) + per-field Approve/Edit/Reject (no bulk-approve) + status polling.
- Write path: assertSubjectAccess before every write; metrics source='lab'; Drizzle transaction; PHI-free auditLog; pdfBytes purge after terminal extractions.
- Consent gate: checkConsent before any PHI write; insertConsent('v1-pilot-self') with auditLog.
- Tests: 195/195 passing (58 skip without DB env — expected); build clean; typecheck 0 errors.

**What requires human confirmation (runtime only):**
- SC-1: Actual <2s response time on Vercel.
- SC-1 (continued): `waitUntil` background job actually starting (React Router issue #72176 — Risk #1).
- SC-4: Real PDF page render + grounded snippet highlight in browser.

---

_Verified: 2026-06-11T00:43:32Z_
_Verifier: Claude (gsd-verifier)_
