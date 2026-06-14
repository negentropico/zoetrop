# Phase 4: Static-to-DB Data Layer Migration - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 wires all 16 authenticated route loaders to read live data from Neon — scoped at the application layer to the owner's `tenantId`/`subjectId` (`WHERE` clauses; the `withTenantDb` SET LOCAL/RLS wrapper is Phase 7) — seeds the owner's M0 data into the real tables, removes PHI from committed TypeScript source and the client bundle, and sweeps schema/code vestiges. Closes **DATA-01, DATA-02, DATA-04, DATA-05**.

**In scope:** owner-data seed scripts (metrics, protocol versions/changes, milestones, supplements, supplement log, cessation log, correlations, subject genotypes), loader rewiring across all `_app/` routes, a new tenant-scoped `subject_genotypes` table (PHI plane only), the full vestige sweep, the parity-snapshot cut-over harness, the CI lint rule blocking `*-data.ts` imports from non-seed contexts, and deletion of the PHI data arrays after verified cut-over.

**Out of scope:** RLS enforcement / `withTenantDb` / isolation tests (Phase 7); the genetics **knowledge plane** — `variantProtocolMap`, K1–K4 grading governance, evidence/citations (Phase 6, with a mandatory deep-design + adversarial-review entry gate); import-route persistence (Phase 5 ingest pipeline); correlation re-computation from live data (Phase 6 engine work).

</domain>

<decisions>
## Implementation Decisions

