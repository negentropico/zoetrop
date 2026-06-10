# Zoetrop

## What This Is

Zoetrop is a confidence-graded functional-health **protocol-decision engine**. Today it is an n=1 personal instrument that consolidates WHOOP biometrics, blood panels, DEXA body-comp, and genetic variants into evidence-weighted protocol decisions (graded K1–K4 by confidence). The direction is to grow it into a multi-tenant **operations platform** for functional-health practitioners (coaches/nutritionists/trainers) who run client practices on top of that engine.

## Core Value

The confidence-graded protocol-decision engine: turning heterogeneous diagnostics + wearables + genetics into a personalized, evidence-weighted protocol — and re-deriving it as the data changes — while showing the uncertainty honestly (K1 strong … K4 speculative) instead of faking certainty. This is the moat. If everything else fails, this must work.

## Requirements

### Validated

<!-- Shipped M0 capabilities, inferred from .planning/codebase/ map. Locked. -->

- ✓ 9-category metric system (`metricCategoryEnum`) with 4-state status taxonomy (optimal/borderline/deficient/excess) — existing (M0)
- ✓ Versioned protocol engine (P0–P6) with full change history + supplement tiers (tier1/2/3/as_needed) + version comparison — existing (M0)
- ✓ FAAH-informed 120+ day cessation tracker across 4 phases (acute→stabilization→clearing→optimization) — existing (M0)
- ✓ Insights: supplement↔metric correlations (Pearson + lag + p-value) and genetic-variant profile (K1–K4) — existing (M0)
- ✓ WHOOP JSON + Obsidian-vault import parsers (parse + preview only) — existing (M0)
- ✓ Remix (React Router 7) + Neon/Drizzle schema (8 tables) + Netlify CI/CD, TS strict — existing (M0)

### Active

<!-- M1: single practitioner, multi-client. The engine-first proving ground. Hypotheses until shipped. -->

- [x] Identity + auth layer with roles (owner / practitioner / client) — *Phase 3 ✓: Better-Auth email/password sign-in + invite-only `beforeSignUp` gate + `role` additional field (`input:false`); authenticated layout gates all app routes (AUTH-01/AUTH-02). **Phase 3.1 ✓:** account surface (AccountMenu + logout UI + `/settings` hub), per-invite single-use role-scoped tokens (hash-at-rest; generate/list/revoke; atomic fail-closed redemption on `/login`) replacing the shared `OWNER_INVITE_TOKEN`, and an enforced owner/practitioner/client authz model (`requireRole`/`can`/`assertSubjectAccess`) that feeds the Phase 7 RLS gate*
- [ ] Tenant + subject scoping on every data table, isolated via Postgres RLS — *Phase 3 ✓ (scoping): `tenant_id`/`subject_id` NOT NULL + composite index on all 8 tables, owner backfilled in live Neon (TEN-01); RLS enable+policies + SET LOCAL isolation deferred to Phase 7*
- [ ] Per-client (per-subject) protocol version lineage (P0–P6 becomes per-client; 4-week iteration = new version) — *Phase 3 ✓ (schema): `UNIQUE(tenant_id, subject_id, version)` on `protocol_versions`, old global unique dropped (TEN-04); per-client lineage behavior lands with the data layer (Phase 4+)*
- [ ] Promote the engine to first-class schema: `geneticVariants` + `variantProtocolMap` with `confidence` (K1–K4) + evidence/citation field
- [ ] Lab-ingest pipeline: upload panel → LLM-assisted parse → **human review** → structured `metrics`
- [ ] Confidence-graded lab→protocol report generation (the proof slice)
- [ ] Wire the app to Neon at runtime (replace the static-TypeScript data layer; commit a Drizzle migrations baseline) — *Phase 1 ✓: migrations baseline committed (DATA-03) + schema applied to Neon; runtime wiring (replace static data) remains for Phase 4*
- [ ] Test harness (Vitest) covering the engine (status classification, cessation phase math, Pearson) and the ingest parsers — *Phase 1 ✓: engine harness done (COMP-01, 39 tests); ingest-parser tests deferred to Phase 5*
- [ ] PHI security posture: encryption at rest/in transit, RBAC, audit trail, consent capture at intake — *full hardening + BAAs deferred to Phase 7 (pre-client gate); single-user pilot uses standard-tier infra (2026-06-08 re-scope)*

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
- **Current-state gaps to resolve early (from `.planning/codebase/CONCERNS.md`):** the app reads entirely from static TS modules — `db.server.ts` is wired but never called at runtime; import routes parse but never persist; no `migrations/` directory; zero tests; all 8 tables are single-subject (no `userId`/`tenantId`/`subjectId`); vestigial `syncStatus`/`syncVersion` columns; pervasive `subcategory: ... as any` casts; genetics/labs live in seed data, not first-class tables.
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
| Engine-first inversion: M1 before M2/M3 | the hard confidence-graded decision engine is the moat — ship it before delivery surfaces | — Pending |
| Server-authoritative Postgres (drop local-first) | PHI + multi-tenancy can't live in the browser | — Pending |
| Retire spec-kit, adopt GSD | spec-kit constitution went stale (Astro-era); GSD drives phased execution | — Pending |
| `Zoetrop` internal codename, public brand deferred | functional-health naming space is saturated; ship now, brand later | — Pending |
| HIGHER as first M1 tenant | real practice as the proving ground; diagnostic-pilot pattern, traction before generalization | — Pending |
| Tenancy via SET LOCAL `request.jwt.claims` + RLS (not JWK-native) | Phase 1 spike: pg_session_jwt v0.5.0 is available but the JWK-native path needs Neon's Authorize feature; SET LOCAL under a NOBYPASSRLS role is proven, role-agnostic, sufficient for M1 (D-04) | Phase 1 ✓ — drives Phase 3 |
| Pilot-first: defer PHI hardening to a pre-client gate (Phase 7) | Initial work is single-user pilot on the owner's own data (n=1); HIPAA/BAA obligations attach to *others'* PHI. Build Phases 2–6 on standard-tier infra + the subscription API; add tenant/subject columns in Phase 3 so the RLS retrofit is non-breaking | 2026-06-08 — re-scoped Phase 2 → "Vercel Cutover + Pilot Deploy Baseline", decoupled the gate from Phases 3/5, added Phase 7 |

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
*Last updated: 2026-06-10 after Phase 3.1 (account & roles — UX + authorization) complete — account surface + per-invite role-scoped tokens + enforced owner/practitioner/client authz live (code-review remediated; 14/14 must-haves verified). Next incomplete phase: Phase 4 (Static-to-DB data layer migration); Phase 4.1 was executed early.*
