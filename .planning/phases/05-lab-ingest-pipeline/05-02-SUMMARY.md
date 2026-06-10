---
phase: 05-lab-ingest-pipeline
plan: 02
subsystem: lab-ingest
tags: [anthropic-sdk, unpdf, vercel-functions, consent-gate, audit-log, extraction-pipeline, waitUntil]

# Dependency graph
requires:
  - phase: 05-01
    provides: "4 ingest tables (labDocuments, labExtractions, auditLog, consentLog), 3 pure validation functions (checkGrounding, checkRange, lookupAnalyte), 101-entry analyte dictionary"
  - phase: 03-identity-tenancy-scoping
    provides: "requireUser, requireRole, assertSubjectAccess authz helpers + tenant/subject FK enforcement"
  - phase: 04-static-to-db
    provides: "getDb(), getOwnerSubject() data access layer"
provides:
  - "consent gate: checkConsent(subjectId) + insertConsent(subjectId, userId, version) — LAB-06 / D-08"
  - "audit logger: insertAuditLog(entry) — PHI-free lifecycle logging (D-13)"
  - "Anthropic extraction client: extractLabValues(pdfBase64) — claude-sonnet-4-6 forced tool-use (LAB-02)"
  - "background orchestrator: extractionWorker(labDocumentId) — unpdf + LLM + 3 pure validators + DB writes"
  - "upload action: POST /ingest/upload — consent gate + PDF validation + waitUntil + 2s return (LAB-01)"
  - "ingest section routes registered: /ingest/upload, /ingest/review (stub), /ingest/consent (stub)"
