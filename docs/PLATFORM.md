# Zoetrop → Functional-Health Operations Platform

**A platform definition / product brief.** Defines what Zoetrop becomes as it grows from a personal n=1 instrument into a multi-tenant operations platform for running full functional-health coaching practices. Architecture-deep; narrative (not a GSD/spec-kit milestone breakdown — that's a separate step).

- **Repo:** `/Users/mac/Code/zoetrop` (github.com/negentropico/zoetrop) · **Live:** zoetrop.vercel.app
- **Author:** Mac Baker / Negentropico
- **Date:** 2026-05-20
- **Status:** Direction doc. The n=1 instrument ships today; the platform is being commercialized via its first flagship pilot — see the companion `ngtops/clients/higher/PLATFORM-FOR-HIGHER.md` (HIGHER / Tara Garrison).
- **Companion docs:** `ngtops/clients/higher/PLATFORM-FOR-HIGHER.md` (engagement instantiation), `ngtops/PROJECTS.md` (portfolio context), `ngtops/clients/higher/pitch-deck/SPEC.md` (the pitch this seeds).

---

## 1. Thesis

Most coaching software is **CRM + workout-builder + payments**, and stays thin exactly where the value is: the **biometric/decision layer**. Zoetrop inverts the build order. It starts from the genuinely hard part — consolidating labs + wearables + genetics into **confidence-graded protocol decisions** — which already works for a real n=1 case, and adds the coaching-delivery layer (multi-client, intake → customized protocol → tracking → 4-week iteration → client app → practitioner monitoring) on top of an engine that already runs.

**One line:** the protocol-decision engine first, the practice-operations layer second — the opposite of every coaching SaaS, and the reason the moat is real.

---

## 2. What Zoetrop is today (the n=1 instrument)

A wellness dashboard that consolidates a serious self-quantifier's data — WHOOP biometrics, blood panels, body comp (DEXA), genetic variants, protocol/supplement progress — and turns it into *decisions*. What distinguishes it from a generic health dashboard is the layer consumer tools skip: it maps **genetic variants → protocol actions, confidence-graded K1–K4** (K1 = strong/clinical … K4 = speculative/single-study), so the UI says "the data points this way, here's how sure we are" instead of faking certainty.

**Built:**
- **9 metric categories** (`metricCategoryEnum`) with a 4-state status taxonomy (`optimal`/`borderline`/`deficient`/`excess`): vitamins, minerals, inflammatory, metabolic, hormones, autonomic, bodyComposition, lipids, hematology.
- **Protocol engine** — versioned protocols (P0–P6) with full change history, supplement tiers (`tier1/2/3/as_needed`), version comparison, and a FAAH-informed **120+ day cessation protocol** across four phases (`acute → stabilization → clearing → optimization`).
- **Insights** — supplement↔metric correlations (Pearson + lag + p-value) and a genetic-variant profile surface.
- **Imports** — WHOOP JSON + an Obsidian-vault importer (~7,480 metrics from the `#Bwell` vault). `dataSourceEnum`: manual/whoop/dexa/bloodwork/csv/vault.
- **Stack** — React Router 7 (Remix), TS5 strict, React 19, Tailwind 4, Recharts, Neon Postgres + Drizzle, Vercel CI/CD.

**The design heart:** confidence-display-under-genuine-uncertainty — the data points one way, the protocol still has to commit, and the interface has to make the gap legible without making it scary. This is the hard problem most tools refuse to take on.

---

## 3. The moat

The defensible asset is not a dashboard — it's the **confidence-graded protocol-decision engine**: turning heterogeneous diagnostics (blood, HTMA, DNA, gut, DUTCH) + wearables + genetics into a personalized, evidence-weighted protocol, and re-deriving it as the data changes. Frontier LLMs alone won't do this reliably; the value is in the orchestration + evidence-grading + human-review layer around the model (the same lesson that underwrites the LGS and Trouvant engines). A coach's scarcest, least-scalable skill becomes a system capability — without pretending to a certainty the science doesn't have.

---

## 4. From instrument to platform — product definition

The platform runs a complete functional-health practice. The target shape (the "Higher" service model, decomposed) is **four delivery surfaces on a diagnostics substrate**, all sitting on top of the decision engine:

- **Diagnostics substrate** — blood labs, gut microbiome, DUTCH hormones, hair-mineral analysis, DNA, CGM, body-comp scans, glucose/ketones, HRV. (Zoetrop already ingests several.)
- **Training** — neurotyping intake → goals/equipment/injuries → customized program → app access → video demos → progress tracking → new plan every 4 weeks.
- **Nutrition** — comprehensive intake → goals → customized recs → flexible approach (macros / keto / food-as-healing), matched to the person.
- **Modalities** — sauna, red-light/NIR/FIR, meditation, breathwork, grounding, cold immersion, supplement protocols, circadian reset, sleep optimization.
- **Life coaching** — morning routine, meditation, gratitude, personal-development program, group + private calls, book club, referral network.

The **operations layer** that makes this a practice (not a dashboard): multi-client management, intake → customized protocol → tracking → 4-week iteration cadence → client app access → practitioner-side monitoring → automated reporting → content/marketing scheduling.

---

## 5. Target architecture (deep)

### 5.1 Current state (the gap)
Every one of the 8 tables (`metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`) is **single-subject**: there is **no `userId` / `tenantId` / `clientId` anywhere**. Protocol versions and the supplement set are a single global lineage (Mac's). Genetics (variant → action, K1–K4) and lab panels live in app/seed data (`real-data.ts`, `seed-data.ts`), **not as first-class tables**. `syncStatus`/`syncVersion` exist on `metrics` for offline sync, but there is no identity, no roles, no isolation. This is correct for n=1 and is the entire thing multi-tenancy must add.

### 5.2 Multi-tenancy model
Introduce a clean identity + scoping spine:
- **`tenant`** — a practice/org (e.g., HIGHER). Billing + branding + config live here.
- **`user`** — a person who logs in, with `role ∈ {owner, practitioner, client}` (extend the enum pattern already used throughout). A coach = practitioner; a coached person = client; practice principal = owner.
- **`subject` (the coached person's data scope)** — the unit every health record hangs off. Model as `client` linked to a `tenant` and an assigned `practitioner`.
- **Scope every data table** with `tenantId` + `subjectId` (the metrics/protocol/supplement/correlation/cessation tables all gain the subject scope). Enforce isolation via Postgres **RLS** (Neon supports it) and/or an app-level tenancy guard. This is the single largest migration.
- **Per-client protocol versioning** — `protocolVersions`/`protocolChanges` move from one global lineage to **one lineage per subject** (P0–P6 becomes per-client). The 4-week iteration cadence is literally a new protocol version per client per cycle.

### 5.3 Promote the engine to first-class models
- **`geneticVariants`** + **`variantProtocolMap`** — persist the variant→action mappings with a **`confidence` (K1–K4)** field (today implicit in seed/types). This is the core IP; it deserves a real schema, versioning, and a citation/evidence field per mapping.
- **`labDocuments`** + an **ingest pipeline** — uploaded panels (blood/HTMA/DNA/gut/DUTCH) with a `labPanelType` enum; an extraction step (LLM-assisted parse → structured `metrics`, with human review — the LGS audit-trail pattern) so "labs read by hand" becomes "labs parsed + verified."
- **`reports`** — generated, confidence-graded lab→protocol reports (the proof slice), with templates and a render/audit trail (Trouvant report-gen lineage).

### 5.4 Delivery-surface modules
Each surface becomes a scoped module on the spine:
- **`trainingPrograms` / `workouts` / `neurotype`** — program builder keyed to neurotype + goals/equipment/injuries; 4-week regeneration.
- **`nutritionPlans`** — macro/keto/flexible plans; intake-driven.
- **`modalities`** — protocol tracking for sauna/light/cold/breath/sleep/circadian.
- **`coachingSessions` / `messages`** — 1:1 + group cadence, check-ins, 24/7 messaging.
- **`intake`** — forms, goals, neurotype, history, consent.
- **`contentCalendar`** — marketing/content scheduling + monitoring (podcast/social) — the martech automation layer.

### 5.5 Integration surface
- **Inbound diagnostics:** lab providers (blood/HTMA/DNA/gut/DUTCH), CGM, WHOOP/HRV, MyFitnessPal/nutrition.
- **Existing coach tooling (consolidate or bridge):** course/community platforms (Kajabi), video-membership (Uscreen), training apps (Trainerize-class), intake (JotForm), neurotype tests.
- **Orchestration:** n8n-style hooks for handoffs (intake → record → labs → ingest → engine → report → task), Asana-style ops priming for the client-journey pipeline (the LGS automation pattern).

### 5.6 Engine extraction
Carve the protocol-decision engine (variants + labs + metrics → confidence-graded protocol) into a **callable service/module** with a clear interface, separable from the dashboard UI, so it can serve: the practitioner console, the client app, the report generator, and (later) other tenants. This is the unit that productizes.

### 5.7 PHI / security posture
Per-client diagnostics = **PHI**. The platform needs tenant+subject isolation (RLS), encryption at rest/in transit, access control by role, an audit trail, consent capture at intake, and executed BAAs with all PHI-touching vendors. BAAs with Neon (Scale plan + HIPAA mode), Vercel (Pro + HIPAA add-on), and Anthropic (HIPAA-Ready API org) are tracked in `docs/COMPLIANCE-RUNBOOK.md` — that doc is the auditable proof-of-gate for Phases 3 and 5. New territory to gate carefully — anchored by Mac's regulated-data lineage (Basis medical-device-adjacent, LGS legal, Chorus healthcare/EHR).

### 5.8 Tech evolution
Stay on Remix + Neon + Drizzle; add: an auth/identity layer with roles; RLS or a tenancy guard; background jobs for ingest + report-gen + correlation recompute; LLM routing for lab parsing + protocol drafting **with human review** (never model-only). Keep the engine deterministic where it can be; use the model for extraction and drafting, not final clinical judgment.

---

## 6. Build order (engine-first inversion)

Narrative sequence (not GSD milestones — see §9):
- **M0 — Personal instrument (today).** The engine runs for n=1. Done.
- **M1 — Single practitioner, multi-client.** Add identity/roles + tenant/subject scoping + per-client protocol versioning + lab ingest + the report generator. One coach (the flagship) runs real clients. *This is where the proof slice and the first paid engagement live.*
- **M2 — Client-facing app.** The branded client experience: protocol, program, tracking, messaging, 4-week cadence — what the client sees.
- **M3 — Multi-coach + productize.** Multiple practitioners within a tenant (e.g., the flagship's other coaches), then multi-tenant productization for other practices. The engine extracted in §5.6 is what gets sold.

The order protects the moat: the hard engine is already built; everything after is scoping, delivery, and isolation around it.

---

## 7. Risks & guardrails

- **Over-build trap.** Do not build M2/M3 before M1 has a paying, real-world tenant. Traction before generalization (the documented NGT pattern; Trouvant's deferral precedent).
- **Diagnostic-pilot pattern.** Enter via a flat-fee diagnostic/blueprint with a working proof, not a full-platform commitment — faster cycle, more pattern data, lower complexity.
- **PHI/HIPAA** (§5.7) — gate explicitly; don't hand-wave health-data handling.
- **Single-operator reality.** NGT is one person; the platform must be buildable solo + AI-augmented (the LGS precedent), with scoped specialist subcontractors named only when needed.
- **Don't dilute the engine.** The temptation is to chase CRM/scheduling parity. The differentiator is the decision layer; protect it.

---

## 8. Why NGT / founder lineage

This is a credible **NGT venture seed**, not an extracurricular. It sits in Mac's founder lineage: **Basis** made raw physiological signal *meaningful and behavior-changing for everyday users* ($35M, →Intel); the functional-health platform is the spiritual successor — the protocol-decision + coaching-operations layer on top of today's far richer data sources. It's the most personally-grounded venture in the portfolio (Mac is the first user; the protocol is real), which is exactly the diagnostic-pilot pattern that has worked elsewhere.

---

## 9. Relationship to the HIGHER engagement + toward a roadmap

**Flagship instantiation:** the platform is being commercialized through **HIGHER (Tara Garrison)** as the first tenant — NGT builds her practice ops on this platform (hybrid/flagship; NGT retains platform IP to productize) and uses her real practice as the M1 proving ground. Full mapping in `ngtops/clients/higher/PLATFORM-FOR-HIGHER.md`. HIGHER's Discovery → Build → App engagement phases line up with M1 → M1/M2 → M2/M3 here.

**Toward a roadmap (separate step):** this brief is the definition. When ready, convert §4–§6 into a GSD `new-project` + `roadmap` (phases/milestones/success criteria) — likely run from the NGT ops repo or by initializing GSD in this repo. Zoetrop currently uses spec-kit (`.specify/`); reconcile spec-kit vs GSD at that point.
