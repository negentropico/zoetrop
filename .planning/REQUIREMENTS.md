# Requirements: Zoetrop M1

**Defined:** 2026-06-07
**Core Value:** The confidence-graded protocol-decision engine — heterogeneous diagnostics + genetics → personalized, evidence-weighted (K1–K4) protocol, shown with honest uncertainty.

**Milestone:** M1 — single practitioner, multi-client. Convert the shipped n=1 instrument into a multi-tenant, RLS-isolated platform that produces a confidence-graded lab→protocol report a real practitioner can hand a real client.

## v1 Requirements

### Identity & Access

- [x] **AUTH-01**: A user can sign in with email + password and stay signed in across sessions
- [x] **AUTH-02**: Each user has a role (owner / practitioner / client) that gates what they can access
- [ ] **AUTH-03**: A practitioner can access only the subjects (clients) assigned to them within their tenant
- [ ] **AUTH-04**: Authentication and access events are written to an immutable audit log

### Multi-Tenancy & Isolation

- [x] **TEN-01**: Every health-data table is scoped by `tenantId` + `subjectId`
- [ ] **TEN-02**: Postgres RLS prevents any query from returning another tenant's or subject's rows (proven by an automated cross-tenant isolation test)
- [ ] **TEN-03**: Tenant/subject context is set per-request via `SET LOCAL` inside a transaction, with no leakage across pooled connections
- [x] **TEN-04**: Protocol version lineage (P0–P6) is per-subject, unique on `(tenantId, subjectId, version)`

### Data Layer

- [ ] **DATA-01**: All route loaders read live data from Neon at runtime (no static-TypeScript data as a runtime source)
- [ ] **DATA-02**: The owner's existing M0 data is migrated into the real database tables
- [x] **DATA-03**: A committed Drizzle `migrations/` baseline exists; all schema changes go through migrations
- [ ] **DATA-04**: No PHI is present in the client bundle or static source (verified against the build output)
- [ ] **DATA-05**: Vestigial `syncStatus`/`syncVersion` columns and `subcategory: ... as any` casts are removed

### Engine & Genetics

- [ ] **ENG-01**: The protocol-decision engine is a pure, dependency-free module callable outside route loaders (no Drizzle/Remix imports)
- [ ] **ENG-02**: Genetic variants and variant→protocol mappings are first-class tables with a non-nullable K1–K4 `confidence` field + evidence/citation
- [ ] **ENG-03**: The engine derives a confidence-graded protocol for a subject from their metrics + variants

### Lab Ingest

- [ ] **LAB-01**: A practitioner can upload a lab document (PDF) for a subject
- [ ] **LAB-02**: An asynchronous extraction job parses the document into structured candidate metrics (does not block the request)
- [ ] **LAB-03**: Extracted values are validated (grounded to source text + physiological-range sanity + per-field confidence) before reaching review
- [ ] **LAB-04**: A practitioner reviews extracted fields side-by-side with the source document and can approve, edit, or reject each
- [ ] **LAB-05**: Only practitioner-approved metrics are written to the subject's record, each producing an audit-log entry
- [ ] **LAB-06**: Client consent is captured at intake before any client PHI is stored

### Reports

- [ ] **RPT-01**: A practitioner can generate a confidence-graded lab→protocol report for a subject
- [ ] **RPT-02**: Every recommendation in the report shows its K1–K4 confidence level in the visible body (not a tooltip)
- [ ] **RPT-03**: Report language is hedged (evidence-suggesting, never imperative/prescriptive); K4 recommendations carry an explicit disclaimer

### Compliance & Quality

- [x] **COMP-01**: Engine logic (status classification, cessation phase math with injectable `now`, Pearson correlation) has passing unit tests covering boundary cases
- [ ] **COMP-02**: PHI infrastructure is BAA-covered (Neon, Vercel, and the chosen LLM provider) before any **external client's** PHI is written — the pre-client hardening gate (Phase 7), not the single-user pilot
- [ ] **COMP-03**: PHI access is audit-logged with `pgAudit` verified (parameters off) — Phase 7 (pgAudit baseline auto-configures on Neon HIPAA enable; verification is the gate)

### UI / Design System

- [x] **UI-01**: All product UI surfaces conform to the Zoetrope design system — brand tokens (color / type / spacing / shadow / radius), typed signature components, and the calm "quiet coach" voice — governed by a binding `UI-SPEC.md` that subsequent UI phases build against

## v2 Requirements

Deferred to later milestones (M2/M3). Tracked, not in this roadmap.

### Client App (M2)

- **APP-01**: A client can view their protocol, program, and tracking in a branded app
- **APP-02**: Practitioner↔client messaging
- **APP-03**: 4-week iteration cadence surfaced to the client