affects: [05-03-review-ui, 06-report-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() mock pattern for DB mocking in Vitest (needed when vi.mock factory references variables)"
    - "waitUntil from @vercel/functions in action (never loader) — React Router #72176 workaround"
    - "Anthropic tool-use with tool_choice:{type:'any'} for guaranteed structured extraction output"
    - "Base64 PDF storage in Neon text column (pilot); TODO: Vercel Blob at M2"

key-files:
  created:
    - "remix-app/app/lib/consent.server.ts"
    - "remix-app/app/lib/audit.server.ts"
    - "remix-app/app/lib/ingest/extraction.server.ts"
    - "remix-app/app/lib/ingest/ingest.server.ts"
    - "remix-app/app/routes/_app/ingest/upload.tsx"
    - "remix-app/app/routes/_app/ingest/layout.tsx"
    - "remix-app/app/routes/_app/ingest/review.tsx (stub)"
    - "remix-app/app/routes/_app/ingest/consent.tsx (stub)"
  modified:
    - "remix-app/tests/lib/consent.test.ts (was RED Wave-0 placeholder — now 7 real assertions GREEN)"
    - "remix-app/app/routes.ts (added ingest route block)"

key-decisions:
  - "Ingest routes registered in Plan 02 (not Plan 03) to enable react-router typegen for upload.tsx +types — review.tsx and consent.tsx are stubs for Plan 03 to expand"
  - "vi.hoisted() mock pattern required for Vitest DB mocking — vi.mock factory is hoisted, variable declarations are not; hoisted() bridges the gap"
  - "resolvedCategory stored as dictEntry.category (MetricCategory enum value) directly — no string cast needed since AnalyteEntry.category is typed as MetricCategory"

# Metrics
duration: ~6 min
completed: 2026-06-10
---

# Phase 5 Plan 02: Extraction Pipeline Summary

**Server-side lab ingest pipeline: consent gate (consent.server.ts), PHI-free audit logger (audit.server.ts), Anthropic claude-sonnet-4-6 forced-tool-use extraction client (extraction.server.ts), background orchestrator (ingest.server.ts: unpdf → LLM → grounding/range/dictionary validation → labExtractions writes), and the /ingest/upload action with waitUntil + consent gate + PDF validation that commits within 2s.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-10T22:48:43Z
- **Completed:** 2026-06-10T~22:54Z
- **Tasks:** 3
- **Files modified:** 9 created + 2 modified

## Accomplishments

- **Consent gate (LAB-06/D-08):** `checkConsent(subjectId)` → DB-mocked false when no consentLog row; `insertConsent` writes row with `consentedAt`. Previously-RED `consent.test.ts` (7 Wave-0 placeholder assertions) now 7 real GREEN assertions using vi.hoisted() mock pattern.
- **PHI-free audit logger (D-13):** `AuditLogEntry` type has no clinical value/name fields — only IDs, role, action, tableName, operation, tenantId, subjectId, entityId. `insertAuditLog` inserts with server-generated timestamp.
- **Anthropic extraction client (LAB-02):** `extractLabValues(pdfBase64)` uses `claude-sonnet-4-6` with strict `extract_lab_values` tool schema (`additionalProperties:false`, all 5 fields required), `tool_choice:{type:'any'}` forcing structured output. SYSTEM_PROMPT never executes extracted text (T-05-LLM). Phase 7 LLM-BAA boundary documented in docblock (D-14).
- **Background orchestrator (LAB-02/03):** `extractionWorker(labDocumentId)` imports the 3 Plan-01 pure functions. Pipeline: UPDATE processing → unpdf extractText (mergePages:false for page boundaries) → extractLabValues → per-extraction checkGrounding/lookupAnalyte/checkRange → INSERT labExtractions → UPDATE pending_review + auditLog. D-02: unrecognized analytes inserted (never dropped). D-04: unit mismatch → unrecognized path. Error path: sets status='failed' + errorMessage server-side only (V7, no stack to client).
- **Upload action (LAB-01):** T-05-AUTHZ: requireUser → requireRole → assertSubjectAccess. T-05-CONSENT: checkConsent before any PHI write. T-05-UP: application/pdf MIME check + `%PDF` magic bytes (0x25 0x50 0x44 0x46) + 10MB size limit. Inserts labDocuments synchronously, calls `waitUntil(extractionWorker(docId))` from action (never loader — React Router #72176), returns redirect within 2s.
- **Route registration:** ingest layout + upload/review(stub)/consent(stub) routes registered in routes.ts; react-router typegen produces +types for upload.tsx.

## Task Commits

1. **Task 1: Consent gate + audit logger** — `7cdcf15` (feat)
2. **Task 2: Anthropic extraction client** — `89e36ab` (feat)
3. **Task 3: extractionWorker + upload action + route registration** — `0fddf14` (feat)

## Files Created/Modified

- `remix-app/app/lib/consent.server.ts` — `checkConsent(subjectId)` + `insertConsent(subjectId, userId, version)`
- `remix-app/app/lib/audit.server.ts` — `AuditLogEntry` type (no PHI) + `insertAuditLog(entry)`
- `remix-app/app/lib/ingest/extraction.server.ts` — `extractLabValues(pdfBase64)` via claude-sonnet-4-6 tool-use
- `remix-app/app/lib/ingest/ingest.server.ts` — `extractionWorker(labDocumentId)` background orchestrator
- `remix-app/app/routes/_app/ingest/upload.tsx` — LAB-01 upload action + maxDuration:120 + Dropzone UI
- `remix-app/app/routes/_app/ingest/layout.tsx` — section nav (Upload/Review tabs)
- `remix-app/app/routes/_app/ingest/review.tsx` — stub for Plan 03
- `remix-app/app/routes/_app/ingest/consent.tsx` — stub for Plan 03
- `remix-app/tests/lib/consent.test.ts` — 7 RED placeholders replaced with real GREEN assertions (vi.hoisted pattern)
- `remix-app/app/routes.ts` — ingest route block added

## Decisions Made

- **Route registration in Plan 02 (not 03):** `react-router typegen` requires routes to be registered before it generates `+types/upload`. Since upload.tsx needs `Route.ActionArgs`/`Route.MetaArgs`, the ingest block was registered now (Rule 3 — blocking). Plan 03 expands the review/consent stubs.
- **vi.hoisted() for DB mocking:** Vitest's `vi.mock()` factory is hoisted above variable declarations by the transform. Variables declared in the test file body are not available at hoist time. `vi.hoisted()` creates mock state before hoisting, making it available to the factory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered ingest routes in routes.ts to unblock typecheck**
- **Found during:** Task 3 (typecheck step)
- **Issue:** `upload.tsx` imports `Route` from `./+types/upload` which is generated by `react-router typegen`. typegen only generates types for registered routes. Without the route block in `routes.ts`, typecheck failed with `Cannot find module './+types/upload'`.
- **Fix:** Added the `layout("routes/_app/ingest/layout.tsx", [...])` block to `routes.ts`. Created `layout.tsx` and minimal stubs for `review.tsx` / `consent.tsx` so the layout block is complete.
- **Files modified:** `remix-app/app/routes.ts`, `remix-app/app/routes/_app/ingest/layout.tsx`, `remix-app/app/routes/_app/ingest/review.tsx`, `remix-app/app/routes/_app/ingest/consent.tsx`
- **Impact:** Plan 03 builds on these stubs rather than creating the files from scratch. No scope creep — the plan already listed these files as Plan 03 deliverables.
- **Committed in:** `0fddf14`

**2. [Rule 3 - Blocking] Fixed ../../../db/schema import path in upload.tsx**
- **Found during:** Task 3 (typecheck step)
- **Issue:** Initial import of `labDocuments` used `../../../db/schema` (3 levels up from `app/routes/_app/ingest/`), but `db/schema.ts` is 4 levels up.
- **Fix:** Changed to `../../../../db/schema`.
- **Files modified:** `remix-app/app/routes/_app/ingest/upload.tsx`
- **Committed in:** `0fddf14` (before final commit)

## Validation Results

- **consent.test.ts:** 7/7 GREEN (was RED/placeholder in Plan 01) — vi.hoisted mock pattern
- **Full test suite:** 188/188 pass, 58 skip (DB/parity skip without env — expected)
- **Typecheck:** clean (0 errors)
- **Manual UAT:** deferred to phase gate per 05-VALIDATION.md — deploy to Vercel preview, upload a sample lab PDF, confirm action responds <2s and labDocuments.status reaches 'processing' within ~5s then 'pending_review'

## Known Stubs

- `remix-app/app/routes/_app/ingest/review.tsx` — stub (Plan 03 builds full review UI: PDF side-by-side, per-field approve/edit/reject, PdfPageViewer component)
- `remix-app/app/routes/_app/ingest/consent.tsx` — stub (Plan 03 builds consent form + insertConsent action)

## Threat Flags

No new threat surface beyond the plan's threat model. All STRIDE mitigations from the plan are implemented:
- T-05-UP: MIME + magic bytes + 10MB enforced in upload action before any write
- T-05-CONSENT: checkConsent called synchronously before any PHI insert
- T-05-AUTHZ: requireUser → requireRole → assertSubjectAccess on upload path
- T-05-LLM: tool-schema-constrained output, prompt never executes extracted text
- T-05-AUDIT: AuditLogEntry has no PHI value/name fields (D-13)
- T-05-ERR: errorMessage stored server-side only, no stack to client (V7)

## Self-Check: PASSED
