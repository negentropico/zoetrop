# Codebase Concerns

**Analysis Date:** 2026-06-07

---

## Tech Debt

**No test runner and zero tests:**
- Issue: `package.json` has no `test` script, no test framework in `devDependencies`, and no test files exist anywhere in `remix-app/`. The CI pipeline (`./github/workflows/ci.yml`) runs only `tsc --noEmit` and `react-router build`.
- Files: `remix-app/package.json`, `.github/workflows/ci.yml`
- Impact: Zero regression safety. The protocol-decision engine (genetic variants → protocol actions, confidence grading, cessation tracking) carries no coverage whatsoever. M1 will introduce per-client PHI and an ingest pipeline — inheriting a zero-test baseline into that territory is a serious risk.
- Fix approach: Add Vitest as an early M1 phase. Priority targets: `remix-app/app/lib/protocol-data.ts` (cessation logic, phase calculation), `remix-app/app/lib/real-data.ts` (status computation), and the Pearson correlation implementation in `remix-app/app/lib/seed-data.ts`. See `docs/PRINCIPLES.md` §"Tests (currently a gap)".

**`syncStatus` / `syncVersion` dead columns:**
- Issue: `metrics` table has `syncStatus syncStatusEnum NOT NULL DEFAULT 'local'` and `syncVersion integer NOT NULL DEFAULT 1` (schema lines 86–87). The `SyncStatus` type and `syncVersion` field appear in `remix-app/app/types/metrics.ts` (lines 7, 66–67, 140). Every record in `remix-app/app/lib/real-data.ts` hardcodes `syncStatus: "local", syncVersion: 1` across ~80+ usages. The underlying offline-sync model (LocalStorage-primary, Neon-optional) was retired when the Astro app was replaced by Remix. There is no sync mechanism, no sync UI, and no code path that reads these values.
- Files: `remix-app/db/schema.ts` lines 42–46, 86–87; `remix-app/app/types/metrics.ts` lines 7, 66–67, 140; `remix-app/app/lib/real-data.ts` (all metric literals)
- Impact: Misleading schema; every metric object carries two fields that mean nothing. Future developers may assume sync is active.
- Fix approach: M1 schema pass — drop `sync_status` and `sync_version` columns, remove `syncStatusEnum` pgEnum, remove `SyncStatus` type from `metrics.ts`, remove the `syncStatus`/`syncVersion` fields from `BaseMetric`, and clean up all literal usages in `real-data.ts` and `seed-data.ts`. Coordinate with Drizzle migration.

**Protocol version comment drift (601→602→603 vs P0–P6):**
- Issue: `remix-app/db/schema.ts` line 92 contains the comment `// Protocol versions (601 → 602 → 603)` and line 95 has `// e.g., "601", "602", "603"`. The app renamed protocols to P0–P6 in commit `cbb46c2`. `remix-app/app/lib/protocol-data.ts` uses P0–P6 throughout (`realProtocolVersions` with `version: "P0"` through `"P6"`). `remix-app/app/lib/seed-data.ts` still uses old `version: "601"/"602"/"603"` strings (lines 181, 186, 192).
- Files: `remix-app/db/schema.ts` lines 92–95; `remix-app/app/lib/seed-data.ts` lines 181, 186, 192; `remix-app/app/lib/protocol-data.ts` (correct)
- Impact: Seed data and schema comments are internally inconsistent with the production data module. Could cause confusion during M1 migration and schema seeding.
- Fix approach: Update schema comments to reference P0–P6; update `seedProtocolVersions` in `seed-data.ts` to use P0–P6 version strings.

**`supplements.isActive` Boolean-as-integer SQLite relic:**
- Issue: `remix-app/db/schema.ts` line 134: `isActive: integer('is_active').notNull().default(1), // Boolean as int for SQLite compat`. The database is Neon Postgres, which has a native `boolean` type. The `Supplement` interface in `remix-app/app/types/protocol.ts` likely types `isActive` as `boolean`. Drizzle ORM supports `boolean('is_active')` for Postgres. The SQLite rationale is obsolete.
- Files: `remix-app/db/schema.ts` line 134; `remix-app/app/lib/seed-data.ts` lines 212–220 (all `isActive: true`)
- Impact: Column type mismatch between schema intent and Postgres best practice. `isActive: 1` vs `isActive: true` can cause subtle type confusion at query boundaries.
- Fix approach: Change to `boolean('is_active').notNull().default(true)` in schema; generate and apply migration; update comment. Seed data already uses `true` booleans in TypeScript — the type layer is fine, only the schema column type needs correction.

