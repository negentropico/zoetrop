---
phase: 5
slug: lab-ingest-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `05-RESEARCH.md` §"Validation Architecture". The three pure
> functions (grounding check, range check, analyte-dictionary lookup) are the
> testable engine of the pipeline — write them as Wave 0 RED contracts first.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (existing harness from Phase 1) |
| **Config file** | `remix-app/vite.config.ts` (existing test block) |
| **Quick run command** | `npm run test` (from `remix-app/`) |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10–20s (DB/parity tests skip without `DATABASE_URL`) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test` (fast — DB tests skip without env var)
- **After every plan wave:** Run `npm run test` full suite + manual UAT of the upload→review flow in the browser
- **Before `/gsd:verify-work`:** Full suite green + manual UAT of the complete upload→extract→review→approve flow
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

> Plans/executor complete the `Task ID` + `Status` columns. The requirement →
> test-file mapping below is locked from research; every LAB-0x criterion has a
> home before any task is written.

| Plan | Wave | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|------|------|-------------|----------|-----------|-------------------|-------------|--------|
| 01 | 0 | LAB-03 (grounding) | `checkGrounding` → `grounded` when snippet ⊂ page text; `low_confidence` when not | unit | `vitest run tests/lib/ingest/grounding.test.ts` | ❌ W0 | ⬜ pending |
| 01 | 0 | LAB-03 (range) | `checkRange` returns correct `RangeFlag` at/below min, at/above max, null bounds | unit | `vitest run tests/lib/ingest/range-check.test.ts` | ❌ W0 | ⬜ pending |
| 01 | 0 | LAB-03 (dictionary) | `lookupAnalyte` → entry for known keys, null for unknown, handles normalization | unit | `vitest run tests/lib/ingest/analyte-dictionary.test.ts` | ❌ W0 | ⬜ pending |
| 01 | 0 | LAB-06 | Consent gate blocks upload action when `consentLog` row absent | unit (mock DB) | `vitest run tests/lib/consent.test.ts` | ❌ W0 | ⬜ pending |
| 01 | 0 | LAB-05 | `assertSubjectAccess` called before any write (403 for client role) — closes CR-01 write-path (D-15) | unit (mock) | `vitest run tests/lib/ingest/approve-action.test.ts` | ❌ W0 | ⬜ pending |
| 01 | 0 | LAB-01 / LAB-05 / LAB-06 | DB schema constraints: tenant/subject scope on the 4 new tables; `source:'lab'` metric insert; `auditLog` row with no PHI value columns; `consentLog` precondition | integration (skip-guarded) | `vitest run tests/db/ingest-schema.test.ts` | ❌ W0 | ⬜ pending |
| 01 | 0 | LAB-04 | Review loader returns `labExtractions` for a `docId` scoped to tenant/subject | integration (skip-guarded) | `vitest run tests/parity/ingest-review.test.ts` | ❌ W0 | ⬜ pending |
| — | — | LAB-02 | `extractionWorker` populates `labExtractions` with `sourceTextSnippet`; ungrounded → `confidence='low'` | integration (skip-guarded; live Neon + `ANTHROPIC_API_KEY`) | `vitest run tests/db/ingest-schema.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/ingest/grounding.test.ts` — LAB-03 grounding pure function (verbatim-substring exactness)
- [ ] `tests/lib/ingest/range-check.test.ts` — LAB-03 physiological-range check pure function (boundary cases)
- [ ] `tests/lib/ingest/analyte-dictionary.test.ts` — LAB-03 dictionary lookup + name normalization
- [ ] `tests/lib/consent.test.ts` — LAB-06 consent-gate logic (block write when no `consentLog`)
- [ ] `tests/lib/ingest/approve-action.test.ts` — LAB-05 `assertSubjectAccess` enforcement (D-15, CR-01 write-path)
- [ ] `tests/db/ingest-schema.test.ts` — LAB-01/05/06 DB schema + constraints (skip-guarded on `DATABASE_URL_UNPOOLED || DATABASE_URL`)
- [ ] `tests/parity/ingest-review.test.ts` — LAB-04 review loader tenant/subject scoping (skip-guarded)

**Skip-guard pattern (project convention — export vars, do not `source .env`; connection strings contain `&`):**
```typescript
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const skip = !connectionString ? describe.skip : describe;
skip('ingest DB tests (live Neon)', () => { /* ... */ });
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Upload returns `processing` within 2s and `labDocuments.status` transitions `uploaded`→`processing` (the `waitUntil` job actually starts in React Router — the highest-risk unknown) | LAB-01 / LAB-02 | Async background-function timing on live Vercel; documented React Router `waitUntil` issue #72176 needs real-deploy confirmation | Deploy to Vercel preview; upload a sample lab PDF; confirm action responds <2s and status reaches `processing` within ~5s, then `pending_review` after extraction |
| Review UI renders the real PDF page beside extracted fields with the grounded snippet located/highlighted; no bulk-approve path bypasses field-level review | LAB-04 | Visual/interaction fidelity (real PDF page render via react-pdf) can't be asserted in unit tests | Open `/ingest/review` for a processed doc; confirm PDF page renders, snippet is locatable, and approve/edit/reject is per-field only |
| End-to-end: owner uploads own lab → reviews → approves → metric appears in the dashboard with `source:'lab'`; consent gate fires on first upload | LAB-01..06 | Full pipeline integration across async + LLM + DB + UI | Run the complete flow on preview against owner's real lab PDF; verify metric round-trips and `auditLog`/`consentLog` rows exist |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 tests land RED)

**Approval:** pending
