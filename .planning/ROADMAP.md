# Roadmap: Zoetrop M1

## Overview

M1 converts the shipped n=1 instrument into a multi-tenant, RLS-isolated platform that produces a confidence-graded lab→protocol report a real practitioner can hand a real client. The build order is constrained by hard dependencies: every phase unblocks the next. Phases 1–3 are enabling layers (no end-user vertical slice delivered until Phase 3 completes). Phases 4–6 deliver the functional stack: live DB reads, lab ingest pipeline, and the proof-slice report generation. Phase 4.1 (inserted) applies the Zoetrope design system after the data layer goes live, so the UI of Phases 5–6 ships in-brand rather than being reskinned afterward.

**Pilot-first re-scope (2026-06-08):** Initial work is single-user pilot / prototyping on the owner's own data (n=1). PHI compliance *hardening* — HIPAA-mode + Neon/Vercel/LLM BAAs, pgAudit verification, and RLS enforcement/isolation — is deferred to **Phase 7 (PHI Compliance Hardening — Pre-Client Gate)**, which triggers before the first external client's PHI (multi-client / HIGHER launch). Phases 2–6 build and run on standard-tier infra + the standard subscription API; the tenancy *schema* (tenant/subject columns) is added in Phase 3 so the later RLS retrofit is non-breaking.

## Milestones

- 🚧 **M1 — Engine-First Platform** — Phases 1–6 + inserted 3.1/4.1, gated for multi-client by Phase 7 (in progress)

## Phases

- [x] **Phase 1: Schema Baseline + Engine Tests + Auth Spike** — Commit the Drizzle migrations baseline, install Vitest with engine unit tests, and spike the Better-Auth↔Neon-JWK integration seam (completed 2026-06-08, concurrent session)
- [x] **Phase 2: Vercel Cutover + Pilot Deploy Baseline** — Migrate the deploy target Netlify→Vercel on standard-tier infra, set the standard env vars, and stand up a live single-user production deploy. PHI/BAA/HIPAA hardening is deferred to the pre-client gate (Phase 7) (completed 2026-06-08)
- [x] **Phase 3: Identity + Tenancy Scoping** — Ship Better-Auth roles, `tenants`/`users`/`subjects` tables, and add `tenantId`/`subjectId` columns + composite index + per-subject protocol-version uniqueness to all 8 data tables. RLS enable+policies, the SET LOCAL wrapper, and cross-tenant isolation tests are deferred to Phase 7 (completed 2026-06-10)
- [ ] **Phase 3.1: Account & Roles — UX + Authorization** *(inserted)* — Build the authenticated account surface (nav + logout UI + preferences, per-invite role-scoped tokens) and a real owner/practitioner/client authorization model on top of the Phase 3 identity + tenant/subject scoping. Promoted from backlog 999.1 (owner UAT feedback)
- [ ] **Phase 4: Static-to-DB Data Layer Migration** — Wire all route loaders to Neon via `withTenantDb`, seed owner's M0 data into live tables, remove PHI from TypeScript source, retire sync vestiges and `as any` casts
- [x] **Phase 4.1: Design System Adoption** *(inserted)* — Bridge the Zoetrope brand tokens into Tailwind `@theme`, port signature components to typed TSX, retrofit the M0 screens in-brand, and commit a binding `UI-SPEC.md` so Phases 5–6 build in-brand. Gated on a claude.ai/design roundtrip (completed 2026-06-08)
- [ ] **Phase 5: Lab Ingest Pipeline** — Upload→LLM-parse→grounding-validate→human-review→approve/commit state machine with audit logging and consent capture
- [ ] **Phase 6: Engine Promotion + Confidence-Graded Reports** — Promote `geneticVariants`/`variantProtocolMap` to first-class schema (non-null K1–K4), extract pure engine module, generate confidence-graded lab→protocol reports
- [ ] **Phase 7: PHI Compliance Hardening — Pre-Client Gate** *(deferred hardening)* — Before the first external client's PHI: Neon HIPAA-mode + BAA, Vercel HIPAA add-on + BAA, LLM-provider HIPAA-Ready BAA, pgAudit verification, atomic RLS enable+policies + SET LOCAL wrapper + cross-tenant isolation tests, and PHI read-access (SELECT) logging — the hard release gate for multi-client launch

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

### Phase 2: Vercel Cutover + Pilot Deploy Baseline

