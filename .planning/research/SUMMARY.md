# Research Summary: Zoetrop M1

**Synthesized:** 2026-06-07
**Sources:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md
**Overall confidence:** HIGH (the two remaining gaps are *decisions*, not research gaps)

## Executive Summary

Zoetrop M1 is a brownfield conversion of a working n=1 personal instrument into a multi-tenant practitioner platform. The engine already exists; M1's work is wiring it to a real database, isolating it per client behind Postgres RLS, and producing a confidence-graded lab→protocol report that a real practitioner can hand a real client. Every research thread converged on the same conclusion: the build sequence is **strictly dependency-ordered and admits no shortcuts**, because each layer is load-bearing for PHI isolation.

## Recommended Stack (additive to Remix + Neon/Drizzle + Netlify)

- **Auth/RBAC**: Better Auth 1.6.14 — Drizzle adapter (`drizzleAdapter(db,{provider:"pg"})`), `organization` plugin + `createAccessControl` for owner/practitioner/client roles, Remix handler, `dash()` audit logging. (Auth.js is Next-centric/JWT-first; Lucia retired; Clerk adds a third-party PHI processor.)
- **Multi-tenancy/RLS**: Drizzle 1.0 (currently rc) `pgTable.withRLS` + `crudPolicy`/`authUid` + Neon `pg_session_jwt`. **`SET LOCAL` inside `db.transaction()`** for tenant context (never bare `SET` — leaks across the pooler). Two DB roles: `adminDb` (migrations) vs `appDb` (authenticated, RLS active). *Drizzle 0.45.x → 1.0 upgrade is a prerequisite for the RLS API.*
- **LLM extraction**: Vercel AI SDK 6 `generateObject` + Zod 4 schema (schema-guaranteed output — no `JSON.parse` errors on medical values). Model is a provider decision (see Decision 1).
- **Background jobs**: Inngest 4.5 (`netlify-plugin-inngest` + `inngest/remix`) — step functions sidestep Netlify's 26s timeout. Added in the lab-ingest phase; no dependency on auth/RLS.
- **Testing**: Vitest 4.1 (zero extra config on the existing Vite 7).
- **File storage**: Netlify Blobs — confirm HIPAA BAA coverage before real PHI.

## Feature Shape

- **Table stakes** (or practitioners won't adopt): multi-client management, intake, per-client protocol customization, lab-result ingestion + review, confidence-graded reporting, practitioner monitoring.
- **Differentiators** (the wedge — no incumbent has these): genetics as first-class protocol drivers, explicit **K1–K4 confidence grading**, per-client versioned protocol lineage with the 4-week cadence as a system concept, and a **hard human-review gate** between LLM extraction and DB write.
- **Anti-features (hold the line at M1)**: scheduling, billing, messaging, client portal (M2), lab ordering, supplement dispensing, training/nutrition modules. Incumbents surveyed: Practice Better, Healthie, Heads Up Health, Optimal DX, FunctionalMind (closest on LLM lab parsing, but no confidence taxonomy or review gate).
- The **confidence-graded report is both a table stake and the proof slice** for the HIGHER diagnostic pilot. Working backward from it defines the build order.

## Two Unresolved Decisions (must resolve before execution)

**DECISION-01 — LLM provider for lab parsing (compliance vs. quality).** STACK.md recommends Claude for extraction quality; PITFALLS.md flags that sending PHI to any LLM without a signed BAA is a HIPAA violation, and that Anthropic's Claude API may not offer a healthcare BAA at the applicable tier (OpenAI does, under their enterprise agreement). The AI SDK's provider-agnostic `generateObject` means only the model parameter changes. **Confirm BAA status before Phase 5 planning.** → carried on Phase 2 (gate) / Phase 5 (use).

**DECISION-02 — Better Auth JWKS ↔ Neon `pg_session_jwt` wiring (unvalidated seam).** No worked example exists for this exact combination without Neon's hosted auth service. **Run a one-day spike in Phase 1.** If it fails, fall back to the `SET LOCAL app.tenant_id` pattern inside a Drizzle transaction (acceptable pre-PHI, must be replaced before production). Spike outcome gates Phase 3's implementation.

## Roadmap Implications (6 phases, dependency-ordered)

1. **Schema Baseline + Engine Tests + Auth Spike** — `migrations/` baseline, Drizzle 1.0 upgrade, Vitest against existing engine logic (status, cessation math, Pearson), the JWK spike. *No schema work is safe without the migrations baseline + correct RLS API.*
2. **PHI / BAA Compliance Gate** (a gate, not a feature) — Neon Scale + BAA + HIPAA mode; Netlify Enterprise + BAA; LLM-provider BAA (resolves Decision 1); pgAudit (`log_parameter=off`). Runs on owner-only data; unbypassable before multi-tenant structures.
3. **Identity + Tenancy Spine** — Better Auth (org plugin, roles); `tenants`/`users`/`subjects`; `tenantId`/`subjectId` on all 8 tables (NOT NULL after backfill, RLS + policies in the *same* migration); `withTenantDb` + SET LOCAL; migrator-vs-app roles; cross-tenant isolation test. Single most blocking dependency.
4. **Static-to-DB Data-Layer Migration** — all loaders query Neon via `withTenantDb`; owner data seeded; static files demoted to seed scripts; build output verified PHI-free; drop `syncStatus`/`syncVersion`; remove `as any` casts.
5. **Lab-Ingest Pipeline** — `labDocuments`/`labExtractions` state machine; Netlify Blobs; Inngest extract job; review UI showing source alongside extraction; three-layer validation (grounding + physiological range + per-field confidence); approve/reject → `metrics` + audit; consent capture.
6. **Engine Promotion + Confidence-Graded Reports** (proof slice) — `engine.server.ts` as a pure module; `geneticVariants`/`variantProtocolMap` with non-nullable K1–K4 `confidence`; `reports` table; K-level in the visible report body, hedged language enforced in-prompt, K4 disclaimer; `UNIQUE(tenant_id, subject_id, version)` on `protocolVersions`.

## Research Flags

- **Needs `/gsd:plan-phase --research-phase N`**: Phase 3 (if the Phase-1 JWK spike reveals problems); Phase 5 (extraction grounding-check implementation + Netlify Blobs PHI BAA coverage).
- **Standard patterns (skip research-phase)**: Phases 1, 2, 4, 6.

## Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Packages verified on npm + Context7 |
| Features | HIGH | 4 incumbent platforms, official sources |
| Architecture | HIGH | Mapped from actual codebase; RLS from official Neon/Drizzle docs |
| Pitfalls | HIGH | RLS/PHI from official docs; LLM from peer-reviewed clinical informatics |

**Remaining gaps:** LLM-provider BAA (Decision 1, a business call); Better Auth ↔ Neon JWK wiring (Decision 2, resolved by spike); Netlify Blobs PHI BAA coverage (confirm before Phase 5); Drizzle 1.0 GA timing (fall back to 0.45.x + planned upgrade if not GA).

---
*Synthesized 2026-06-07 from four parallel project-research agents.*
