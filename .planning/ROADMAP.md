# Roadmap: Zoetrop M1

## Overview

M1 converts the shipped n=1 instrument into a multi-tenant, RLS-isolated platform that produces a confidence-graded lab→protocol report a real practitioner can hand a real client. The build order is constrained by hard dependencies: every phase unblocks the next. Phases 1–3 are enabling layers (no end-user vertical slice delivered until Phase 3 completes). Phases 4–6 deliver the functional stack: live DB reads, lab ingest pipeline, and the proof-slice report generation. Phase 4.1 (inserted) applies the Zoetrope design system after the data layer goes live, so the UI of Phases 5–6 ships in-brand rather than being reskinned afterward.

## Milestones

- 🚧 **M1 — Engine-First Platform** — Phases 1–6 + inserted 4.1 (in progress)

## Phases

- [x] **Phase 1: Schema Baseline + Engine Tests + Auth Spike** — Commit the Drizzle migrations baseline, install Vitest with engine unit tests, and spike the Better-Auth↔Neon-JWK integration seam (completed 2026-06-08)
- [ ] **Phase 2: PHI / BAA Compliance Gate + Vercel Cutover** — Migrate the deploy target Netlify→Vercel, execute Neon + Vercel + LLM-provider BAAs, enable HIPAA on the Neon project, configure pgAudit — a release gate before any client PHI is written
- [ ] **Phase 3: Identity + Tenancy Spine with RLS** — Ship Better-Auth org roles, `tenants`/`users`/`subjects` tables, add `tenantId`/`subjectId` to all 8 data tables, atomic RLS-enable+policies, SET LOCAL transaction wrapper, cross-tenant isolation tests
- [ ] **Phase 4: Static-to-DB Data Layer Migration** — Wire all route loaders to Neon via `withTenantDb`, seed owner's M0 data into live tables, remove PHI from TypeScript source, retire sync vestiges and `as any` casts
- [ ] **Phase 4.1: Design System Adoption** *(inserted)* — Bridge the Zoetrope brand tokens into Tailwind `@theme`, port signature components to typed TSX, retrofit the M0 screens in-brand, and commit a binding `UI-SPEC.md` so Phases 5–6 build in-brand. Gated on a claude.ai/design roundtrip
- [ ] **Phase 5: Lab Ingest Pipeline** — Upload→LLM-parse→grounding-validate→human-review→approve/commit state machine with audit logging and consent capture
- [ ] **Phase 6: Engine Promotion + Confidence-Graded Reports** — Promote `geneticVariants`/`variantProtocolMap` to first-class schema (non-null K1–K4), extract pure engine module, generate confidence-graded lab→protocol reports

## Phase Details

### Phase 1: Schema Baseline + Engine Tests + Auth Spike

**Goal**: The project has a committed migrations baseline, a working Vitest harness covering the engine's critical pure functions, and a resolved spike on the Better-Auth↔Neon-JWK integration seam — so Phase 3 can build auth and RLS without re-discovering technical risk
**Depends on**: Nothing (first phase)
**Requirements**: DATA-03, COMP-01
**Success Criteria** (what must be TRUE):

  1. `remix-app/migrations/` directory exists, is committed to git, and `drizzle-kit migrate --dry-run` completes without error against the Neon project
  2. `vitest run` passes with unit tests covering: `classifyMetricStatus()` at optimal/borderline/deficient/excess boundaries; `getCessationPhase()` at days 1, 21, 22, 60, 61, 120, 121, and a post-protocol date (with injectable `now` parameter, no hardcoded start date); `computePearson()` with known inputs
  3. A spike document or merged proof-of-concept confirms Better-Auth can issue a JWT that Neon verifies via JWK endpoint, with `tenantId` and `subjectId` claims readable from `current_setting()` inside a Postgres transaction — the integration seam is proven, not assumed

**Plans**: 5 plans in 2 waves
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Install + configure the Vitest harness (deps, scripts, vite.config test block; empty run exits 0; package legitimacy gate)
- [x] 01-02-PLAN.md — Drizzle migrations baseline (as-is snapshot of 8 tables/7 enums; migrate --dry-run; prod tracking record) [DATA-03]
- [x] 01-03-PLAN.md — Better-Auth↔Neon-JWK / RLS spike on a disposable branch (SET LOCAL vs SET leak; verdict in 01-SPIKE-FINDINGS.md)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-04-PLAN.md — Extract shared getMetricStatus into app/lib/metrics.ts + status-classification boundary tests [COMP-01]
- [x] 01-05-PLAN.md — Inject now into getCessationDay + cessation boundary tests + Pearson correlation tests [COMP-01]