---

## Known Bugs

**Import routes parse data but never persist it:**
- Symptoms: WHOOP import (`/import/whoop`) and Obsidian vault import (`/import/vault`) parse uploaded files into `Metric[]` objects in the action and return them as JSON — but never write to the database. The parsed metrics are displayed in the UI then discarded on navigation.
- Files: `remix-app/app/routes/import/whoop.tsx` (action, lines 13–59); `remix-app/app/routes/import/vault.tsx` (action, lines 13–51)
- Trigger: Upload any WHOOP JSON or vault markdown, navigate away.
- Workaround: `real-data.ts` contains manually extracted historical data that serves as the actual data source. The import UI is effectively a parse previewer.

**`db.server.ts` is wired but never called by any route:**
- Symptoms: `remix-app/app/lib/db.server.ts` exports `getDb()` and the Drizzle client, but no route module imports it. All loaders read from `real-data.ts`, `protocol-data.ts`, or `seed-data.ts` — static in-memory TypeScript modules. The Neon database schema exists and is migrated, but the app does not read from or write to it at runtime.
- Files: `remix-app/app/lib/db.server.ts`; all route loaders in `remix-app/app/routes/`
- Trigger: Always — the app is entirely data-file-backed in its current state.
- Workaround: Not a bug for the n=1 instrument, but a gap to resolve before M1.

---

## Security Considerations

**No authentication or authorization:**
- Risk: The app has no login, no session, no identity layer. Any person with the Netlify URL can view all health data.
- Files: `remix-app/app/root.tsx`, all route loaders
- Current mitigation: The Netlify URL is not publicly indexed; security through obscurity only.
- Recommendations: M1 requires an auth layer (see `docs/PLATFORM.md` §5.2). Add before exposing any client data. Netlify has auth adapters; alternatively Clerk or Supabase Auth.

