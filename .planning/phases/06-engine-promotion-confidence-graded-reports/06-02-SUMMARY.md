---
phase: 06-engine-promotion-confidence-graded-reports
plan: 02
subsystem: data
tags: [drizzle, neon, postgres, schema, migration, corpus, evidence-tier]

# Dependency graph
requires:
  - phase: 06-engine-promotion-confidence-graded-reports
    plan: 01
    provides: VariantMap / EvidenceTier type contracts in ~/types/report consumed by corpus.server.ts

provides:
  - evidenceTierEnum (k1|k2|k3|k4) pgEnum, distinct from confidence_level
  - geneticVariants table (non-PHI corpus, no tenant/subject)
  - variantProtocolMap table (evidence_tier NOT NULL, FK → geneticVariants)
  - metricProtocolMap table (evidence_tier NOT NULL, category reuses metric_category enum)
  - reports table (tenant/subject-scoped, jsonb snapshot, FKs → tenants/subjects/user)
  - migration 0009_natural_night_thrasher applied to live Neon
  - corpus.server.ts read layer (CORPUS_VERSION = "v1.0-owner-2026-06", getVariantMaps, getMetricRules)
  - data.server.ts report read helpers (getReports, getReport)
  - scripts/seed-corpus.ts idempotent scaffold exporting corpusSeedData
  - Wave-0 tests: tests/lib/corpus-lint.test.ts + tests/db/corpus-schema.test.ts (RED-first)

affects:
  - 06-03 (seeds corpusSeedData content, owns non-null-K COUNT assertion over real rows)
  - 06-05 (report-generator reads getVariantMaps/getMetricRules, writes reports rows)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First-class corpus tables: genetics + rule knowledge promoted from in-memory genetics-knowledge.server.ts to Neon tables with a non-null evidence-tier K column"
    - "PHI boundary by table shape: corpus tables (geneticVariants/variantProtocolMap/metricProtocolMap) carry NO tenant_id/subject_id; only reports is tenant/subject scoped (D-06)"
    - "evidence_tier enum distinct from confidence_level: K reflects external evidence strength (Oxford CEBM), not detection confidence (D-07/D-09)"
    - "Source-agnostic read layer: corpus.server.ts getVariantMaps/getMetricRules + CORPUS_VERSION stamp so deferred diagnostic sources slot in as corpus additions (D-12)"
    - "RED-first DB-gated test: tests/db/corpus-schema.test.ts uses describe.skipIf(!connectionString) so it skips without DB env and asserts NOT-NULL + non-PHI-column structure when run with DATABASE_URL_UNPOOLED"

key-files:
  created:
    - remix-app/migrations/0009_natural_night_thrasher.sql
    - remix-app/migrations/meta/0009_snapshot.json
    - remix-app/app/lib/corpus.server.ts
    - remix-app/scripts/seed-corpus.ts
    - remix-app/tests/lib/corpus-lint.test.ts
    - remix-app/tests/db/corpus-schema.test.ts
  modified:
    - remix-app/db/schema.ts
    - remix-app/app/lib/data.server.ts
    - remix-app/migrations/meta/_journal.json
    - remix-app/package.json

# Metrics
tasks-completed: 3
commits: 3
duration-min: ~13 (incl. human-gated migration checkpoint)

# Phase 6 Plan 02: Corpus + Reports Schema (evidenceTierEnum + 4 Neon tables, migration 0009) Summary

## Performance
3 tasks, 3 task commits. Task 3 paused at the DATA-03 [BLOCKING] db:generate → human-review → db:migrate checkpoint; migration 0009 was reviewed and applied to live Neon under orchestrator (human-approved) control, then the DB-gated schema test confirmed the live schema.

