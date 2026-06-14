# Requirements: Zoetrop v1.1 — First Client (practitioner-operated)

**Milestone goal:** The owner, acting as practitioner, onboards **one real client end-to-end** with the tools actually used in practice — create the client, ingest PureInsight genetics + WHOOP + labs (all practitioner-entered, in-app upload), curate the engine library as needed, and produce a report + protocol. Single real client, practitioner does all data entry, no client self-service. Sharpen the instrument on real data before the multi-client inversion (v1.2).

> Builds on v1.0 — M1 Foundations. The heavy multi-client operations (scale, self-service, switcher UX, cadence, Apple Watch/Oura, compliance gate) are parked in `v1.2-OPERATIONS-PLAN.md`.
>
> **Explicitly skipped in v1.1** (per scoping 2026-06-14): Google Drive doc storage/import; PureInsight API (manual portal + report import instead); Apple Watch + Oura (WHOOP only); client self-service.

## v1 Requirements

### Client Onboarding (practitioner-operated)

- [ ] **ONB-01**: A practitioner can create a client (subject) record with intake basics
- [ ] **ONB-02**: A practitioner can invite/provision a client account linked to that subject (reusing the existing per-invite role-scoped tokens)
- [ ] **ONB-03**: A practitioner can select the active subject (owner or the client) and all PHI surfaces — ingest, report, protocol — scope to it (minimal context for 2 subjects; the at-scale switcher is v1.2)
- [ ] **ONB-04**: An onboarding surface tracks each client's required inputs (genetics, labs, WHOOP) as a practitioner checklist/status

### Data Ingest (single real subject, practitioner-entered)

- [ ] **ING-01**: A practitioner can upload a PureInsight (or SelfDecode) DNA report and have it parsed → reviewed → approved into the subject's `geneticVariants` (lab-ingest pattern; no PureInsight API)
- [ ] **ING-02**: A practitioner can import WHOOP data → subject-scoped metrics with dedup (collection-date, Phase-5 ingest patterns)
- [ ] **ING-03**: A practitioner can manually enter a metric value for a subject (the escape hatch when there is no document)

### Per-Client Protocol

- [ ] **PRO-01**: A practitioner can author and edit a protocol version for the client from their report (the per-subject `protocol_versions` lineage write path), with supplement assignment and change history

### Library / Corpus Curation

- [ ] **LIB-01**: A practitioner can curate the SNP library (`geneticVariants`): list / create / edit / version / moderate, with K1–K4 evidence-tier authoring
- [ ] **LIB-02**: A practitioner can curate supplement stacks (the supplement library)
- [ ] **LIB-03**: A practitioner can curate protocol rules — the variant→protocol (`variantProtocolMap`) and metric→protocol (`metricProtocolMap`) mappings the engine applies

### Proof & Polish

- [ ] **PROOF-01**: A practitioner onboards one real client end-to-end — create → genetics + labs + WHOOP ingested → report generated → protocol authored — with no manual DB intervention (the v1.1 exit)
- [ ] **POL-01**: Tools / workflows / interactions / visuals are tuned from the real run — the deferred design round-3/4/5 items, import-honesty gaps, and the two Phase-7 security warnings (WR-02 open-redirect in `consent.tsx`, WR-03 BYPASSRLS `pdfBytes` read in `document.tsx`)

## Carried-Forward Verification & Tech Debt

- **Phase 03.1 residual UAT** (gets real traffic in ONB-02/03): invite-redemption end-to-end in a private window; client-role 403 with a real client account.
- **Phase-7 review warnings:** WR-01 audit-log `?? 'owner'` role fallback; WR-02/WR-03 (security — folded into POL-01); CR-01 `assignSubject` 23505 idempotency dead code (`/gsd:code-review`).

## Future Requirements (deferred → v1.2+)

See `v1.2-OPERATIONS-PLAN.md`: multi-client at scale, client self-service, subject-switcher UX, cadence/monitoring, Apple Watch + Oura ingest, Google Drive doc storage, PureInsight API, the compliance envelope & host gate (COMP-02/03).

## Out of Scope (M2/M3 — over-build guard)

- **M2 client-facing app** beyond a possible minimal read-only report view; **delivery-surface modules** (Training/Nutrition/Modalities); **CRM/scheduling/billing parity**; **M3 multi-coach + productization** — held firm.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONB-01 | Phase 1 — Client Onboarding | Pending |
| ONB-02 | Phase 1 — Client Onboarding | Pending |
| ONB-03 | Phase 1 — Client Onboarding | Pending |
| ONB-04 | Phase 1 — Client Onboarding | Pending |
| ING-01 | Phase 2 — Data Ingest | Pending |
| ING-02 | Phase 2 — Data Ingest | Pending |
| ING-03 | Phase 2 — Data Ingest | Pending |
| PRO-01 | Phase 4 — Per-Client Protocol Authoring | Pending |
| LIB-01 | Phase 3 — Library / Corpus Curation | Pending |
| LIB-02 | Phase 3 — Library / Corpus Curation | Pending |
| LIB-03 | Phase 3 — Library / Corpus Curation | Pending |
| PROOF-01 | Phase 5 — First-Client Proof + Polish | Pending |
| POL-01 | Phase 5 — First-Client Proof + Polish | Pending |

---
*Requirements defined: 2026-06-14 — v1.1 First Client (practitioner-operated). ONB / ING / PRO / LIB + PROOF/POL. Recut from the multi-client "M1 Operations" plan (now parked as v1.2) to prove the practice loop on one real client first, with WHOOP + PureInsight (manual) lead, no Drive/API.*
*Traceability filled: 2026-06-14 — 5-phase roadmap (Phase 1: ONB-01..04 / Phase 2: ING-01..03 / Phase 3: LIB-01..03 / Phase 4: PRO-01 / Phase 5: PROOF-01, POL-01). 12/12 requirements mapped.*