**Goal**: The deploy target is migrated Netlify→Vercel and a live single-user production deploy is running on standard-tier infra — the pilot/prototyping baseline. Full PHI/BAA/HIPAA hardening is intentionally deferred to **Phase 7** (the pre-client gate), since the only data in scope is the owner's own (n=1).
**Depends on**: Phase 1
**Requirements**: (infra/ops — no v1 requirement closes here; COMP-02/COMP-03 hardening moved to Phase 7)
**Re-scope note (2026-06-08)**: Originally a hard PHI/BAA gate. Re-scoped to a lightweight Vercel cutover + pilot deploy baseline; the heavy compliance work (Neon HIPAA-mode, Neon/Vercel/LLM BAAs, pgAudit verification) is deferred to Phase 7 and triggers before the first external client's PHI. When that gate arrives, Vercel HIPAA is a self-serve **Pro add-on** (not Enterprise).
**Success Criteria** (what must be TRUE):

  1. ✓ React Router 7 Vercel preset configured, `netlify.toml` removed, `drizzle-kit` prefers the unpooled Neon URL; `npm run build` + `npm test` green (done — 02-01)
  2. ✓ `CLAUDE.md` + `docs/PLATFORM.md` updated to Vercel; `docs/COMPLIANCE-RUNBOOK.md` scaffolded as the Phase-7 hardening checklist (done — 02-02)
  3. Standard env vars (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) set in the Vercel project on the **standard Pro plan** (no HIPAA add-on yet), pointing at the existing standard-tier Neon project
  4. A successful production deploy returns HTTP 200 at `https://zoetrop.vercel.app` with confirmed DB connectivity to the existing Neon project; Netlify is retired
  5. The deferral of PHI/BAA/HIPAA hardening to Phase 7 (trigger: before the first external client's PHI) is recorded in `docs/COMPLIANCE-RUNBOOK.md`

**Plans**: 4 plans in 3 waves
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Track A: Vercel preset cutover + Netlify removal + drizzle unpooled URL (build/shell Wave-0 asserts)
- [x] 02-02-PLAN.md — Track A: scaffold docs/COMPLIANCE-RUNBOOK.md + update CLAUDE.md/docs/PLATFORM.md to Vercel

**Wave 2** *(blocked on 02-02)*

- [x] 02-03-PLAN.md — Pilot deploy baseline: set the 4 standard Vercel env vars on the standard Pro plan + standard-tier Neon (no HIPAA add-on)

**Wave 3** *(blocked on 02-01/02-02/02-03)*

- [x] 02-04-PLAN.md — Production deploy + DB connectivity check; record the Phase-7 hardening deferral; final baseline SC re-check

### Phase 3: Identity + Tenancy Scoping

**Goal**: The platform has a working identity layer (Better-Auth email/password + `owner`/`practitioner`/`client` roles) and a tenancy data model — `tenantId`/`subjectId` columns on all 8 tables (backfilled with the owner's IDs), a composite index, and per-subject protocol-version uniqueness. The schema is multi-tenant-ready; **RLS enforcement and cross-tenant isolation proofs are deferred to Phase 7** so the single-user pilot is not blocked.
**Depends on**: Phase 2 (live Vercel deploy baseline)
**Requirements**: AUTH-01, AUTH-02, TEN-01, TEN-04
**Deferred to Phase 7**: atomic RLS enable+policies, the `withTenantDb` SET LOCAL transaction wrapper + pool-leak test, the cross-tenant isolation test (TEN-02, TEN-03), practitioner subject-scoping (AUTH-03), and the immutable auth/access audit log (AUTH-04). Until then, data is scoped at the application layer (owner = sole tenant).
**Success Criteria** (what must be TRUE):

  1. A user can sign in with email + password via Better-Auth and stay signed in across browser sessions; their role (`owner` / `practitioner` / `client`) is readable from the session and gates route access
  2. All 8 existing data tables (`metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`) have non-nullable `tenantId` and `subjectId` columns, backfilled with the owner's IDs, with a composite index on `(tenant_id, subject_id)` confirmed via `\d+ table_name`
  3. Protocol version lineage is unique on `(tenantId, subjectId, version)` — the old global `UNIQUE(version)` constraint is replaced; `pg_indexes` confirms the new constraint

**Plans**: 5 plans in 3 waves
Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Wave-0 foundation: gated install of @better-auth/drizzle-adapter + tsx, vite.config test glob for tests/**, the 6 VALIDATION.md contract test files (red) [AUTH-01, AUTH-02, TEN-01, TEN-04]
- [x] 03-02-PLAN.md — Schema layer: db/auth-schema.ts (Better-Auth tables) + app_role enum + tenants/subjects spine + nullable tenant_id/subject_id on 8 tables + drop global version unique; generate migrations 0001/0002 [AUTH-02, TEN-01, TEN-04]

**Wave 2** *(blocked on Wave 1)*

- [x] 03-03-PLAN.md — Auth server core: auth.server.ts (email/password + drizzleAdapter + role input:false + invite-only beforeSignUp hook + 30-day session) + auth-client.ts + /api/auth/* resource route [AUTH-01, AUTH-02]

**Wave 3** *(blocked on 03-03; 03-04 and 03-05 run in parallel — no file overlap)*

- [x] 03-04-PLAN.md — Owner seed (via auth.api.signUpEmail from 03-03) + backfill + NOT NULL/index/constraint migrations (0003/0004) + [BLOCKING] db:migrate to Neon + DB schema-introspection verification [TEN-01, TEN-04]
- [x] 03-05-PLAN.md — Public/private routing split: authenticated _app/ layout (session redirect) + landing/login/logout + route move under _app/ + remove PILOT_BASIC_AUTH from root.tsx + delete Vercel env var (D-05) [AUTH-01, AUTH-02]

### Phase 03.1: Account & Roles — UX + Authorization (INSERTED)

**Goal**: The authenticated app has a real account surface and authorization model on top of the Phase 3 identity layer — a nav affordance to log out and reach preferences/account settings, an invite function that issues per-invite single-use role-scoped tokens (replacing the single shared `OWNER_INVITE_TOKEN`), and an enforced owner/practitioner/client permission model that agrees with the tenant/subject scoping and feeds the deferred Phase 7 RLS gate
**Depends on**: Phase 3 (identity engine: Better-Auth sign-in, `role` field, invite gate, tenant/subject scoping). Inserted before Phase 4 — promoted from backlog 999.1 (owner UAT feedback, 2026-06-09).
**Requirements**: extends AUTH-01/AUTH-02; relates to TEN-01 scoping + the Phase 7 RLS gate (exact IDs resolved in discuss-phase)
**Scope** (see `.planning/phases/03.1-account-roles-ux-authorization/CAPTURE.md` for full detail + root-cause analysis):

  1. **Account navigation** — an account nav/menu in the authenticated shell (`TopNav`/`AppShell`) exposing logout (POST to the existing `/logout` action) + a preferences/account-settings entry point. Today there is no logout UI — the only way out is clearing cookies.
  2. **Invite function** — an account-page invite flow that moves from the single shared `OWNER_INVITE_TOKEN` env secret to per-invite tokens: single-use, role-scoped (the token encodes practitioner vs client), with expiry. Likely a new `invites` table (token hash, role, tenant_id, created_by, expires_at, consumed_at) + generate/list/revoke UI.
  3. **Role permissions** — define and enforce owner (full control) / practitioner (manage their tenant's subjects) / client (own data only) authorization. Decide where authz is enforced (route loaders/actions via `session.user.role` + subject-ownership checks, and/or DB-level RLS) and coordinate with the Phase 7 RLS + `SET LOCAL` work so app-layer authz and DB-layer isolation agree.

**Note**: The theme-toggle defect originally captured here was resolved out-of-band (commit 7678592, debug session `theme-toggle-ssr-hydration`) and is NOT in this phase's scope.

**Open scoping question** (resolve in discuss-phase): whether this stays one phase or splits (account-nav + invite as a UI/identity slice vs role-permissions/authz sequenced against the Phase 7 RLS gate), and whether the per-invite `invites` table lands before or after the Phase 4 data-layer migration.

**Plans**: TBD — run `/gsd-discuss-phase 03.1`, then `/gsd-plan-phase 03.1`

### Phase 4: Static-to-DB Data Layer Migration

**Goal**: All route loaders read live data from Neon; the owner's M0 data is in the real tables; no PHI exists in TypeScript source files or the client bundle; schema is clean of vestiges
**Depends on**: Phase 3 (tenancy columns + identity must be in place before data migrates into tenant-scoped tables). RLS enforcement lands in Phase 7 — in the interim Phase 4 scopes reads at the application layer (`WHERE tenant_id/subject_id`).
**Requirements**: DATA-01, DATA-02, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):

  1. Every route loader reads live data from Neon scoped to the owner's tenant/subject (application-level `WHERE` in the interim; wrapped by `withTenantDb` once RLS lands in Phase 7) — no route reads from `real-data.ts`, `protocol-data.ts`, or `seed-data.ts` at runtime; a CI lint rule blocks direct imports of `*-data.ts` from non-seed contexts
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
**Depends on**: Phase 4 (live DB + tenant-scoped tables required); Phase 4.1 (the upload/review UI is built against its `UI-SPEC.md`). NOTE: client-PHI extraction via the LLM is gated by the **Phase 7** LLM BAA; single-user/owner lab extraction may run on the standard subscription API in the interim.
**Requirements**: LAB-01, LAB-02, LAB-03, LAB-04, LAB-05, LAB-06
**Risk note**: The LLM provider BAA (DECISION-02) is deferred to **Phase 7** (pre-client gate). Single-user/owner lab extraction may use the standard subscription API (no-training default); extraction of any *external client's* PHI is blocked until the Phase 7 LLM BAA is signed and recorded.
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

### Phase 7: PHI Compliance Hardening — Pre-Client Gate (DEFERRED HARDENING)

**Goal**: Before the first external client's identifiable health data enters the system, the full PHI compliance envelope is executed and proven: HIPAA-mode + signed BAAs across every subprocessor (Neon, Vercel, LLM provider), pgAudit verification, atomic RLS enable+policies with SET LOCAL enforcement + a cross-tenant isolation proof, and PHI read-access (SELECT) logging. A hard release gate for multi-client / HIGHER production — not a feature.
**Gate / Trigger**: Activated before onboarding the first non-owner client (multi-client production launch). Phases 2–6 and the single-user pilot run on standard-tier infra without it. (Re-scope 2026-06-08 — see PROJECT.md Key Decisions; confirm the exact legal trigger with counsel.)
**Depends on**: Phases 3 (tenancy columns + identity), 4 (live DB), 5 (lab ingest), 6 (reports) — the feature stack is built single-user first, then hardened for external clients here.
**Requirements**: COMP-02, COMP-03, TEN-02, TEN-03, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):

  1. Neon on the Scale plan with HIPAA mode enabled on the EXISTING project (verified project ID matches the live `DATABASE_URL`); a signed Neon BAA with date recorded in `docs/COMPLIANCE-RUNBOOK.md`
  2. Vercel HIPAA add-on (self-serve Pro add-on) active + a signed Vercel BAA recorded
  3. The chosen LLM provider has a signed HIPAA-Ready/BAA covering the extraction use case (ZDR + no-training, D-03), recorded; client-PHI extraction unblocked
  4. pgAudit verified: a Neon Support sample proves entries record `{user, table, operation, timestamp}` and NOT bind parameters (`log_parameter = off`), recorded in the runbook
  5. Atomic RLS enable+policies on all 8 tenant-scoped tables; every tenant-scoped DB interaction runs inside `withTenantDb(ctx, fn)` issuing `SET LOCAL app.tenant_id` / `app.subject_id`; a pool-reuse test confirms no context leak; a committed cross-tenant isolation test (Tenant A writes, Tenant B reads zero) runs in CI
  6. PHI read-access (SELECT) object-level audit logging enabled on PHI tables via Neon Support (the Phase-3-carry-forward recorded in the runbook)
  7. A practitioner can access only the subjects assigned to them within their tenant (AUTH-03); auth/access events are written to an immutable audit log (AUTH-04)

**Plans**: TBD — plan when approaching multi-client launch

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema Baseline + Engine Tests + Auth Spike | 5/5 | Complete   | 2026-06-08 |
| 2. Vercel Cutover + Pilot Deploy Baseline | 4/4 | Complete   | 2026-06-08 |
| 3. Identity + Tenancy Scoping | 5/5 | Complete   | 2026-06-10 |
| 3.1. Account & Roles — UX + Authorization *(inserted)* | 0/TBD | Not started | - |
| 4. Static-to-DB Data Layer Migration | 0/TBD | Not started | - |
| 4.1. Design System Adoption *(inserted)* | 9/9 | Complete   | 2026-06-08 |
| 5. Lab Ingest Pipeline | 0/TBD | Not started | - |
| 6. Engine Promotion + Confidence-Graded Reports | 0/TBD | Not started | - |
| 7. PHI Compliance Hardening — Pre-Client Gate *(deferred)* | 0/TBD | Deferred | - |

## Backlog

_No open backlog items. (999.1 Account & Roles promoted to Phase 3.1 on 2026-06-09.)_
