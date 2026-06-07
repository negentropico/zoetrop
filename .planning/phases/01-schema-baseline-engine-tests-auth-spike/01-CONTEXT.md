# Phase 1: Schema Baseline + Engine Tests + Auth Spike - Context

**Gathered:** 2026-06-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Lay the foundation that every later M1 phase depends on, without touching multi-tenancy data structures yet:
1. **Migrations baseline** — commit a Drizzle `migrations/` directory that faithfully snapshots the schema currently deployed to Neon (8 tables), so all future schema change goes through migrations (DATA-03).
2. **Engine test harness** — install Vitest and cover the existing pure engine logic: status classification at all 4 boundaries, cessation phase math at day boundaries, Pearson correlation (COMP-01).
3. **Auth/RLS spike** — settle the riskiest M1 unknown: can a Better-Auth-issued JWT be verified by Neon `pg_session_jwt` and its `tenantId`/`subjectId` claims be read via `current_setting()` inside a transaction, with a throwaway RLS policy confirming row-visibility flips on the claim. The spike produces a **verdict + recommendation**, not the real tenancy spine.

**Explicitly NOT in this phase:** any `tenantId`/`subjectId` columns or RLS on real tables (Phase 3); wiring `db.server.ts` into loaders (Phase 4); schema drift cleanup (Phase 4/DATA-05); lab-ingest parsers (Phase 5); the Drizzle 1.0 upgrade (Phase 3).
</domain>

<decisions>
## Implementation Decisions

### Drizzle version timing
- **D-01:** Stay on **Drizzle 0.45.x for Phase 1.** Do not adopt the 1.0 release-candidate here. Phase 1 needs only the migrations baseline + tests + spike, none of which require the 1.0 `pgTable.withRLS` RLS API. The JWK spike validates the claim→`current_setting()` round-trip via **raw SQL on the `@neondatabase/serverless` driver**, not the Drizzle RLS API.
- **D-02:** The **Drizzle 0.45.x → 1.0 upgrade is gated to the start of Phase 3** (Identity + Tenancy Spine), where `withRLS`/`crudPolicy` are actually needed. Re-evaluate 1.0 GA status at that point; if GA, even better.

### Auth/RLS spike scope
- **D-03:** **Thin, timeboxed spike (~1 day).** Prove three things and stop: (a) a Better-Auth-issued JWT verifies against Neon `pg_session_jwt`; (b) `tenantId`/`subjectId` claims are readable via `current_setting()` inside a Postgres transaction; (c) one **throwaway/disposable** table with a single RLS policy keyed off the claim confirms row visibility flips with the claim. Tear the throwaway table down — it is not the real spine.
- **D-04:** **Fallback bar:** if JWK verification can't be made to work within the timebox, the spike "fails closed" to the **`SET LOCAL app.tenant_id` pattern** (tenant id set from the app-layer-verified Better-Auth session inside `db.transaction()`). Document the verdict + which path Phase 3 takes in a short SPIKE-FINDINGS note. The `SET LOCAL` fallback is acceptable for M1 but must be flagged for pre-production review.
- **D-05:** The spike must explicitly exercise the **`SET LOCAL` vs bare `SET`** distinction (PITFALLS.md) — confirm tenant context does not leak across pooled connections — regardless of which path it recommends.

### Engine refactor scope (test-enabling)
- **D-06:** Do **exactly two** prerequisite refactors as part of this phase, no more:
  1. Extract the duplicated inline `getMetricStatus` logic (currently re-implemented across `home.tsx`, `metrics/index.tsx`, `metrics/category.tsx`) into a single shared util (e.g. `app/lib/metrics.ts`); routes import it.
  2. Inject `now: Date` (default `new Date()`) into `getCessationDay` / cessation phase math in `protocol-data.ts` so day-boundary tests are deterministic (COMP-01 requires "injectable `now`").
- **D-07:** Test scope is the **three pure functions only**: status classification (4 boundaries), cessation phase math (days 1/21/22/60/61/120/121/post with injected `now`), Pearson (known inputs + zero-denominator + degenerate arrays). Import parsers are **deferred to Phase 5**. No broader rewrites.

### Migrations baseline approach
- **D-08:** The baseline migration is a **pure as-is snapshot** of the deployed schema (`drizzle-kit generate` against the current `db/schema.ts`), committed under `remix-app/migrations/`. Verify with `drizzle-kit migrate` dry-run.
- **D-09:** **Defer all schema drift cleanup to Phase 4 (DATA-05)** — `syncStatus`/`syncVersion` drop, `isActive` int→boolean, P0–P6 schema comments, `subcategory: as any`, `601→602→603` seed strings. Keep the baseline a faithful "this is what exists" record; cleanups land when the data layer is actively reworked. (Snapshot-then-clean, not clean-then-baseline.)

