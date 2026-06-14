# Requirements: Zoetrop v1.1 — M1 Operations

**Milestone goal:** Invert the single-owner foundation into a practitioner-operated product — one coach onboards and runs one real client end-to-end (intake → customized protocol → tracking → 4-week iteration). This is the true M1 exit.

> Builds on v1.0 — M1 Foundations (auth + roles, tenant/subject RLS isolation, live data layer, lab ingest, engine + reports). The v1.0 platform scopes everything to a hardwired owner subject; v1.1's spine is "subjects become real." See `milestones/v1.0-REQUIREMENTS.md` for the shipped foundation.

## v1 Requirements

### Subject Lifecycle

- [ ] **OPS-01**: A practitioner can create and manage a subject (client) record — create with intake basics, edit, and archive/deactivate
- [ ] **OPS-02**: Redeeming a client invite creates (or links to) a `subjects` row, so a client account is never orphaned from a subject
- [ ] **OPS-03**: A practitioner can select/switch the active subject, and every PHI surface (all 13 loaders + ingest + reports) scopes to the selected subject (replacing the hardwired `getOwnerSubject`); practitioner→subject assignments (AUTH-03) now carry real traffic

### Client Data Entry

- [ ] **OPS-04**: A practitioner can enter a subject's genetic variants — by manual entry and/or by uploading a DNA report through the ingest pipeline
- [ ] **OPS-05**: A practitioner can manually enter a metric value for a subject (the escape hatch when there is no lab PDF)

### Protocol Authoring & Cadence

- [ ] **OPS-06**: A practitioner can author and edit a protocol version for a subject (the per-subject `protocol_versions` lineage write path), with per-client supplement assignment and change history
- [ ] **OPS-07**: The system surfaces cadence state — which clients are review-due, and a "new version per 4-week cycle" flow + a practitioner monitoring view

### Instrument Continuity

- [ ] **OPS-08**: WHOOP import persists subject-scoped metrics with dedup (specimen/collection-date + dedup, using the Phase-5 ingest patterns) — the owner's living instrument flows again, per-subject

### Proof Slice

- [ ] **OPS-09**: A practitioner can run one client end-to-end — invite → intake/consent → labs uploaded → genotype entered → report generated → protocol v1 authored → 4-week iteration simulated — with cross-subject isolation extended to n≥2 real subjects

### Compliance (carried from v1.0 — the release gate)

- [ ] **COMP-02**: PHI infrastructure is BAA-covered (the chosen DB host, Vercel, and the LLM provider) before any external client's PHI is written — host decided via cost/BAA comparison (+ possible migration)
- [ ] **COMP-03**: PHI access is audit-logged with `pgAudit` verified (parameters off) + PHI read-access (SELECT) object-level logging on PHI tables, on whichever host wins the comparison

## Carried-Forward Verification & Tech Debt

Not new requirements — verification/quality debt inherited from v1.0, to close within the relevant v1.1 phase:

- **Phase 03.1 residual UAT** (gets real traffic in OPS-01/02/03): invite-redemption end-to-end in a private window; client-role 403 with a real client account.
- **Phase-7 review warnings:** WR-01 audit-log `?? 'owner'` role fallback; **WR-02 (security)** open redirect via unvalidated `next` in `consent.tsx`; **WR-03 (security)** `document.tsx` reads `pdfBytes` via BYPASSRLS before the authz gate; CR-01 `assignSubject` 23505 idempotency dead code. Fold the two security items into the compliance gate; clear the rest via `/gsd:code-review`.

## Future Requirements (deferred)

- Per-client cadence automation / reminders beyond review-due surfacing — after the manual loop is proven
- Bulk subject import — after single-subject onboarding is solid

## Out of Scope (M2/M3 — over-build guard)

- **M2 client-facing app** (branded client experience, messaging, 4-week-cadence client UI) — beyond a possible minimal read-only report view; deferred until M1 proves with a paying tenant
- **Delivery-surface modules** (Training / Nutrition / Modalities / Life-coaching) — M2+ surfaces on the spine
- **CRM / scheduling / billing / payments parity** — commodity; external tools or link-outs suffice (protect engine focus)
- **M3 multi-coach within a tenant + multi-tenant productization + engine-as-product** — needs M1 traction first
- **External integrations beyond lab + DNA ingest** (CGM, Trainerize/Kajabi/JotForm) — M2+

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPS-01 | Phase 1 — Client Lifecycle | Pending |
| OPS-02 | Phase 1 — Client Lifecycle | Pending |
| OPS-03 | Phase 1 — Client Lifecycle | Pending |
| OPS-04 | Phase 2 — Onboard-a-Client Data Paths | Pending |
| OPS-05 | Phase 2 — Onboard-a-Client Data Paths | Pending |
| OPS-06 | Phase 3 — Protocol Authoring + Cadence | Pending |
| OPS-07 | Phase 3 — Protocol Authoring + Cadence | Pending |
| OPS-08 | Phase 4 — Instrument Continuity | Pending |
| OPS-09 | Phase 5 — M1 Proof Slice UAT | Pending |
| COMP-02 | Phase 6 — Compliance Envelope & Host Gate | Pending |
| COMP-03 | Phase 6 — Compliance Envelope & Host Gate | Pending |

---
*Requirements defined: 2026-06-14 — v1.1 M1 Operations. OPS-01..09 (new family) + COMP-02/03 (carried from v1.0). True M1 exit: one coach runs one real client end-to-end. Traceability filled 2026-06-14 (roadmap creation).*
