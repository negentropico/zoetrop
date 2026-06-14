# Zoetrop

## What This Is

Zoetrop is a confidence-graded functional-health **protocol-decision engine**. As of **v1.0 (M1 Foundations)** it is a single-operator platform *foundation* — auth + tenant/subject isolation (RLS), a live Neon data layer, and a lab-ingest → grounded-review → confidence-graded (K1–K4) lab→protocol report pipeline — running on the owner's own data (n=1), consolidating WHOOP biometrics, blood panels, DEXA body-comp, and genetic variants. The direction (**v1.1+ M1 Operations**) is to invert it into a multi-tenant **operations platform** for functional-health practitioners (coaches/nutritionists/trainers) who run client practices on top of that engine.

## Core Value

The confidence-graded protocol-decision engine: turning heterogeneous diagnostics + wearables + genetics into a personalized, evidence-weighted protocol — and re-deriving it as the data changes — while showing the uncertainty honestly (K1 strong … K4 speculative) instead of faking certainty. This is the moat. If everything else fails, this must work.

## Current Milestone: v1.1 — First Client (practitioner-operated)

**Goal:** The owner, acting as practitioner, onboards **one real client end-to-end** with the tools used in practice — create the client, ingest PureInsight genetics + WHOOP + labs (practitioner-entered, in-app upload), curate the engine library, produce a report + protocol. Single real client, practitioner does all data entry, no client self-service. Sharpen the instrument on real data before the multi-client inversion (v1.2).

**Target features:**
- **Client onboarding (practitioner-operated):** create client/subject, invite→subject link, minimal active-subject context (owner + the one client), onboarding checklist — *ONB*
- **Data ingest:** PureInsight/SelfDecode DNA report → variants; WHOOP → subject metrics (dedup); manual metric entry — *ING* (lead WHOOP + PureInsight)
- **Per-client protocol authoring** from the report — *PRO*
- **Library / corpus curation:** SNPs, supplement stacks, protocol rules — *LIB*
- **First-client proof** end-to-end + polish (tools/workflows/interactions/visuals) woven through — *PROOF/POL*

**Key context (scoping 2026-06-14):** Recut from the multi-client "M1 Operations" plan, now parked as `v1.2-OPERATIONS-PLAN.md`. **Explicitly skipped in v1.1 → v1.2:** Google Drive doc storage (PHI → Workspace BAA), PureInsight API (manual portal + report import instead), Apple Watch + Oura (WHOOP only), client self-service, the compliance gate. v1.1 pulls a *thin* slice of operations forward (one client + invite + minimal subject context) but stays practitioner-operated with no scale.

## Requirements

### Validated

<!-- Shipped M0 capabilities, inferred from .planning/codebase/ map. Locked. -->

- ✓ 9-category metric system (`metricCategoryEnum`) with 4-state status taxonomy (optimal/borderline/deficient/excess) — existing (M0)
- ✓ Versioned protocol engine (P0–P6) with full change history + supplement tiers (tier1/2/3/as_needed) + version comparison — existing (M0)
- ✓ FAAH-informed 120+ day cessation tracker across 4 phases (acute→stabilization→clearing→optimization) — existing (M0)
- ✓ Insights: supplement↔metric correlations (Pearson + lag + p-value) and genetic-variant profile (K1–K4) — existing (M0)
- ✓ WHOOP JSON + Obsidian-vault import parsers (parse + preview only) — existing (M0)
- ✓ Remix (React Router 7) + Neon/Drizzle schema (8 tables) + Netlify CI/CD, TS strict — existing (M0)

<!-- v1.0 M1 Foundations — shipped 2026-06-14 (27/29 requirements). Locked. -->