### Claude's Discretion
- User selected "resolve all with recommended defaults" — all decisions above are Claude-recommended and accepted as locked. The planner has discretion on task ordering, file/module naming, Vitest config specifics, and exact spike harness layout, provided the decisions above hold.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 1 goal + success criteria (the verification bar)
- `.planning/REQUIREMENTS.md` — DATA-03, COMP-01 (the requirements this phase satisfies)

### Research (drives the how)
- `.planning/research/SUMMARY.md` — phase ordering + the two open decisions (LLM-BAA, JWK seam)
- `.planning/research/STACK.md` — Better Auth, Drizzle 1.0/RLS API, Vitest, Neon `pg_session_jwt` specifics + versions
- `.planning/research/PITFALLS.md` — `SET LOCAL` vs `SET` pooler leak; atomic RLS enable+policy; migrations-baseline-first
- `.planning/research/ARCHITECTURE.md` — `withTenantDb` wrapper shape; engine-as-pure-module keystone

### Codebase ground truth
- `.planning/codebase/CONCERNS.md` — the exact debt this phase touches (no tests, no `migrations/`, `getCessationDay` time-coupling, duplicated `getMetricStatus`)
- `.planning/codebase/STACK.md` + `.planning/codebase/TESTING.md` — current deps (Vite 7, Drizzle 0.45.1) and the zero-test baseline
- `remix-app/db/schema.ts` — the 8 tables to baseline
- `docs/PRINCIPLES.md` — TS-strict/no-`any`; tests-as-first-class gap; LLM extraction+human-review constraint
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `remix-app/app/lib/protocol-data.ts` — `getCessationDay`, `getCurrentCessationPhase` (pure-ish; needs `now` injection per D-06)
- `remix-app/app/lib/seed-data.ts` — `calculatePearsonCorrelation` (~lines 605–622), already pure; direct test target
- `remix-app/app/lib/real-data.ts` — `getMetricStatus`-style logic + reference/optimal ranges (status classification target)
- `remix-app/drizzle.config.ts` — already points `out` at `./migrations` (dir just doesn't exist yet); `db:generate`/`db:migrate` scripts exist

### Established Patterns
- TS strict, no `any` (PRINCIPLES) — new util + tests must hold this; the `subcategory: as any` casts are NOT in scope to fix here (Phase 4)
- Vite 7 already present → Vitest needs near-zero config (TESTING.md)
- Status taxonomy `optimal|borderline|deficient|excess` is a stable enum contract — tests assert against it

### Integration Points
- New `app/lib/metrics.ts` util replaces 3 inline `getMetricStatus` copies in `home.tsx`, `metrics/index.tsx`, `metrics/category.tsx` (import swap; behavior must stay identical — assert via test before/after)
- Spike code lives in a throwaway location (e.g. `spikes/` or a scratch route/script), NOT in app runtime paths; torn down after the verdict is recorded
</code_context>

<specifics>
## Specific Ideas

- The spike's deliverable is a short **SPIKE-FINDINGS** note recording the verdict (JWK-native vs `SET LOCAL`) and the reasoning — it feeds Phase 3 planning directly.
- Cessation phase boundaries to test come from the schema enum comments: acute 1–21, stabilization 22–60, clearing 61–120, optimization 121–150 (cessation start `2025-12-23`).
</specifics>

<deferred>
## Deferred Ideas

- **Drizzle 1.0 upgrade** → Phase 3 (first task, when RLS API is needed).
- **Schema drift cleanup** (sync vestiges, `isActive`→boolean, P0–P6 comments, `as any`, seed `601/602/603`→P-codes) → Phase 4 / DATA-05.
- **Import-parser tests** (WHOOP JSON, vault markdown) → Phase 5 / LAB.
- **LLM-provider BAA decision** (Anthropic vs OpenAI for PHI extraction) → Phase 2 gate / Phase 5 use — not a Phase 1 concern.
- **`withTenantDb` real implementation + RLS on actual tables** → Phase 3 (the spike only prototypes the mechanism).
</deferred>

---

*Phase: 1-schema-baseline-engine-tests-auth-spike*
*Context gathered: 2026-06-07*