### Phase 2: PHI / BAA Compliance Gate + Vercel Cutover

**Goal**: The deploy target is migrated from Netlify to Vercel, and all BAA-required agreements are executed and verified before any client PHI enters the system — this is a hard release gate, not a feature
**Depends on**: Phase 1
**Requirements**: COMP-02, COMP-03
**Risk note**: The LLM provider BAA is an open decision (see SUMMARY.md DECISION-02). OpenAI has a BAA; confirm the API tier in use is covered, or select an alternative provider with a signed BAA, before Phase 5 begins. This gate applies to the LLM provider as much as to Neon and the hosting platform (Vercel). Vercel HIPAA/BAA typically requires the Enterprise tier — confirm the paid plan covers it (decision folded in 2026-06-08 when the deploy target moved Netlify→Vercel).
**Success Criteria** (what must be TRUE):

  1. Neon project is on the Scale plan with HIPAA mode enabled (verified by checking project settings); a signed Neon BAA with execution date is recorded in an ops runbook
  2. The app is deployed on Vercel (Netlify retired); the Vercel plan that supports HIPAA/BAA is active and a signed Vercel BAA with execution date is recorded in the same runbook
  3. The chosen LLM provider (Phase 5 prerequisite) has a signed BAA recorded in the runbook; the provider and tier are confirmed to cover the PHI-bearing extraction use case
  4. pgAudit is enabled on the Neon project; a test query confirms audit entries record `{user, table, operation, timestamp}` and explicitly do NOT record bind-parameter values (i.e., `log_parameter = off` confirmed)
  5. Netlify→Vercel migration is complete: React Router 7 Vercel preset configured, Netlify adapter/`netlify.toml` removed, `DATABASE_URL`(+unpooled) and auth secrets set in Vercel project env (the app already falls back `NETLIFY_DATABASE_URL || DATABASE_URL`), a successful production deploy on Vercel, and CLAUDE.md / `docs/PLATFORM.md` updated to reflect Vercel (URLs, no Netlify site id)

**Plans**: TBD

### Phase 3: Identity + Tenancy Spine with RLS

**Goal**: The platform has a working identity layer (Better-Auth org roles), tenant/subject scoping on all data tables, atomic RLS policies enforced via SET LOCAL, and automated proof that cross-tenant isolation holds — the load-bearing security contract for all subsequent phases
**Depends on**: Phase 2 (PHI gate must be verified before writing any multi-subject data to Neon)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, TEN-01, TEN-02, TEN-03, TEN-04
**Success Criteria** (what must be TRUE):

  1. A user can sign in with email + password via Better-Auth and stay signed in across browser sessions; their role (`owner` / `practitioner` / `client`) is readable from the session and gates route access
  2. All 8 existing data tables (`metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`) have non-nullable `tenantId` and `subjectId` columns, backfilled with the owner's IDs, with a composite index on `(tenant_id, subject_id)` confirmed via `\d+ table_name`
  3. Cross-tenant isolation test passes: a script authenticating as Tenant A writes a row to `metrics`, then authenticates as Tenant B and confirms zero rows returned — the test is committed to the test suite and runs in CI
  4. Every DB interaction that touches tenant-scoped data runs inside `withTenantDb(ctx, fn)` which issues `SET LOCAL app.tenant_id` and `SET LOCAL app.subject_id` as the first statements in a `db.transaction()` wrapper; a pool-reuse integration test confirms no context leaks across sequential requests
  5. Protocol version lineage is unique on `(tenantId, subjectId, version)` — the old global `UNIQUE(version)` constraint is replaced; `pg_indexes` confirms the new constraint

**Plans**: TBD

### Phase 4: Static-to-DB Data Layer Migration

