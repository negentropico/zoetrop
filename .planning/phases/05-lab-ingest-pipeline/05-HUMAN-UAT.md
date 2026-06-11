---
status: partial
phase: 05-lab-ingest-pipeline
source: [05-VERIFICATION.md, 05-03-SUMMARY.md]
started: "2026-06-11T00:46:49Z"
updated: "2026-06-11T00:46:49Z"
---

## Current Test

[awaiting human testing — end-to-end UAT on Vercel preview]

## Context

All 6 Phase 5 success criteria are implemented and committed; 5/6 are verified by code
inspection (see 05-VERIFICATION.md). The remaining confirmations are runtime-only behaviors
that only a real Vercel deploy can prove. Infra is ready:

- Preview (git-linked, SSO-protected): https://zoetrop-gtpsezj4x-negentropico.vercel.app
- `ANTHROPIC_API_KEY` set in Vercel Preview + Production
- GitHub connected (negentropico/zoetrop, rootDirectory=remix-app, production branch main)

## Tests

### 1. Upload returns <2s and async extraction starts (SC-1, SC-2 runtime)
expected: Signed in as owner, first upload at `/ingest/upload` redirects to consent; after consent, uploading a real text-extractable lab PDF returns in <2s with `labDocuments.status='uploaded'`, then `status` transitions `processing → pending_review` within ~30–60s (confirms `waitUntil` background job starts on Vercel — Risk #1 / React Router #72176). If status stays `uploaded`, `waitUntil` did not start → apply the Vercel Cron-drain fallback (RESEARCH.md line 199).
result: [pending]

### 2. Review surface renders real PDF + located snippet, per-field only (SC-4 runtime)
expected: `/ingest/review` renders the real source PDF page beside the extracted fields with the grounded `sourceTextSnippet` located/highlighted; each field has its own Approve / Edit / Reject; there is NO single bulk-approve control.
result: [pending]

### 3. Approved-only writes with source='lab' + audit/consent rows (SC-5, SC-6 runtime)
expected: Approving a couple of fields (edit one value first) and rejecting one results in: approved metrics appearing with `source='lab'` on the dashboard/metrics screens; the rejected extraction writing no metric; a `consentLog` row for the subject; and `audit_log` rows (upload, extraction-complete, approve, reject) with NO clinical value/name columns.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
