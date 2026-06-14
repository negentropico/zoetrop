# Roadmap: Zoetrop

## Milestones

- ✅ **v1.0 — M1 Foundations** — Phases 1–7 + inserted 3.1/4.1 (shipped 2026-06-14) — full detail: [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 — M1 Operations** — "a practitioner runs a real client" (planned — formalize via `/gsd:new-milestone`)

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

### 🚧 v1.1 — M1 Operations (Planned)

**Goal:** Invert from a single-owner instrument to a practitioner-operated product — one coach onboards and runs one real client end-to-end (intake → customized protocol → tracking → 4-week iteration). Needs a new **OPS-\*** requirement family. **To be formalized via `/gsd:new-milestone`** (the structural drift analysis + this sequence are the input context).

Intended phase sequence (high-level; new-milestone refines):

- [ ] **Phase 1 — Client lifecycle: subjects become real** — subject creation/management UI; invite→subject linkage (close the orphan-client hole); selected-subject context replacing hardwired `getOwnerSubject`, parameterizing all 13 PHI loaders + ingest + reports (assignments/AUTH-03 get real traffic). *OPS-01/02/03*
- [ ] **Phase 2 — Onboard-a-client data paths** — per-subject genotype entry (manual and/or DNA-report upload through ingest); manual metric entry; intake flow consolidating consent + baseline. *OPS-04/05*
- [ ] **Phase 3 — Per-client protocol authoring + 4-week cadence** — write path for the per-subject protocol-version lineage; per-client supplement assignment + change history; review-due surfacing + monitoring view. *OPS-06/07*
- [ ] **Phase 4 — Instrument continuity** — wire `import/whoop` (decide on vault) to write subject-scoped metrics with dedup using the Phase-5 patterns. *OPS-08*
- [ ] **Phase 5 — M1 proof slice, end-to-end UAT** — scripted run with a second real/synthetic client: invite → intake/consent → labs → genotype → report → protocol v1 → 4-week iteration. *OPS-09*
- [ ] **Phase 6 — Compliance Envelope & Host Gate** *(carried from v1.0 Phase 8, unchanged)* — before the first external client's PHI: DB-host cost/BAA comparison (+ possible migration), Vercel HIPAA add-on + BAA, LLM-provider HIPAA-Ready BAA, pgAudit + PHI SELECT-logging verification, PITR/SSL/network hardening, COMPLIANCE-RUNBOOK.md complete. **COMP-02/03.** The realignment makes this gate coherent — it can only fire once a real client can exist (after Phase 5).

> Explicitly still out of scope (over-build guard): client-facing app beyond a possible minimal report view (M2), delivery-surface modules, CRM/scheduling/billing parity, multi-coach/productization (M3).

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
| v1.1 (M1 Operations) | v1.1 | — | Planned | — |

## Backlog

_No open backlog items. (999.1 Account & Roles promoted to Phase 3.1 on 2026-06-09.)_
