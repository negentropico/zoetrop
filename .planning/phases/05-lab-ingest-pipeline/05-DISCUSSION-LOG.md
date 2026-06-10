# Phase 5: Lab Ingest Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 05-lab-ingest-pipeline
**Areas discussed:** Metric reconciliation, Document scope + source view, Consent model (pilot), Async mechanism + UX, Dictionary scope, Audit scope

---

## Metric Reconciliation

| Option | Description | Selected |
|--------|-------------|----------|
| Dictionary + practitioner fallback | Curated lab-analyte→metric dictionary supplies category/subcategory/unit/ranges; LLM maps to a dictionary key; unrecognized analytes surface in review for the practitioner to assign or skip — never silently dropped | ✓ |
| LLM proposes, practitioner confirms | LLM proposes category/subcategory/ranges per value; practitioner edits at review | |
| Dictionary-only, drop unknowns | Only ingest analytes in the dictionary; unrecognized lines ignored | |

**User's choice:** Dictionary + practitioner fallback
**Notes:** Keeps the taxonomy authoritative and keeps the LLM as a mapper/reader (low clinical risk) rather than letting it invent reference ranges.

---

## Document Scope + Source View

| Option | Description | Selected |
|--------|-------------|----------|
| Text PDFs + rendered page view | Text-extractable PDFs only for pilot; review renders the PDF page beside fields with grounded snippet highlighted; scanned/vision deferred | ✓ |
| Text + scanned (vision) now | Also accept scanned/photo labs via Claude vision from day one | |
| Text-only, snippet view (no page render) | Extract text, show only the grounded snippet; skip embedding the PDF page | |

**User's choice:** Text PDFs + rendered page view
**Notes:** Verbatim sourceTextSnippet requires text-extractable input; user wants the real PDF page on screen for verification fidelity.

---

## Consent Model (Pilot)

| Option | Description | Selected |
|--------|-------------|----------|
| Self-consent at first upload | Author consentVersion now; self-consent gate at first upload; consentLog blocks writes without it | ✓ |
| Consent at subject creation | Capture consent at subject creation (intake); owner-subject already exists → needs backfill | |
| Pre-seed owner, build UI for clients later | Seed a consentLog row for the owner; build the real UI when the first client lands | |

**User's choice:** Self-consent at first upload
**Notes:** Point is to exercise the real gate end-to-end on the owner before any external client hits it.

---

## Async Mechanism + Processing UX

| Option | Description | Selected |
|--------|-------------|----------|
| DB-status + Vercel background + poll | labDocuments(status='uploaded') in <2s; extraction via Vercel background function (waitUntil/fluid compute); review/list polls status badges | ✓ |
| Managed queue (Inngest / QStash) | Durable queue with retries/observability; adds a vendor | |
| Vercel Cron drains a job table | Upload enqueues a row; cron worker processes every minute (~60s latency) | |

**User's choice:** DB-status + Vercel background + poll
**Notes:** No new infra/vendor for an n=1 pilot; satisfies the 2s non-blocking return. Cron-drain noted as the fallback if background execution proves unreliable.

---

## Dictionary Scope (v1)

| Option | Description | Selected |
|--------|-------------|----------|
| Owner's panels + common panels | Seed from owner's M0 analytes + standard common panels (CBC, CMP, lipids, thyroid, vitamins/minerals, hs-CRP/homocysteine) | ✓ |
| Owner's existing metrics only | Seed only analytes already in M0 data | |
| Broad standard reference set | Comprehensive hundreds-of-analyte reference set up front | |

**User's choice:** Owner's panels + common panels
**Notes:** Owner's real labs round-trip cleanly, with headroom for the realistic pilot input; avoids a large curation burden now.

---

## Audit Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Key lifecycle events | Log upload, extraction-complete, approve/reject, and metric-insert; no PHI values | ✓ |
| Metric inserts only (SC minimum) | Log only the criterion-5-mandated metric insert | |

**User's choice:** Key lifecycle events
**Notes:** Cheap on a greenfield audit table; gives real provenance across the review trail.

---

## Claude's Discretion

- Dictionary storage (TS module vs DB table) — planner's call (non-PHI reference data).
- Duplicate-upload / re-extraction / already-exists-for-date handling — sensible default (allow; no dedupe for pilot).
- Browser PDF page rendering approach (pdf.js / embed / page-image) — planner, against Phase 4.1 UI-SPEC.md.
- Whether to add a `lab` value to `dataSourceEnum` vs reuse `bloodwork` — researcher/planner to confirm.

## Locked from project context (not re-asked)

- LLM = Anthropic Claude, standard subscription API, no-training; external-client PHI extraction gated to Phase 7 LLM BAA.
- Write-side `assertSubjectAccess` enforcement on the approve→insert path (closes write-path slice of CR-01).

## Deferred Ideas

- Scanned/photo (image-only) lab ingest via vision/OCR — later slice.
- Managed durable queue (Inngest/QStash) — reconsider at multi-client scale.
- Comprehensive hundreds-of-analyte reference dictionary — deferred curation burden.
- External-client PHI extraction — hard Phase 7 compliance gate (not a build deferral).