### Genetics + correlations (the scope/sequencing call)
- **D-01: Split the conflated M0 genetics model.** M0's flat `GeneticVariant` record mixes per-subject PHI (genotype) with shared engine knowledge (variant→protocol mapping, K-grade). Phase 4 lands only the **PHI plane**: a tenant/subject-scoped `subject_genotypes` table (gene, genotype, assay/source) seeded with the owner's 15 variants' genotype facts.
- **D-02: The knowledge plane waits for Phase 6 — deliberately.** No interim `geneticVariants`/`variantProtocolMap` tables, no K-grade columns in the DB now. The owner explicitly flagged that the engine data model has never been methodically designed for multi-tenant practitioner/client use. **Phase 6 entry gate (binding):** before planning Phase 6, run a dedicated design pass (subject-genotypes vs knowledge-base split, K-grading governance, practitioner-vs-client presentation) via `/gsd:spec-phase 6` plus adversarial review (cross-AI), and `/gsd:ai-integration-phase` if LLM-assisted curation enters scope.
- **D-03: Interim genetics rendering = server-only knowledge join.** The genetics page/dashboard join `subject_genotypes` rows (DB) with a server-only knowledge module (the trimmed K-grade/protocolAction display strings from today's seed-data, which are not PHI) keyed by gene. The module is explicitly marked "retired by Phase 6". The genetics UI does not regress.
- **D-04: Correlations seed into the existing `correlations` table.** Map the 12 `seedCorrelations` rows in (resolve `supplementName` → `supplementId` FK against the seeded supplements; derive the significance label from |r| at render time — it is presentation, not storage). Loaders read the DB. Re-computing correlations from live data is engine work, not this phase.

### M0 source-data fate
- **D-05: Seed, then delete.** One-shot seed scripts (pattern: `scripts/seed-owner.ts`) read the PHI arrays in `real-data.ts` / `protocol-data.ts` / `seed-data.ts` and insert rows under the owner's tenant/subject. Once cut-over is verified (D-09), the PHI data arrays are **deleted from the repo**. Neon becomes the single source of truth — no gitignored JSON sidecars, no server-only PHI modules.
- **D-06: Non-PHI survivors stay in `app/lib/` / `app/types/`.** Engine logic with tests (`getCessationDay`, `getCurrentCessationPhase`, `calculatePearsonCorrelation`, `getMetricStatus`) and non-PHI display constants (`CESSATION_PHASES`, `METRIC_TARGETS`?, `dailySchedule`, `avoidList`, `CESSATION_START_DATE`) are relocated/kept, not deleted. Planner decides exact homes; nothing with the owner's measured values survives in source.
- **D-07: Git history accepted — with a new pre-pilot gate item.** No destructive `filter-repo` rewrite now (private repo, owner's own n=1 data). **Before any external pilot/client: cut over to a NEW SQUASHED REPOSITORY** (fresh history, PHI-free). Attach to the Phase 7 pre-client gate checklist.

### Schema-cleanup breadth
- **D-08: Full vestige sweep.** DATA-05 items — drop `syncStatus`/`syncVersion` columns, `syncStatusEnum`, and the `SyncStatus` type fields; eliminate the `subcategory: ... as any` casts — PLUS adjacent relics in the same migration window: `supplements.isActive` integer → `boolean('is_active')`, fix stale "601/602/603" schema comments to P0–P6, and drop the `NETLIFY_DATABASE_URL` preference in `db.server.ts` (`DATABASE_URL` canonical).
- Typing note for planner: deleting `real-data.ts` removes the `as any` cast *sites*, but the obligation moves to the DB-row→`Metric` mapping boundary (`subcategory` is `varchar(100)` in DB; needs typed narrowing to the category-specific subcategory unions, widening the unions where real values are legitimately missing). No `any` (PRINCIPLES III).

### Cut-over verification
- **D-09: Parity snapshot harness gates deletion.** Before deletion, capture each route loader's output from the static modules as JSON fixtures (**fixtures contain PHI → gitignored/local only, never committed; delete after cut-over**). After rewiring, a Vitest suite runs the DB-backed loaders (injectable `now`, against live Neon) and asserts deep-equality vs the fixtures. Order: seed → wire loaders → parity green → owner visual spot-check → delete static files.
- **D-10: SC#3 wording fix.** "Netlify function bundle" in the ROADMAP success criteria should read "Vercel build output" (deploy target changed in Phase 2). The PHI-grep check runs against the Vercel/`react-router build` artifact.

### Claude's Discretion
- Data-access layer shape (centralized tenant-scoped query module vs per-loader Drizzle queries — pick one pattern and apply consistently; must be `withTenantDb`-wrappable in Phase 7 without rewiring loaders).
- Seed-script structure (one script vs per-table), idempotency strategy, and how the scripts obtain the owner's tenant/subject IDs (lookup by seeded owner, not hardcoded).
- `subject_genotypes` exact column set beyond gene/genotype/assay-source; the CI lint mechanism for blocking `*-data.ts` imports; exact fixture format for the parity harness.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope + requirements
- `.planning/ROADMAP.md` — Phase 4 goal + 4 success criteria (note D-10 wording fix: SC#3 "Netlify" → Vercel build output).
- `.planning/REQUIREMENTS.md` — Phase 4 closes **DATA-01, DATA-02, DATA-04, DATA-05**; ENG-02 (genetics first-class promotion) is Phase 6 — only the PHI-plane `subject_genotypes` table lands here.
- `docs/PRINCIPLES.md` — TS strict, no `any` (drives the subcategory-typing obligation in D-08).

### Tenancy + auth foundation (this phase reads through it)
- `.planning/phases/03-identity-tenancy-scoping/03-CONTEXT.md` — tenancy spine decisions; app-layer scoping interim (RLS → Phase 7).
- `.planning/phases/03.1-account-roles-ux-authorization/03.1-CONTEXT.md` — authz helpers (D-11/D-12/D-13) loaders should compose with.
- `.planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md` — the Phase 7 `SET LOCAL`/RLS path the data-access layer must stay compatible with (loaders must be `withTenantDb`-wrappable later without rewiring).

### Code to read/modify
- `remix-app/db/schema.ts` — 8 tenant-scoped tables (tenant/subject NOT NULL + composite indexes already live); `subject_genotypes` is added here; vestige sweep targets (`syncStatusEnum`, `isActive` integer, stale comments).
- `remix-app/app/lib/db.server.ts` — `getDb()` Drizzle client; drop `NETLIFY_DATABASE_URL` preference (D-08).
- `remix-app/app/lib/authz.server.ts` — `requireUser` (session → user incl. `tenantId`); loaders get tenant context from here, not ad-hoc.
- `remix-app/app/routes/_app/layout.tsx` — authenticated layout loader (session gate); child loaders run behind it.
- `remix-app/app/lib/real-data.ts`, `app/lib/protocol-data.ts`, `app/lib/seed-data.ts` — the PHI arrays to seed-then-delete (D-05) + non-PHI survivors to relocate (D-06).
- `remix-app/app/routes/_app/**` — all 16 routes whose loaders rewire to Neon (dashboard, metrics ×3, protocol ×6, insights ×3, import ×3, plus layouts).
- `remix-app/scripts/seed-owner.ts` — the established seed-script pattern (Better-Auth-aware, idempotent, prints tenant/subject IDs) the data seeds follow.
- `remix-app/app/types/metrics.ts`, `app/types/genetics.ts`, `app/types/protocol.ts` — `Metric` union + subcategory unions (D-08 typing), `GeneticVariant`/`CONFIDENCE_LEVELS` (D-01/D-03 split), `CESSATION_PHASES` (survivor).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/seed-owner.ts` — proven seed pattern: idempotency check, Better-Auth-owned writes where applicable, explicit ID logging. Data seeds extend this pattern.
- `app/lib/metrics.ts` (`getMetricStatus`, Phase 1, tested) and `protocol-data.ts` engine functions (injectable `now`, tested) — survive and serve both loaders and the parity harness.
- Vitest harness (Phase 1) + existing DB-introspection test patterns (Phase 3 used live-Neon contract tests with env skip-guards) — the parity suite builds on these.
- `authz.server.ts` `requireUser` — session already carries `tenantId`; the loader-side subject resolution (owner's subject) is the only missing lookup.

### Established Patterns
- Explicit route table (`app/routes.ts`); all data routes under the authenticated `_app/layout.tsx` gate.
- Drizzle migrations via `npm run db:generate` / `db:migrate` against Neon `orange-paper-97068012`; Phase 3 demonstrated expand-contract + journal-split for live-table changes — the vestige-drop migration follows the same discipline.
- Loaders are synchronous shaping over static arrays today; they become async DB reads — `Route.ComponentProps` typegen absorbs the type change.

### Integration Points
- Neon project `orange-paper-97068012` — live tables, owner tenant/subject/user seeded (Phase 3); data seeds and `subject_genotypes` migration land here.
- Vercel env (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) — already set (Phase 2); no new env vars expected.
- Phase 4.1 design system — loaders change, markup doesn't; the parity harness protects exactly this contract.

</code_context>

<specifics>
## Specific Ideas

- The owner's core concern: the genetics/engine data model "has not been thoroughly methodically designed for use with practitioners and clients, multitenant — this is the core engine work; I want deeper analysis and adversarial evals." Phase 4 therefore stays a pure data-plumbing phase (PHI plane only) and the design depth is formally routed to the Phase 6 entry gate (D-02). Do not let interim convenience bake the conflated M0 shape into Neon.
- Pre-pilot repo squash (D-07) is the owner's chosen PHI-history remedy — record it on the Phase 7 gate checklist, not as Phase 4 work.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 6 entry gate (binding):** engine data-model design pass (subject-genotypes vs knowledge-base split, K-grading governance, evidence/citation model, practitioner-vs-client presentation) via `/gsd:spec-phase 6` + cross-AI adversarial review before `/gsd:plan-phase 6`; `/gsd:ai-integration-phase` if LLM-assisted curation enters scope. The interim server-only knowledge module (D-03) retires there.
- **Phase 7 gate additions:** new squashed PHI-free repository before any external client (D-07), alongside the existing RLS/BAA/pgAudit items.
- **Phase 5:** import-route persistence (WHOOP/vault actions writing to DB) — explicitly not pulled into Phase 4; the ingest pipeline owns it.
- **Phase 6:** correlation re-computation from live data (Phase 4 seeds the static values only).

### Reviewed Todos (not folded)
- `delete-pilot-basic-auth-post-deploy.md` (matched 0.6) — **not folded** (same disposition as Phase 3.1's review): it is a Phase 3 deploy carry-forward (delete `PILOT_BASIC_AUTH` from Vercel after `003-remix-foundation` reaches production), unrelated to the data-layer migration. Resolves when the branch ships.

</deferred>

---

*Phase: 04-static-to-db-data-layer-migration*
*Context gathered: 2026-06-10*