**PHI with no isolation:**
- Risk: All health data (blood panels, genetic variants, FAAH/CYP1A2 drug-metabolism data, cessation logs) is embedded in TypeScript source files shipped to the client bundle. Once M1 introduces other people's data, this model becomes a data-breach vector.
- Files: `remix-app/app/lib/real-data.ts`, `remix-app/app/lib/seed-data.ts`, `remix-app/app/lib/protocol-data.ts`
- Current mitigation: Single-subject (Mac's data only); data is not more sensitive than public health info for the owner.
- Recommendations: Move all health data behind server-only loaders querying Neon with RLS. Do not include any client PHI in static TypeScript modules. See `docs/PLATFORM.md` §5.7.

**No migrations directory:**
- Risk: `drizzle.config.ts` points `out` to `./migrations` but no `migrations/` directory exists in `remix-app/`. Schema has never been formally migrated via Drizzle — the Neon schema was either created manually or the migrations were not committed.
- Files: `remix-app/drizzle.config.ts`; `remix-app/remix-app/db/schema.ts`
- Current mitigation: Schema and app are single-subject with no live DB writes, so drift is low-risk now.
- Recommendations: Run `npm run db:generate` to baseline the current schema into committed migration files. Commit the `migrations/` directory before M1 work begins.

---

## Performance Bottlenecks

**`real-data.ts` is a 1,344-line static module imported at every route:**
- Problem: `remix-app/app/lib/real-data.ts` (1,344 lines) exports all metric data as module-level constants that are evaluated on import. Every route that calls `getRealMetrics()` triggers the full concatenation of `realBloodWorkM1`, `realBloodWorkM2`, `realBodyComposition`, and `realAutonomicData` on each request (since Remix loaders run on the server per request, not cached).
- Files: `remix-app/app/lib/real-data.ts`; `remix-app/app/routes/metrics/index.tsx`, `metrics/category.tsx`, `metrics/detail.tsx`, `home.tsx`
- Cause: All data is held in memory as module-level arrays; `getRealMetrics()` re-concatenates them on every call.
- Improvement path: This is acceptable at n=1 scale. At M1, move to database-backed queries with Drizzle. Short-term: memoize the concatenation result with a module-level cache variable.

**Correlations and genetic variants served from seed data on every page load:**
- Problem: `seedCorrelations` and `seedGeneticVariants` from `remix-app/app/lib/seed-data.ts` are imported and re-filtered on each loader call in `home.tsx`, `insights/index.tsx`, `insights/correlations.tsx`, and `insights/genetics.tsx`. These are mock/manually crafted data arrays with no database backing.
- Files: `remix-app/app/routes/home.tsx` lines 41–91; `remix-app/app/routes/insights/index.tsx` lines 19–49; `remix-app/app/routes/insights/correlations.tsx` line 18; `remix-app/app/routes/insights/genetics.tsx` line 20
- Improvement path: M1 promotes both to first-class tables (`geneticVariants`, `variantProtocolMap`, `correlations`) per `docs/PLATFORM.md` §5.3. Until then, the data is small enough that performance is not a concern.

---

## Fragile Areas

**All data is in single-subject, no-tenancy shape — the central M1 gap:**
- Files: `remix-app/db/schema.ts` (all 8 tables); `remix-app/app/lib/real-data.ts`, `remix-app/app/lib/protocol-data.ts`, `remix-app/app/lib/seed-data.ts`
- Why fragile: Every table (`metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`) has no `userId`, `tenantId`, or `subjectId`. Protocol version lineage (P0–P6) is a single global series. Adding a second subject without the tenancy spine would require touching every table, every query, and every loader simultaneously.
- Safe modification: Do not add any multi-subject data to these tables before the M1 identity/tenancy spine is in place (`tenant`, `user(role)`, `subject` tables + `tenantId`/`subjectId` columns on all data tables + Postgres RLS). See `docs/PLATFORM.md` §5.2 for the migration model.
- Test coverage: None.

**Status computation is duplicated across multiple routes:**
- Files: `remix-app/app/routes/home.tsx` lines 28–37; `remix-app/app/routes/metrics/index.tsx` lines 52–72; `remix-app/app/routes/metrics/category.tsx` (likely similar pattern)
- Why fragile: The `getMetricStatus(metric)` function is re-implemented inline in each route with slightly different guard logic. If reference/optimal range semantics change, all copies must be updated in sync.
- Safe modification: Extract to a shared utility in `remix-app/app/lib/metrics.ts` and import from there. Verify all variants agree on the `borderline` vs `excess`/`deficient` boundary conditions before consolidating.

**Cessation day calculation is time-dependent and uncovered:**
- Files: `remix-app/app/lib/protocol-data.ts` lines 29–31 (`getCessationDay` uses `new Date()`)
- Why fragile: `getCessationDay()` calls `new Date()` internally. Any test or logic that depends on this is time-coupled and will produce different results on different days. The cessation start date (`2025-12-23`) is hardcoded; once the phase boundary (Day 121) passes, the dashboard state will shift with no test to catch edge conditions.
- Safe modification: Accept `now: Date` as a parameter with a default of `new Date()`. This makes the function testable and documents the time dependency.

**`subcategory` typed as `any` pervasively in real data:**
- Files: `remix-app/app/lib/real-data.ts` — all 80+ metric objects use `subcategory: "..." as any`; `remix-app/app/lib/seed-data.ts` line 160 uses `subcategory: "default" as any`
- Why fragile: The `Metric` union type in `remix-app/app/types/metrics.ts` requires category-specific subcategory types (e.g., `VitaminSubcategory = 'b-vitamins' | 'fat-soluble'`). The `as any` casts suppress TypeScript's ability to catch mismatches (e.g., assigning `"homocysteine"` as a subcategory to `InflammatorySubcategory` which doesn't include that value). This is a latent type correctness gap.
- Safe modification: Audit each category's subcategory enum against actual values used in `real-data.ts`, update `metrics.ts` subcategory unions where values are legitimately missing (e.g., add `'homocysteine'` to `InflammatorySubcategory`), and remove the `as any` casts.

