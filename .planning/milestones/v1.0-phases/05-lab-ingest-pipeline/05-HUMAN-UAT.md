---
status: passed
phase: 05-lab-ingest-pipeline
source: [05-VERIFICATION.md, 05-03-SUMMARY.md]
started: "2026-06-11T00:46:49Z"
updated: "2026-06-11T02:30:00Z"
---

## Current Test

[complete — owner ran the full E2E on the Vercel preview; all behaviors confirmed]

## Context

Owner-run end-to-end UAT on the git-linked Vercel preview
(zoetrop-git-003-remix-foundation-negentropico.vercel.app, SSO-protected).
Several runtime defects surfaced during UAT and were fixed before sign-off:
- DOMMatrix SSR crash (react-pdf in the server bundle) → fixed by client-only
  dynamic import of PdfPageViewer (commit 06582cb).
- Vercel multi-bundle `.data` 404 on the hydrated consent submit → fixed by
  collapsing to a single function bundle (commit ff3255c).
- Multi-page PDF could not be navigated → added page nav (commit 5b53c67).
- Approved metrics were dated to approval-time with no dedup → added
  specimen-collection-date extraction + dedup (migration 0008; commits
  fd5ca8c/0c210bb/fe9a24f/dee0625/a331f87).

## Tests

### 1. Upload <2s + async extraction starts (SC-1, SC-2 runtime)
expected: upload returns fast, status processing → pending_review; waitUntil job runs on Vercel
result: PASS — document uploaded, values extracted, review populated; no stuck 'uploaded' state.

### 2. Review surface renders real PDF + located snippet, per-field only, multi-page (SC-4 runtime)
expected: real PDF page beside fields, snippet highlighted, per-field Approve/Edit/Reject, no bulk control, navigable pages
result: PASS — selecting a metric highlights its snippet on the page; per-field controls; page nav (Prev/Next/Jump) added and verified on a multi-page PDF.

### 3. Approved-only writes with correct date + dedup + audit/consent (SC-5, SC-6 runtime)
expected: approved metrics written source='lab' dated to the lab collection date, no duplicates, consent + PHI-free audit rows
result: PASS — iron panel written with collection date 2025-05-03 (not approval time); re-uploading the same PDF produced NO duplicate (dedup by subject+analyte+day); metrics pages read from DB so values surface. Reject path not manually exercised but unit-tested (approve-action.test.ts 18/18).

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None outstanding. All UAT-surfaced defects fixed and re-verified. (Follow-up note:
the legacy hardcoded real-data.ts is superseded by DB-backed metrics on these
pages; engine promotion of that data is Phase 6 scope.)