## Accomplishments
ENG-02 structural foundation delivered. `evidenceTierEnum('evidence_tier', ['k1','k2','k3','k4'])` is a new Postgres enum, distinct from `confidence_level`. Four first-class tables exist in `db/schema.ts` and in live Neon: `geneticVariants` and `variantProtocolMap` (genotype-pattern variant mapping), `metricProtocolMap` (metric→protocol rule layer — the third knowledge source), and `reports` (tenant/subject-scoped jsonb snapshot). `evidence_tier` is NOT NULL on `variantProtocolMap` and `metricProtocolMap` (structural; the non-null-K content COUNT assertion is owned by 06-03 after seed). Corpus tables carry no tenant/subject columns (non-PHI, D-06); `reports` is tenant/subject scoped with FKs to tenants/subjects/user. The `corpus.server.ts` read layer exports `CORPUS_VERSION = "v1.0-owner-2026-06"`, `getVariantMaps()` (variantProtocolMap ⋈ geneticVariants), and `getMetricRules()`. `data.server.ts` adds `getReports`/`getReport`. `seed-corpus.ts` exports the idempotent `corpusSeedData` scaffold (empty arrays at 06-02; filled in 06-03). Wave-0 RED-first tests are in place.

## Task Commits
- `e7f7e90` test(06-02): Wave-0 RED-first corpus-lint + corpus-schema stubs
- `a0454a8` feat(06-02): add evidenceTierEnum + 4 corpus/reports tables + read layer + seed scaffold
- `a00c427` chore(06-02): generate migration 0009 for evidence_tier enum + 4 corpus tables

## Files Created/Modified
Created: migration 0009 SQL + snapshot, corpus.server.ts, seed-corpus.ts, corpus-lint.test.ts, corpus-schema.test.ts.
Modified: db/schema.ts (enum + 4 tables), data.server.ts (report read helpers), migrations/meta/_journal.json, package.json (seed script).

## Decisions Made
- Migration 0009 reviewed as purely additive (CREATE TYPE + 4 CREATE TABLE + FKs + indexes). `CREATE TYPE evidence_tier` is a fresh enum (not `ALTER TYPE … ADD VALUE`), so transaction-safe with no Pitfall-2 risk.
- `metricProtocolMap.category` reuses the existing `metric_category` enum rather than free-text, keeping category values consistent with the metrics subsystem.
- `corpus-lint.test.ts` keeps the DisclaimerCallout-string assertion as `test.skip` until 06-04 ships the component, so `vitest run` stays green at 06-02 completion; the imperative-phrasing lint runs normally over the (empty) corpus arrays.

## Deviations from Plan
- Migration filename is drizzle-kit's generated `0009_natural_night_thrasher.sql` (the plan's `0009_corpus_and_reports.sql` was an illustrative name). Tag recorded in `_journal.json`.
- Migration application was performed by the orchestrator after explicit human approval at the checkpoint (user chose "Approve — I apply it"), rather than by the executor agent. Live apply verified by the DB-gated `tests/db/corpus-schema.test.ts` (11/11 passing against Neon).

## Known Stubs
- `corpusSeedData` arrays are empty at 06-02 — content authored + seeded in 06-03, which owns the `COUNT(*) WHERE evidence_tier IS NULL = 0` post-seed assertion.

## Threat Flags
None. New tables are additive; `reports` PHI scoping (tenant/subject FKs) is in place but row-level access enforcement (`assertSubjectAccess`) lands with the report generator in 06-05.

## Self-Check: PASSED
- evidenceTierEnum + 4 tables present in db/schema.ts (verified: `db/schema.ts:499`).
- Migration 0009 generated and applied to live Neon (`db:migrate` exit 0; `_journal.json` tag `0009_natural_night_thrasher`).
- DB-gated schema test 11/11 passing against live Neon: evidence_tier NOT NULL on corpus rule tables, corpus tables have no tenant/subject columns, enum has all four K values, evidence_tier distinct from confidence_level.
- corpus.server.ts exports CORPUS_VERSION + getVariantMaps + getMetricRules (verified).
- seed-corpus.ts exports corpusSeedData (verified); data.server.ts exports getReports/getReport (verified).
- Full suite + typecheck green post-merge (see wave gate).

---
*Phase: 06-engine-promotion-confidence-graded-reports*
*Completed: 2026-06-12*