- ✓ Identity + auth with owner/practitioner/client roles — Better-Auth sign-in + per-invite role-scoped tokens + account surface/`/settings` (AUTH-01/02) — v1.0 (P3/3.1)
- ✓ Tenant + subject scoping on all data tables, isolated via Postgres RLS (host-portable GUC; NOBYPASSRLS `app_user`; `withTenantDb` SET LOCAL + cross-tenant isolation tests) + practitioner→subject assignments + immutable auth/access audit log (TEN-01/02/03/04, AUTH-03/04) — v1.0 (P3/P7)
- ✓ Live Neon data layer at runtime (no static-TS data; owner M0 data migrated; PHI out of the bundle; Drizzle migrations baseline) (DATA-01..05) — v1.0 (P1/P4)
- ✓ Engine promoted to first-class schema: pure `engine.ts` + `geneticVariants`/`variantProtocolMap` with non-null K1–K4 evidence tier (ENG-01/02/03) — v1.0 (P6)
- ✓ Lab-ingest pipeline: upload → async LLM parse → grounding/range validation → human per-field review → only-approved metrics, consent at intake (LAB-01..06) — v1.0 (P5)
- ✓ Confidence-graded lab→protocol report generation, deterministic, with inline K + K4 disclaimer (RPT-01/02/03) — v1.0 (P6)
- ✓ Engine test harness (Vitest: status classification, injectable-`now` cessation math, Pearson) (COMP-01) — v1.0 (P1)
- ✓ Zoetrop design system adopted across all screens (UI-01) — v1.0 (P4.1)

### Active

<!-- v1.1 — First Client (practitioner-operated). Full requirements in REQUIREMENTS.md. -->

v1.0 foundation shipped. v1.1 = onboard one real client end-to-end, practitioner-operated (single client, no self-service). See `.planning/REQUIREMENTS.md`:

- [ ] **ONB** — client onboarding: create client/subject, invite→subject link, minimal active-subject context, onboarding checklist
- [ ] **ING** — data ingest: PureInsight/SelfDecode DNA report → variants; WHOOP → subject metrics (dedup); manual metric entry
- [ ] **PRO** — per-client protocol authoring from the report
- [ ] **LIB** — library/corpus curation: SNPs, supplement stacks, protocol rules
- [ ] **PROOF / POL** — first-client end-to-end proof + tools/workflows/interactions/visuals polish

Deferred → v1.2 (`v1.2-OPERATIONS-PLAN.md`): multi-client at scale, client self-service, subject-switcher, cadence, Apple Watch + Oura, Google Drive, PureInsight API, the compliance gate (COMP-02/03).

### Out of Scope

<!-- Explicit boundaries for THIS milestone (M1). Reasoning prevents re-adding. -->

- M2 client-facing app (branded client experience, messaging, 4-week-cadence UI) — deferred until M1 proves with a paying tenant (over-build trap, PLATFORM §7)
- M3 multi-coach within a tenant + multi-tenant productization + engine-extraction-as-product — needs M1 traction first
- Delivery-surface modules (Training / Nutrition / Modalities / Life-coaching) — M2+ surfaces on the spine
- External integrations beyond lab ingest (CGM, Trainerize/Kajabi/JotForm bridges) — M2+
- Public brand / rename — deferred; `Zoetrop` is the internal codename (docs/NAMING.md)
- Offline-first / local-first sync — retired with the Astro app; the platform is server-authoritative

## Context

- **Brownfield.** M0 instrument shipped; Astro→Remix migration complete (old app in `.archive/astro/`, gitignored). Full codebase analysis in `.planning/codebase/`.
- **Current-state gaps (captured at M1 start; ALL RESOLVED in v1.0):** static-TS data layer → live Neon (P4); `migrations/` baseline committed (P1); engine + boundary tests (P1/P6); tenant/subject scoping on all tables + RLS (P3/P7); `syncStatus`/`syncVersion` + `as any` casts removed (P4); genetics/labs promoted to first-class tables (P5/P6). Original source: `.planning/codebase/CONCERNS.md`.
- **Direction & constraint docs:** `docs/PLATFORM.md` (product brief + M0→M3 roadmap), `docs/PRINCIPLES.md` (engineering constraints extracted from the retired spec-kit constitution), `docs/NAMING.md` (codename rationale).
- **Flagship:** commercialized via HIGHER (Tara Garrison) as the first M1 tenant; diagnostic-pilot entry pattern. Founder lineage: Basis (physiological signal → behavior change, →Intel).

## Constraints