**Goal**: All route loaders read live data from Neon; the owner's M0 data is in the real tables; no PHI exists in TypeScript source files or the client bundle; schema is clean of vestiges
**Depends on**: Phase 3 (tenancy spine + RLS must be in place before any data is migrated into tenant-scoped tables)
**Requirements**: DATA-01, DATA-02, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):

  1. Every route loader in the app calls `withTenantDb(ctx, fn)` — no route reads from `real-data.ts`, `protocol-data.ts`, or `seed-data.ts` at runtime; a CI lint rule blocks direct imports of `*-data.ts` from non-seed contexts
  2. The owner's M0 metrics, protocol versions, supplements, cessation log, and correlations are present as rows in Neon under the owner's `tenantId`/`subjectId`; the dashboard renders the same data as M0 (visual spot-check passes)
  3. `grep -r "real-data\|protocol-data\|seed-data" remix-app/app/routes/` returns no matches; the Netlify function bundle output contains no PHI strings (verified via `grep` against the build artifact)
  4. Vestigial `syncStatus`/`syncVersion` columns are absent from all tables (confirmed via schema introspection); all `subcategory: ... as any` casts are replaced with typed alternatives; `tsc --noEmit` passes with zero errors

**Plans**: TBD

### Phase 04.1: Design System Adoption (INSERTED)

**Goal**: The Zoetrope brand design system is a working, typed foundation in the app — tokens bridged into Tailwind `@theme`, signature components ported to TSX, the M0 screens retrofit in-brand, and a binding `UI-SPEC.md` committed — so every subsequent UI surface (Phases 5–6) is built in-brand from the first commit instead of being reskinned later
**Depends on**: Phase 4 (reskin once, against the live-data screens — not the static ones)
**Gate**: Blocked on a **claude.ai/design roundtrip** — the screens package (`docs/design-system/uploads/screens-package/`) is handed out, and revised screens + resolved design questions return before planning. Strategy, decisions, and integration architecture are recorded in `docs/DESIGN-SYSTEM-ADOPTION.md`.
**Requirements**: UI-01
**Success Criteria** (what must be TRUE):

  1. The brand token set from `docs/design-system/tokens/` (warm neutral ramp, Energy/Vital/Focus families, type scale, Fibonacci spacing, warm ink-tinted shadows, frame radii, motion) is bridged into the app's Tailwind `@theme`; Inter is replaced by Space Grotesk / Hanken Grotesk / Space Mono; `base.css` helpers (`.zt-eyebrow`, `.zt-readout`, tabular numerals, warm focus ring) are available app-wide
  2. The signature components are ported to typed TSX under `app/components/ui/` (MetricRing, Card, Stat, Badge, SegmentedControl) plus the gaps the brand DS lacks (DataTable, SegmentedPhaseBar, UploadDropzone); `tsc --noEmit` passes with zero errors and no `.jsx` / `_ds_bundle.js` runtime is shipped into the app
  3. The 8 archetype screens (dashboard, metrics overview, metric category, metric detail, protocol overview, cessation, correlations, WHOOP import) render in-brand — no emoji icons (Lucide instead), no gradient progress bars (segmented/solid), periwinkle as the action color, warm Paper surfaces — verified by visual spot-check against the revised roundtrip designs
  4. The two open design decisions are resolved in code and documented: the 9-category → 3-family color/icon system, and the 4-status palette (optimal/borderline/deficient/excess) mapped to brand tokens
  5. A responsive nav system replaces the current non-collapsing header (which overflows to ~449px on mobile); touch targets ≥ 44px
  6. `UI-SPEC.md` is committed (produced via `/gsd:ui-phase 04.1`) and is the binding design contract referenced by Phases 5 and 6

**UI hint**: yes
**Plans**: TBD — run `/gsd:ui-phase 04.1` after the roundtrip to produce `UI-SPEC.md`, then `/gsd:plan-phase 04.1`
Likely plans:

- [ ] Bridge tokens into Tailwind `@theme` + fonts + `base.css` helpers [UI-01]
- [ ] Port signature components to typed TSX + new DataTable / SegmentedPhaseBar / UploadDropzone
- [ ] Retrofit screens 01–07 to brand (class swaps + component substitution)
- [ ] Resolve category color/icon system + 4-status palette in code

**Cross-cutting constraints:**

- Every loader, route, and data value is preserved — only markup/classes/components change

### Phase 5: Lab Ingest Pipeline

