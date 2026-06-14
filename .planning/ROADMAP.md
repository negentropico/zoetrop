# Roadmap: Zoetrop

## Milestones

- ✅ **v1.0 — M1 Foundations** — Phases 1–7 + inserted 3.1/4.1 (shipped 2026-06-14) — full detail: [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 — M1 Operations** — "a practitioner runs a real client" (in progress — Phase 1 next)

> **M1 arc:** v1.0 built the engine-first platform *foundation* on the owner's own data (n=1). v1.1 inverts it from a single-owner instrument to a practitioner-operated product — subjects become real, a coach onboards and runs a real client end-to-end — converging on the true M1 exit, then opens the compliance gate before the first external client's PHI.

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

### 🚧 v1.1 — M1 Operations

- [ ] **Phase 1: Client Lifecycle — Subjects Become Real** — subject creation/management UI; invite→subject linkage; selected-subject context replacing hardwired `getOwnerSubject` across all 13 PHI surfaces
- [ ] **Phase 2: Onboard-a-Client Data Paths** — per-subject genotype entry (manual + DNA-report upload); manual metric entry; intake consolidating consent + baseline
- [ ] **Phase 3: Per-Client Protocol Authoring + 4-Week Cadence** — write path for per-subject protocol-version lineage; supplement assignment + change history; review-due surfacing + practitioner monitoring view
- [ ] **Phase 4: Instrument Continuity (WHOOP Import Persists)** — wire `import/whoop` to write subject-scoped metrics with dedup using Phase-5 ingest patterns
- [ ] **Phase 5: M1 Proof Slice — End-to-End UAT** — scripted run-through with a second real or synthetic client: invite → intake/consent → labs → genotype → report → protocol v1 → 4-week iteration simulated
- [ ] **Phase 6: Compliance Envelope & Host Gate** — DB-host cost/BAA comparison (+ possible migration), Vercel HIPAA add-on + BAA, LLM-provider HIPAA-Ready BAA, pgAudit + PHI SELECT-logging verification, PITR/SSL/network hardening, COMPLIANCE-RUNBOOK.md complete

## Phase Details

### Phase 1: Client Lifecycle — Subjects Become Real
**Goal**: A practitioner can create, manage, and switch between client subjects, with every PHI surface scoping to the selected subject
**Depends on**: Nothing (first v1.1 phase; builds on v1.0 foundation)
**Requirements**: OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. A practitioner signs in and sees a client list surface (empty or populated)
  2. A practitioner can create a new subject record with intake basics and it persists to the DB
  3. Redeeming a client invite creates or links a `subjects` row — no orphaned client accounts
  4. A practitioner can switch the active subject and every authenticated route (all 13 PHI loaders + ingest + reports) returns data scoped to the selected subject only
  5. Cross-subject isolation holds: n≥2 real subjects cannot see each other's PHI (isolation tests extended)
**Plans**: TBD
**UI hint**: yes

### Phase 2: Onboard-a-Client Data Paths
**Goal**: A practitioner can bring a brand-new subject to "report-ready" without touching a seed script
**Depends on**: Phase 1
**Requirements**: OPS-04, OPS-05
**Success Criteria** (what must be TRUE):
  1. A practitioner can manually enter a metric value for a subject and it appears in that subject's metrics views
  2. A practitioner can enter genetic variant data for a subject via a manual entry surface
  3. A practitioner can upload a DNA report through the existing ingest pipeline and the resulting variants are attributed to the correct subject
  4. After completing intake (consent + baseline data entry), a subject's record has enough data to generate a report without any seed-script intervention
**Plans**: TBD
**UI hint**: yes

### Phase 3: Per-Client Protocol Authoring + 4-Week Cadence
**Goal**: The PLATFORM §4 practice loop is executable — a practitioner can author a protocol for a client and track the 4-week iteration cadence
**Depends on**: Phase 2
**Requirements**: OPS-06, OPS-07
**Success Criteria** (what must be TRUE):
  1. A practitioner can author a new protocol version for a specific subject and save it to that subject's `protocol_versions` lineage
  2. A practitioner can assign supplements to a client protocol and the assignment is persisted with change history
  3. The practitioner monitoring view shows which clients are review-due (past their 4-week cycle)
  4. A practitioner can initiate a "new version per cycle" flow that creates a new protocol version linked to the previous one
**Plans**: TBD
**UI hint**: yes

### Phase 4: Instrument Continuity (WHOOP Import Persists)
**Goal**: The owner's WHOOP biometric stream flows again, persisted per-subject into the live data layer
**Depends on**: Phase 1
**Requirements**: OPS-08
**Success Criteria** (what must be TRUE):
  1. A practitioner can trigger the WHOOP import flow from `import/whoop` and the resulting metrics are written to the DB attributed to the selected subject
  2. Re-running the same import does not create duplicate metric rows (dedup by specimen/collection-date, using Phase-5 ingest patterns)
  3. Imported WHOOP metrics appear in the subject's metrics views with `data_source = 'whoop'`
**Plans**: TBD

### Phase 5: M1 Proof Slice — End-to-End UAT
**Goal**: The M1 milestone sentence is demonstrably true — a practitioner runs one client end-to-end through the full practice loop
**Depends on**: Phase 3, Phase 4
**Requirements**: OPS-09
**Success Criteria** (what must be TRUE):
  1. A practitioner can complete the full sequence without any step requiring manual DB intervention: invite → intake/consent → labs uploaded → genotype entered → report generated → protocol v1 authored → 4-week iteration simulated
  2. The second client's data is fully isolated from the owner-subject's data across all surfaces (cross-subject isolation confirmed at n≥2)
  3. Phase 03.1 residual UAT is closed: invite-redemption works end-to-end in a private window; client-role 403 fires correctly with a real client account
  4. All defects surfaced during the scripted run are identified, triaged, and either fixed or explicitly deferred with rationale
**Plans**: TBD

### Phase 6: Compliance Envelope & Host Gate
**Goal**: All PHI infrastructure is BAA-covered and audit-logged before any external client's data is written
**Depends on**: Phase 5
**Requirements**: COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. A DB-host cost/BAA comparison is completed and the host decision is recorded; if migration is required it is executed and verified
  2. Vercel HIPAA add-on is activated and the Vercel BAA is signed
  3. The LLM provider (Anthropic) HIPAA-Ready BAA is obtained and on record
  4. pgAudit is verified active on the chosen host (parameters confirmed: `log_parameter=off`; PHI SELECT-level object logging on all PHI tables confirmed live)
  5. COMPLIANCE-RUNBOOK.md is complete: all three vendor BAA registers filled, pgAudit status confirmed, PITR/SSL/network hardening documented, WR-02 (open-redirect) and WR-03 (BYPASSRLS pdf read) security items resolved
**Plans**: TBD

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Schema/Engine/Auth-spike | v1.0 | 5/5 | Complete | 2026-06-08 |
| 2. Vercel cutover | v1.0 | 4/4 | Complete | 2026-06-08 |
| 3. Identity + tenancy | v1.0 | 5/5 | Complete | 2026-06-10 |
| 3.1 Account & roles | v1.0 | 4/4 | Complete | 2026-06-10 |
| 4. Static→DB data layer | v1.0 | 7/7 | Complete | 2026-06-10 |
| 4.1 Design system | v1.0 | 9/9 | Complete | 2026-06-08 |
| 5. Lab ingest | v1.0 | 3/3 | Complete | 2026-06-11 |
| 6. Engine + reports | v1.0 | 5/5 | Complete | 2026-06-12 |
| 7. RLS + isolation | v1.0 | 8/8 | Complete | 2026-06-12 |
| **v1.1 — 1. Client lifecycle** | v1.1 | 0/TBD | Not started | — |
| **v1.1 — 2. Onboard-a-client data** | v1.1 | 0/TBD | Not started | — |
| **v1.1 — 3. Protocol authoring + cadence** | v1.1 | 0/TBD | Not started | — |
| **v1.1 — 4. Instrument continuity** | v1.1 | 0/TBD | Not started | — |
| **v1.1 — 5. M1 proof slice UAT** | v1.1 | 0/TBD | Not started | — |
| **v1.1 — 6. Compliance envelope & host gate** | v1.1 | 0/TBD | Not started | — |

## Backlog

_No open backlog items._