- **Tech stack**: React Router 7 (Remix) + Neon Postgres + Drizzle + Netlify, TS strict — locked. Add on top: auth/identity, RLS or tenancy guard, background jobs (ingest/report/correlation), LLM routing. (PRINCIPLES)
- **Type safety**: strict mode, no `any` — non-negotiable. (PRINCIPLES III)
- **Security / PHI**: per-client diagnostics are PHI → tenant+subject isolation via RLS, encryption, RBAC, audit trail, consent, BAA. **Pilot-first (2026-06-08):** the single-user pilot runs on standard-tier infra + the subscription API; full hardening (RLS enforcement + Neon/Vercel/LLM BAAs + pgAudit verification) is gated at **Phase 7 — before the first external client's PHI**. Gate explicitly; do not hand-wave. (PLATFORM §5.7)
- **LLM usage**: extraction + drafting only, never final clinical judgment; human review in the loop always.
- **Engine integrity**: confidence-under-uncertainty (K1–K4) stays a first-class, visible concept in schema and UI.
- **Single-operator**: must be buildable solo + AI-augmented; named subcontractors only when needed.
- **Focus**: do not chase CRM/scheduling parity at the expense of the decision engine. (PLATFORM §7)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Engine-first inversion: M1 before M2/M3 | the hard confidence-graded decision engine is the moat — ship it before delivery surfaces | ✓ Good — v1.0 M1 Foundations shipped the engine + platform foundation (27/29 reqs, lab→report E2E) |
| Server-authoritative Postgres (drop local-first) | PHI + multi-tenancy can't live in the browser | — Pending |
| Retire spec-kit, adopt GSD | spec-kit constitution went stale (Astro-era); GSD drives phased execution | — Pending |
| `Zoetrop` internal codename, public brand deferred | functional-health naming space is saturated; ship now, brand later | — Pending |
| HIGHER as first M1 tenant | real practice as the proving ground; diagnostic-pilot pattern, traction before generalization | — Pending |
| Tenancy via SET LOCAL `request.jwt.claims` + RLS (not JWK-native) | Phase 1 spike: pg_session_jwt v0.5.0 is available but the JWK-native path needs Neon's Authorize feature; SET LOCAL under a NOBYPASSRLS role is proven, role-agnostic, sufficient for M1 (D-04) | Phase 1 ✓ — drives Phase 3 |
| Pilot-first: defer PHI hardening to a pre-client gate (Phase 7) | Initial work is single-user pilot on the owner's own data (n=1); HIPAA/BAA obligations attach to *others'* PHI. Build Phases 2–6 on standard-tier infra + the subscription API; add tenant/subject columns in Phase 3 so the RLS retrofit is non-breaking | 2026-06-08 — re-scoped Phase 2 → "Vercel Cutover + Pilot Deploy Baseline", decoupled the gate from Phases 3/5, added Phase 7 |
| Close v1.0 as **M1 Foundations**; open v1.1 **M1 Operations** | the foundation (auth/tenancy/live data/engine/lab/reports) is verified-complete on n=1, but it's still a single-owner instrument — the next slice (subjects become real; a practitioner runs a real client end-to-end) needs a fresh **OPS-\*** requirement family + a Core-Value recheck the milestone boundary forces. Phase 8 (compliance envelope & host gate) carries into v1.1 unchanged as its final gate — coherent now because it can only fire once a real client can exist | 2026-06-14 — v1.0 archived (27/29 reqs; COMP-02/03 deferred); v1.1 to be defined via `/gsd:new-milestone` |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-14 after **v1.0 — M1 Foundations** milestone complete (full review). 9 phases / 50 plans / 116 tasks; 27/29 requirements satisfied (COMP-02/03 deferred to the v1.1 compliance gate). Shipped: auth + roles, tenant/subject RLS isolation, live Neon data layer, lab-ingest→grounded-review→approve pipeline, pure engine + first-class genetics/rule corpus, and deterministic confidence-graded reports. Gates green (typecheck, vitest 296p, build no .server leaks); integration 5/5 flows wired; prod live at zoetrop.vercel.app. Archived to `milestones/v1.0-*`. Next: v1.1 — M1 Operations (a practitioner runs a real client), via `/gsd:new-milestone`.*

*Prior: Phase 6 complete 2026-06-12 (pure `engine.ts`, first-class corpus, deterministic `generateReport`). Phase 5 complete 2026-06-11 (lab-ingest state machine, owner E2E UAT passed).*
