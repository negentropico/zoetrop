# Roadmap: Zoetrop

## Milestones

- ✅ **v1.0 — M1 Foundations** — Phases 1–7 + inserted 3.1/4.1 (shipped 2026-06-14) — full detail: [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 — First Client (practitioner-operated)** — one real client end-to-end, practitioner does all data entry, no self-service (in progress — Phase 1 next)
- 📋 **v1.2 — M1 Operations (parked)** — multi-client at scale, client self-service, cadence/monitoring, Apple Watch + Oura, compliance gate — see [`v1.2-OPERATIONS-PLAN.md`](v1.2-OPERATIONS-PLAN.md)

> **M1 arc:** v1.0 built the engine-first platform *foundation* on the owner's own data (n=1). v1.1 sharpens the instrument on one real client — a practitioner runs a single client end-to-end with actual tools (PureInsight genetics, WHOOP, labs) before the multi-client inversion. v1.2 scales it: multi-client operations, self-service, the compliance gate.

## Phases

<details>
<summary>✅ v1.0 — M1 Foundations (Phases 1–7 + 3.1/4.1) — SHIPPED 2026-06-14</summary>

- [x] **Phase 1: Schema Baseline + Engine Tests + Auth Spike** (5/5) — completed 2026-06-08
- [x] **Phase 2: Vercel Cutover + Pilot Deploy Baseline** (4/4) — completed 2026-06-08
- [x] **Phase 3: Identity + Tenancy Scoping** (5/5) — completed 2026-06-10 — AUTH-01/02, TEN-01/04
- [x] **Phase 3.1: Account & Roles — UX + Authorization** *(inserted)* (4/4) — completed 2026-06-10
- [x] **Phase 4: Static-to-DB Data Layer Migration** (7/7) — completed 2026-06-10 — DATA-01/02/04/05
- [x] **Phase 4.1: Design System Adoption** *(inserted)* (9/9) — completed 2026-06-08 — UI-01
- [x] **Phase 5: Lab Ingest Pipeline** (3/3) — completed 2026-06-11 — LAB-01..06; owner E2E UAT passed
- [x] **Phase 6: Engine Promotion + Confidence-Graded Reports** (5/5) — completed 2026-06-12 — ENG-01..03, RPT-01..03
- [x] **Phase 7: PHI Compliance Hardening — RLS + Isolation Engineering** *(pre-client gate, part 1)* (8/8) — completed 2026-06-12 — AUTH-03/04, TEN-02/03

Requirements: 27/29 satisfied. Pilot-first re-scope (2026-06-08) deferred PHI compliance *hardening* to the pre-client gate; the pre-client-gate split (2026-06-12) executed RLS/isolation in Phase 7 and moved the compliance envelope (BAAs, host cost/BAA comparison, pgAudit/SELECT-logging) to the gate now carried into v1.1.

</details>

### 🚧 v1.1 — First Client (practitioner-operated)

- [ ] **Phase 1: Client Onboarding (practitioner-operated)** — create client/subject, invite→subject link, minimal active-subject context (owner + one client), onboarding checklist
- [ ] **Phase 2: Data Ingest (genetics + WHOOP + manual)** — PureInsight/SelfDecode DNA report → review/approve → `geneticVariants`; WHOOP → subject-scoped metrics with dedup; manual metric entry
- [ ] **Phase 3: Library / Corpus Curation** — in-app CRUD for SNP library, supplement stacks, and protocol rules with K1–K4 evidence-tier authoring
- [ ] **Phase 4: Per-Client Protocol Authoring** — write/edit a protocol version for the client from their report; per-subject `protocol_versions` lineage; supplement assignment + change history
- [ ] **Phase 5: First-Client Proof + Polish** — onboard one real client end-to-end (create → genetics + labs + WHOOP → report → protocol) with no manual DB intervention; friction polish + resolve WR-02/WR-03 security warnings

## Phase Details

### Phase 1: Client Onboarding (practitioner-operated)
**Goal**: A practitioner can create a real client, link them via invite, and operate on either the owner or the client — with every PHI surface scoping to whichever subject is active
**Depends on**: Nothing (first v1.1 phase; builds on v1.0 foundation)
**Requirements**: ONB-01, ONB-02, ONB-03, ONB-04
**Success Criteria** (what must be TRUE):
  1. A practitioner can create a client (subject) record with intake basics and it persists to the DB
  2. A practitioner can invite a client; redeeming the invite creates or links a `subjects` row with no orphaned accounts
  3. A practitioner can select the active subject (owner or client) and every PHI surface — ingest, report, protocol — returns data scoped to that subject only
  4. An onboarding checklist surface shows each client's required-input status (genetics, labs, WHOOP) so the practitioner knows what is still missing
  5. Phase 03.1 residual UAT closes: invite-redemption works end-to-end in a private window; client-role 403 fires correctly with a real client account
**Plans**: 7 plans (4 waves)
  - [x] 01-01-PLAN.md — Schema delta (subjects intake + invites.subjectId) + [BLOCKING] migration + Wave-0 RED test stubs
  - [x] 01-02-PLAN.md — getActiveSubject resolver + zt-subject cookie + /subject-switch route + requireSubjectCtx swap + 7 Pattern-B loader swaps [ONB-03]
  - [x] 01-03-PLAN.md — subjects.server.ts + checklist.server.ts backend services (honest 3-state) [ONB-01, ONB-04]
  - [ ] 01-04-PLAN.md — invites.subjectId thread + Better-Auth redemption-hook wiring [ONB-02]
  - [ ] 01-05-PLAN.md — SubjectChip in app shell + layout loader + cessation null-guard [ONB-03 / D-05]
  - [ ] 01-06-PLAN.md — /clients page: list + checklist strip + create-client intake form + invite generation UI [ONB-01, ONB-02, ONB-04]
  - [ ] 01-07-PLAN.md — SC-5 / 03.1 residual UAT (private-window redemption + client-role 403) + final full-suite gate
**UI hint**: yes

### Phase 2: Data Ingest (genetics + WHOOP + manual)
**Goal**: A practitioner can bring a client to "report-ready" by ingesting their DNA report, WHOOP stream, and any ad-hoc metric values — all scoped to the correct subject
**Depends on**: Phase 1
**Requirements**: ING-01, ING-02, ING-03
**Success Criteria** (what must be TRUE):
  1. A practitioner can upload a PureInsight or SelfDecode DNA report and it flows through parse → review → approve into the subject's `geneticVariants` with no manual DB intervention
  2. A practitioner can import WHOOP data and the resulting metrics are written to the DB attributed to the selected subject; re-running the same import does not create duplicates (dedup by collection-date)
  3. A practitioner can manually enter a metric value for a subject and it appears in that subject's metrics views immediately
  4. All three ingest paths (DNA, WHOOP, manual) write data scoped to the active subject only — no cross-subject bleed
**Plans**: TBD
**UI hint**: yes

### Phase 3: Library / Corpus Curation
**Goal**: A practitioner can author and maintain the SNP library, supplement stacks, and protocol rules the engine applies — so the engine can correctly interpret real client genetics
**Depends on**: Phase 1 (subject context required for meaningful curation); can parallelize with Phase 2
**Requirements**: LIB-01, LIB-02, LIB-03
**Success Criteria** (what must be TRUE):
  1. A practitioner can list, create, edit, and version SNP entries in the `geneticVariants` library with a K1–K4 evidence-tier field required on every record
  2. A practitioner can curate the supplement library — create, edit, and retire supplement stack entries used by protocol authoring
  3. A practitioner can author and edit variant→protocol (`variantProtocolMap`) and metric→protocol (`metricProtocolMap`) rules the engine applies at report generation
  4. The engine produces a report that reflects the curated library state — a rule change is visible in the next report generated
**Plans**: TBD
**UI hint**: yes

### Phase 4: Per-Client Protocol Authoring
**Goal**: A practitioner can author a protocol version for a client derived from their report, with supplement assignment and a change history that preserves the lineage
**Depends on**: Phase 2 (ingest must produce data), Phase 3 (library must have rules for the engine to apply)
**Requirements**: PRO-01
**Success Criteria** (what must be TRUE):
  1. A practitioner can create a new protocol version for a specific subject, linked to that subject's `protocol_versions` lineage, and the record persists to the DB
  2. A practitioner can assign supplements to a client protocol version and edit the assignment; the full change history is preserved
  3. The protocol version is seeded from the client's confidence-graded report — the practitioner edits from a generated draft, not a blank slate
  4. Two subjects have independent protocol-version lineages — one client's protocol cannot appear in another's view
**Plans**: TBD
**UI hint**: yes

### Phase 5: First-Client Proof + Polish
**Goal**: The v1.1 milestone sentence is demonstrably true — a practitioner completes the full client loop (create → ingest → report → protocol) on one real client with no manual DB intervention, and friction surfaced during that run is resolved
**Depends on**: Phase 4 (full pipeline must be wired)
**Requirements**: PROOF-01, POL-01
**Success Criteria** (what must be TRUE):
  1. A practitioner completes the full sequence without any step requiring manual DB intervention: create client → ingest genetics + WHOOP + labs → generate report → author protocol v1
  2. The real client's data is fully isolated from the owner-subject's data across all surfaces (cross-subject isolation confirmed at n≥2)
  3. WR-02 (open-redirect via unvalidated `next` in `consent.tsx`) and WR-03 (BYPASSRLS `pdfBytes` read in `document.tsx`) are resolved and verified
  4. Tools, workflows, interactions, and visuals tuned from the real run — deferred design round-3/4/5 items and import-honesty gaps addressed; any remaining defects are either fixed or explicitly deferred with rationale
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Client Onboarding | 3/7 | In Progress|  |
| 2. Data Ingest | 0/TBD | Not started | — |
| 3. Library / Corpus Curation | 0/TBD | Not started | — |
| 4. Per-Client Protocol Authoring | 0/TBD | Not started | — |
| 5. First-Client Proof + Polish | 0/TBD | Not started | — |

## Backlog

_No open backlog items._