**Goal**: A practitioner can upload a lab PDF, the system asynchronously extracts structured values with LLM assistance, those values are grounded and range-validated before review, the practitioner reviews fields side-by-side with the source document and approves or rejects each, and only approved metrics are written to the subject's record with full audit logging — consent is captured at intake
**Depends on**: Phase 4 (live DB + tenant-scoped tables required); Phase 2 BAA gate (LLM provider BAA must be in place before PHI is sent to the model); Phase 4.1 (the upload/review UI is built against its `UI-SPEC.md`)
**Requirements**: LAB-01, LAB-02, LAB-03, LAB-04, LAB-05, LAB-06
**Risk note**: The LLM provider BAA is DECISION-02 from SUMMARY.md — it must be resolved and verified (Phase 2) before any extraction job sends PHI to an LLM API. If the provider BAA is not in place, Phase 5 is blocked.
**Success Criteria** (what must be TRUE):

  1. A practitioner can upload a lab PDF via `/ingest/upload`; the action immediately returns a `processing` state (the upload does not block on LLM extraction); a `labDocuments` row with `status = 'uploaded'` is committed within 2 seconds of the POST completing
  2. The asynchronous LLM extraction job completes and populates `labExtractions` rows with `status = 'pending_review'`; every extracted numerical value has a `sourceTextSnippet` field populated with the verbatim text from the source document that grounds it; any extracted value that cannot be grounded is flagged `confidence = low` rather than propagated silently
  3. Every extracted value passes a physiological-range sanity check against known reference bounds for that metric+unit; out-of-range values surface a `rangeFlag` in the review UI rather than being silently accepted
  4. The review UI (`/ingest/review`) renders the source document page alongside extracted fields; a practitioner can approve, edit, or reject each field individually; there is no bulk-approve path that bypasses field-level review
  5. Only practitioner-approved metrics are written to the `metrics` table (with `tenantId`/`subjectId`); each approval produces an `auditLog` entry recording `{userId, role, table: 'metrics', operation: 'insert', tenantId, subjectId, timestamp}` with no PHI field values in the log
  6. The consent form is presented at client intake before any PHI is stored; a `consentLog` record with `{subjectId, consentedAt, consentVersion}` is persisted and required for any subsequent data write for that subject

**UI hint**: yes
**Plans**: TBD

### Phase 6: Engine Promotion + Confidence-Graded Reports

**Goal**: Genetic variants and variant→protocol mappings are first-class schema with non-nullable K1–K4 confidence; the decision engine is a pure, dependency-free module; a practitioner can generate a confidence-graded lab→protocol report where every recommendation shows its K-level in the visible body — the proof slice that validates the whole M1 stack end-to-end
**Depends on**: Phase 4 (live DB), Phase 5 (committed metrics available for report input); Phase 4.1 (the report UI is built against its `UI-SPEC.md`)
**Requirements**: ENG-01, ENG-02, ENG-03, RPT-01, RPT-02, RPT-03
**Success Criteria** (what must be TRUE):

  1. `geneticVariants` and `variantProtocolMap` tables exist in Neon with a non-nullable `confidence` enum field (`k1|k2|k3|k4`); the owner's existing genetic variant data is migrated from `seed-data.ts` into these tables; `SELECT COUNT(*) FROM genetic_variants WHERE confidence IS NULL` returns 0
  2. `app/lib/engine.server.ts` contains only pure TypeScript functions (`classifyMetricStatus`, `getCessationPhase`, `computePearson`, `mapVariantToProtocol`) with zero imports from Drizzle or Remix; `vitest run` covers all engine functions against both DB-seeded data and synthetic inputs; the module is callable from a Node.js script with no server context
  3. A practitioner can trigger report generation for a subject via `/reports/generate`; the resulting `reports` row is written to Neon with `tenantId`/`subjectId` scope; the report is readable at `/reports/:id`
  4. Every recommendation in the generated report displays its K1–K4 confidence level in the visible body — not in a tooltip, footer, or metadata field — using the template `"K{N} ({label}): {recommendation text}"`
  5. K4 recommendations carry an explicit visible disclaimer: "This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting."; a lint test asserts no generated report body contains imperative patterns (`"you should"`, `"you must"`, `"you need to"`) and that every K4 block contains the disclaimer string

**UI hint**: yes
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema Baseline + Engine Tests + Auth Spike | 5/5 | Complete   | 2026-06-08 |
| 2. PHI / BAA Compliance Gate | 0/TBD | Not started | - |
| 3. Identity + Tenancy Spine with RLS | 0/TBD | Not started | - |
| 4. Static-to-DB Data Layer Migration | 0/TBD | Not started | - |
| 4.1. Design System Adoption *(inserted)* | 4/8 | In Progress|  |
| 5. Lab Ingest Pipeline | 0/TBD | Not started | - |
| 6. Engine Promotion + Confidence-Graded Reports | 0/TBD | Not started | - |