---

## Scaling Limits

**Static TypeScript data files as the data layer:**
- Current capacity: ~1,344 lines of blood/body/WHOOP data for one subject across 4 measurement timepoints.
- Limit: Cannot add a second subject, support user-generated imports that persist, or query/filter at scale. The correlations table exists in the schema but is not wired to the app.
- Scaling path: M1 database migration (move all data into Neon via the Drizzle schema, wire loaders to `getDb()`).

---

## Dependencies at Risk

**React Router 7 / React 19 — very recent major versions:**
- Risk: `react-router@7.12.0` and `react@19.2.3` are current but represent major version upgrades released in late 2024/early 2025. Ecosystem library compatibility (Recharts, etc.) may lag.
- Impact: `recharts@3.7.0` is listed — verify it supports React 19 if chart rendering issues appear.
- Migration plan: Monitor React Router 7 changelog; the `react-router typegen` step in CI catches type regressions early.

---

## Missing Critical Features

**No persistence from import routes:**
- Problem: WHOOP JSON and vault markdown can be parsed but the resulting metrics are not saved. The import UI has no "save to database" step.
- Blocks: WHOOP data freshness; importing new blood panels without manually editing `real-data.ts`.

**Genetics and lab data have no first-class schema:**
- Problem: `seedGeneticVariants` in `remix-app/app/lib/seed-data.ts` (15 variants) and the K1–K4 confidence model exist only as TypeScript types and static data. There are no `geneticVariants` or `variantProtocolMap` tables in the Drizzle schema. The same applies to lab documents/panels — there is no `labDocuments` table or ingest pipeline.
- Blocks: Persisting new genetic findings, adding variant→protocol mappings without a code deploy, multi-subject genetics at M1.
- Priority: High — this is the core IP engine per `docs/PLATFORM.md` §5.3.

**No accessibility audit has been done:**
- Problem: The `optimal`/`borderline`/`deficient`/`excess` status is communicated via color-coded dots (`StatusDot` in `remix-app/app/routes/metrics/index.tsx` line 74–82) with no accompanying text label or ARIA attribute. This fails WCAG 2.1 SC 1.4.1 (Use of Color).
- Files: `remix-app/app/routes/metrics/index.tsx` lines 74–82; `remix-app/app/routes/metrics/category.tsx` (likely similar)
- Priority: Medium for M0, required before M2 (client-facing app).

---

## Test Coverage Gaps

**Protocol engine logic — untested:**
- What's not tested: `getCessationDay()`, `getCurrentCessationPhase()`, phase boundary transitions, `getMetricStatus()` edge cases (value exactly at range boundary), `getProjections()`, `getLatestRealMetrics()` deduplication logic.
- Files: `remix-app/app/lib/protocol-data.ts`, `remix-app/app/lib/real-data.ts`, `remix-app/app/routes/home.tsx`, `remix-app/app/routes/metrics/index.tsx`
- Risk: Silent regressions in the cessation phase display and metric status classification — the two most visible and clinically meaningful outputs.
- Priority: High — schedule as an M1 gate per `docs/PRINCIPLES.md`.

**Pearson correlation implementation — untested:**
- What's not tested: `calculatePearsonCorrelation()` in `remix-app/app/lib/seed-data.ts` lines 605–622, including the zero-denominator guard and edge cases (empty arrays, single-element arrays, perfect correlation).
- Files: `remix-app/app/lib/seed-data.ts`
- Risk: Silently returns 0 for degenerate inputs; the function is the core of the engine that will be promoted to first-class at M1.
- Priority: High.

**Import parsers — untested:**
- What's not tested: WHOOP JSON parsing in `remix-app/app/routes/import/whoop.tsx`; vault markdown table parsing in `remix-app/app/routes/import/vault.tsx`.
- Files: `remix-app/app/routes/import/whoop.tsx`, `remix-app/app/routes/import/vault.tsx`
- Risk: Format changes in the Whoop Analyzer JSON output or vault markdown structure will silently produce zero metrics with no error signal.
- Priority: Medium.

---

*Concerns audit: 2026-06-07*