### Delivery Surfaces (M2+)

- **DEL-01**: Training program builder (neurotype-keyed)
- **DEL-02**: Nutrition plans
- **DEL-03**: Modalities tracking (sauna/light/cold/breath/sleep/circadian)

### Productization (M3)

- **PROD-01**: Multiple practitioners within a tenant
- **PROD-02**: Multi-tenant onboarding for other practices
- **PROD-03**: Engine exposed as an extractable callable service/product

## Out of Scope

| Feature | Reason |
|---------|--------|
| M2 client-facing app | Deferred until M1 proves with a paying tenant (over-build trap, PLATFORM §7) |
| M3 multi-tenant productization / engine-as-product | Needs M1 traction first |
| Training / Nutrition / Modalities / Life-coaching modules | M2+ delivery surfaces; not the engine moat |
| External integrations beyond lab ingest (CGM, Trainerize, Kajabi, JotForm) | M2+; M1 is the core decision loop |
| CRM / scheduling / billing / payments parity | Commodity; external tools or link-outs suffice — protect engine focus |
| Public brand / rename | `Zoetrop` codename stands; brand deferred (docs/NAMING.md) |
| Offline-first / local-first sync | Retired with the Astro app; platform is server-authoritative |

## Traceability

**Coverage:** 29/29 v1 requirements mapped — 100%

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-03 | Phase 1 — Schema Baseline + Engine Tests + Auth Spike | Complete |
| COMP-01 | Phase 1 — Schema Baseline + Engine Tests + Auth Spike | Complete |
| COMP-02 | Phase 7 — PHI Compliance Hardening (Pre-Client Gate) | Deferred |
| COMP-03 | Phase 7 — PHI Compliance Hardening (Pre-Client Gate) | Deferred |
| AUTH-01 | Phase 3 — Identity + Tenancy Scoping | Complete |
| AUTH-02 | Phase 3 — Identity + Tenancy Scoping | Complete |
| AUTH-03 | Phase 7 — PHI Compliance Hardening (Pre-Client Gate) | Deferred |
| AUTH-04 | Phase 7 — PHI Compliance Hardening (Pre-Client Gate) | Deferred |
| TEN-01 | Phase 3 — Identity + Tenancy Scoping | Complete |
| TEN-02 | Phase 7 — PHI Compliance Hardening (Pre-Client Gate) | Deferred |
| TEN-03 | Phase 7 — PHI Compliance Hardening (Pre-Client Gate) | Deferred |
| TEN-04 | Phase 3 — Identity + Tenancy Scoping | Complete |
| DATA-01 | Phase 4 — Static-to-DB Data Layer Migration | Pending |
| DATA-02 | Phase 4 — Static-to-DB Data Layer Migration | Pending |
| DATA-04 | Phase 4 — Static-to-DB Data Layer Migration | Pending |
| DATA-05 | Phase 4 — Static-to-DB Data Layer Migration | Pending |
| UI-01 | Phase 4.1 — Design System Adoption | Complete |
| LAB-01 | Phase 5 — Lab Ingest Pipeline | Pending |
| LAB-02 | Phase 5 — Lab Ingest Pipeline | Pending |
| LAB-03 | Phase 5 — Lab Ingest Pipeline | Pending |
| LAB-04 | Phase 5 — Lab Ingest Pipeline | Pending |
| LAB-05 | Phase 5 — Lab Ingest Pipeline | Pending |
| LAB-06 | Phase 5 — Lab Ingest Pipeline | Pending |
| ENG-01 | Phase 6 — Engine Promotion + Confidence-Graded Reports | Pending |
| ENG-02 | Phase 6 — Engine Promotion + Confidence-Graded Reports | Pending |
| ENG-03 | Phase 6 — Engine Promotion + Confidence-Graded Reports | Pending |
| RPT-01 | Phase 6 — Engine Promotion + Confidence-Graded Reports | Pending |
| RPT-02 | Phase 6 — Engine Promotion + Confidence-Graded Reports | Pending |
| RPT-03 | Phase 6 — Engine Promotion + Confidence-Graded Reports | Pending |

---
*Requirements defined: 2026-06-07*
*Last updated: 2026-06-08 — pilot-first re-scope: COMP-02/COMP-03 (BAAs/pgAudit), TEN-02/TEN-03 (RLS/isolation), AUTH-03/AUTH-04 (subject-scoping/audit-log) deferred from Phases 2–3 to Phase 7 (PHI Compliance Hardening — Pre-Client Gate). Phase 3 retains AUTH-01/02 + TEN-01/04 (tenancy scoping). Coverage still 29/29 mapped.*
