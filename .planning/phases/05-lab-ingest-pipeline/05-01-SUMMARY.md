---
phase: 05-lab-ingest-pipeline
plan: 01
subsystem: database
tags: [drizzle, postgres, neon, anthropic-sdk, unpdf, react-pdf, vercel-functions, vitest, lab-ingest, pure-functions]

# Dependency graph
requires:
  - phase: 03-identity-tenancy-scoping
    provides: "tenant/subject NOT NULL columns + composite indexes on data tables; assertSubjectAccess/requireRole authz helpers"
  - phase: 04-static-to-db
    provides: "live Neon data layer (data.server.ts), owner M0 metrics seeded (38 distinct analytes), DataSource type"
provides:
  - "4 new lab-ingest tables in live Neon: lab_documents, lab_extractions, audit_log, consent_log (all tenant/subject-scoped, D-16)"
  - "data_source enum extended with 'lab' value (D-16)"
  - "3 dependency-free pure validation functions: checkGrounding (LAB-03), checkRange (LAB-03), lookupAnalyte (D-01)"
  - "curated 101-entry analyte dictionary seeded from owner's live metrics + D-03 common panels (no PHI)"
  - "re-runnable seed script scripts/seed-analyte-dictionary.ts (npm run db:seed-dictionary)"
  - "7 Wave-0 contract test files (3 GREEN pure-function suites, 4 RED/skip-guarded cross-plan contracts)"
  - "4 npm packages: @anthropic-ai/sdk, unpdf, @vercel/functions, react-pdf"
affects: [05-02-extraction-pipeline, 05-03-review-ui, 06-report-generation]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk@0.104.1", "unpdf@1.6.2", "@vercel/functions@3.7.0", "react-pdf@10.4.1"]
  patterns: ["pure-function validation engine (grounding/range/dictionary)", "TS-module reference dictionary (non-PHI, server-only)", "live-Neon-seeded regeneration script", "skip-guarded live-DB introspection tests", "Drizzle enum-add-value migration (no transaction wrapper)"]

key-files:
  created:
    - "remix-app/app/lib/ingest/grounding.ts"
    - "remix-app/app/lib/ingest/range-check.ts"
    - "remix-app/app/lib/ingest/analyte-dictionary.ts"
    - "remix-app/scripts/seed-analyte-dictionary.ts"
    - "remix-app/migrations/0007_silly_sabretooth.sql"
    - "remix-app/tests/lib/ingest/grounding.test.ts"
    - "remix-app/tests/lib/ingest/range-check.test.ts"
    - "remix-app/tests/lib/ingest/analyte-dictionary.test.ts"
    - "remix-app/tests/lib/consent.test.ts"
    - "remix-app/tests/lib/ingest/approve-action.test.ts"
    - "remix-app/tests/db/ingest-schema.test.ts"
    - "remix-app/tests/parity/ingest-review.test.ts"
  modified:
    - "remix-app/db/schema.ts"
    - "remix-app/app/types/metrics.ts"
    - "remix-app/package.json"

key-decisions:
  - "data_source enum gains 'lab' (D-16) — distinct provenance from manual 'bloodwork'; non-breaking additive migration"
  - "Analyte dictionary is a server-only TS module (D-01), seeded from owner's live metrics + D-03 common panels = 101 entries with aliases"
  - "audit_log designed PHI-free by construction (D-13) — no value/name columns; only IDs + metadata"
  - "Drizzle-kit 0.31.8 generated ALTER TYPE ADD VALUE outside a transaction — no migration split needed (Pitfall 3 cleared at both file-check and apply time)"

patterns-established:
  - "Pure validation functions: zero non-type imports, single exported union + single exported function (mirrors getMetricStatus)"
  - "Dictionary regeneration: one-shot tsx script reads live Neon DISTINCT analytes, emits the committed .ts source of truth"
  - "Wave-0 contract tests: 3 GREEN pure-function suites + 4 skip-guarded/RED cross-plan contracts that Plan 02/03 turn GREEN"

requirements-completed: [LAB-01, LAB-03, LAB-05, LAB-06]

# Metrics
duration: ~25min
completed: 2026-06-10
---

# Phase 5 Plan 01: Lab Ingest Foundation Summary

**Wave-0 lab-ingest foundation: 4 tenant/subject-scoped Neon tables (lab_documents, lab_extractions, audit_log, consent_log) + `lab` enum value applied via reviewed migration 0007, three dependency-free pure validation functions (grounding/range/dictionary), a 101-entry analyte dictionary seeded from the owner's live metrics, and 7 contract test files.**

## Performance

- **Duration:** ~25 min (across two checkpoint segments — partial + post-approval)
- **Started:** 2026-06-10T~16:18Z
- **Completed:** 2026-06-10T~16:45Z
- **Tasks:** 4 (Task 1 + Task 4 were blocking-human checkpoints)
- **Files modified:** 15 (12 created, 3 modified)

## Accomplishments
- **Installed 4 audit-verified packages** (@anthropic-ai/sdk, unpdf, @vercel/functions, react-pdf) after the blocking package-legitimacy gate; pdfjs-dist correctly left as a react-pdf peer dep (Pitfall 6).
- **Three pure validation functions** (`checkGrounding`, `checkRange`, `lookupAnalyte`) — the testable engine of the pipeline, zero non-type imports, 35 boundary tests GREEN.
- **101-entry analyte dictionary** seeded from the owner's 38 distinct live-Neon analytes + D-03 standard panels (CBC, CMP, lipids, thyroid, vitamins/minerals, hs-CRP, homocysteine) with lab-portal aliases; zero subject `value:` numbers (PHI-free, D-01 verified).
- **4 new tables applied to live Neon** via reviewed migration 0007 — all tenant/subject-scoped (D-16), `audit_log` PHI-free (D-13), composite indexes present, `data_source` enum extended with `'lab'`. Live-Neon introspection (13 assertions) RUN and GREEN.
- **7 Wave-0 contract test files** — 3 GREEN pure-function suites + 4 skip-guarded/RED cross-plan contracts that Plans 02/03 will turn GREEN.

## Task Commits

1. **Task 1: Package legitimacy gate + install 4 packages** — `e35899a` (chore)
2. **Task 2: Pure validation functions + 7 Wave-0 contract tests** — `bbb10c9` (feat)
3. **Task 3: Seed analyte dictionary from owner's live metrics** — `31a5e66` (feat)
4. **Task 4: Add 4 tables + enum + migration 0007 (schema/SQL)** — `ab94368` (feat)
5. **Task 4 follow-up: fix assertSubjectAccess test expectations** — `63aea56` (fix)

**Migration applied to live Neon:** migration 0007 applied via `npm run db:migrate` after human SQL review (no on-disk tracked changes — Drizzle records applied state in the `__drizzle_migrations` Neon table).

## Files Created/Modified
- `remix-app/app/lib/ingest/grounding.ts` — `checkGrounding(snippet, pageTexts, pageNumber)` LAB-03 grounding, pure
- `remix-app/app/lib/ingest/range-check.ts` — `checkRange(value, refMin, refMax)` LAB-03 physiological range, pure
- `remix-app/app/lib/ingest/analyte-dictionary.ts` — `ANALYTE_DICTIONARY` (101 entries) + `lookupAnalyte`, server-only (D-01)
- `remix-app/scripts/seed-analyte-dictionary.ts` — one-shot live-Neon dictionary regenerator (`npm run db:seed-dictionary`)
- `remix-app/db/schema.ts` — +4 tables, +`lab` enum value, +3 new enums, +Drizzle relations
- `remix-app/app/types/metrics.ts` — `DataSource` union gains `'lab'` (deviation — see below)
- `remix-app/migrations/0007_silly_sabretooth.sql` — generated + applied migration (enum add not in transaction)
- `remix-app/package.json` — 4 new deps + `db:seed-dictionary` script
- 7 test files under `tests/lib/ingest/`, `tests/lib/`, `tests/db/`, `tests/parity/`

## Decisions Made
- **`data_source` enum gains `'lab'`** (D-16) rather than reusing `bloodwork` — keeps ingest-pipeline provenance queryable and self-documenting against `lab_documents`.
- **Dictionary as a server-only TS module** (D-01) — non-PHI, never tenant-scoped, available synchronously during extraction; promote to DB only if it grows past ~200 analytes (Phase 6+).
- **`audit_log` PHI-free by construction** (D-13) — schema design with no `value`/`name` columns is safer than field-by-field scrubbing.
- **No migration split required** — drizzle-kit 0.31.8 emitted `ALTER TYPE ... ADD VALUE 'lab'` with no BEGIN/COMMIT wrapper; confirmed clean at file-check and confirmed at apply time (the Pitfall 3 landmine did not trip).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `'lab'` to the `DataSource` TypeScript union**
- **Found during:** Task 4 (schema change)
- **Issue:** Adding `'lab'` to schema `dataSourceEnum` made `db-mappers.server.ts` fail typecheck with 9 errors — the `DataSource` union in `app/types/metrics.ts` did not include `'lab'`, so mapped rows with `source: 'lab'` were not assignable to `Metric`.
- **Fix:** Added `'lab'` to the `DataSource` union type.
- **Files modified:** `remix-app/app/types/metrics.ts`
- **Verification:** `npm run typecheck` passes (0 errors).
- **Committed in:** `ab94368` (Task 4 commit)

**2. [Rule 1 - Test Bug] Corrected `assertSubjectAccess` fail-closed assertions**
- **Found during:** Task 4 follow-up (post-migration full test run)
- **Issue:** `approve-action.test.ts` asserted `assertSubjectAccess` throws 403 for a missing/unknown role with matching tenant. The real contract (authz.server.ts) only denies the `client` role + cross-tenant access inside `assertSubjectAccess`; fail-closed role denial is `requireRole`'s responsibility, called BEFORE `assertSubjectAccess` in the approve sequence.
- **Fix:** Rewrote the two assertions to match the real slice contract (missing role + matching tenant → no throw; missing role + mismatched tenant → throws).
- **Files modified:** `remix-app/tests/lib/ingest/approve-action.test.ts`
- **Verification:** All 48 ingest unit tests GREEN.
- **Committed in:** `63aea56` (fix)

**3. [Rule 3 - Tooling] Live-Neon test env requires BOTH DATABASE_URL and DATABASE_URL_UNPOOLED**
- **Found during:** Task 4 verification
- **Issue:** `app/test-setup.ts` stubs `DATABASE_URL` and sets `DB_URL_STUBBED=1` when only `DATABASE_URL_UNPOOLED` is exported, which forces the ingest-schema skip-guard to skip even with a live `DATABASE_URL_UNPOOLED`.
- **Fix:** Ran the verification with both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` exported into the vitest process env (no code change — this is a run-invocation detail, documented here for Plan 02/03).
- **Verification:** 13/13 ingest-schema assertions RUN (not skipped) and PASS against live Neon.
- **Committed in:** n/a (invocation note, no file change)

---

**Total deviations:** 2 auto-fixed code changes (1 missing-critical type, 1 test bug) + 1 documented run-invocation detail.
**Impact on plan:** Both code fixes were necessary for correctness (typecheck + accurate test contract). No scope creep — schema, functions, dictionary, and migration match the plan exactly.

## Issues Encountered
- **Seed-script vs. test mismatch:** The first dictionary regeneration didn't include `ferritin` or `hs-crp` (owner stores it as `hscrp`); the analyte-dictionary tests expected those keys. Resolved by adding `ferritin` and the `hs-crp` hyphen alias to the seed script's D-03 common-panels list and re-running. The LDL-C boundary test was relaxed to accept the owner's real `referenceMin: 0` (not `null`).

## Validation Results
- **Pure-function tests:** 35/35 GREEN (`tests/lib/ingest/` grounding + range-check + analyte-dictionary)
- **Ingest unit tests (incl. consent + approve-action):** 48/48 GREEN
- **Live-Neon ingest-schema tests:** 13/13 RUN (not skipped) and GREEN — tenant/subject NOT NULL, composite indexes, `data_source` includes `'lab'`, `audit_log` has no value/name column, all 4 tables exist
- **Typecheck:** clean (0 errors)

## Known Stubs
- The 4 RED cross-plan contract tests (`consent.test.ts`, `approve-action.test.ts` RED section, behavioral parts of `ingest-schema.test.ts`/`parity/ingest-review.test.ts`) contain placeholder assertions for modules Plan 02/03 build (consent.server.ts, ingest.server.ts approve action). These are intentional Wave-0 RED contracts — documented in each file. The pure-function GREEN suites and the live-Neon schema assertions are fully wired.

## User Setup Required
**ANTHROPIC_API_KEY** must be set in Vercel (Production + Preview) before the Plan 02 extraction worker runs. Source: Anthropic Console → Settings → API Keys (standard subscription API, no-training default — D-14). Not required for this plan's deliverables (no LLM call made in Plan 01).

## Next Phase Readiness
- **Plan 02 (extraction pipeline)** can build `extraction.server.ts` / `ingest.server.ts` against the now-live schema and the 3 pure functions. The 4 RED contract tests are its acceptance targets.
- **Plan 03 (review UI)** can build the review route + `PdfPageViewer` against `lab_documents`/`lab_extractions` and the dictionary.
- **Blocker for Plan 02:** `ANTHROPIC_API_KEY` in Vercel env (above).

## Self-Check: PASSED

All 6 key files verified present on disk; all 5 task commits (e35899a, bbb10c9, 31a5e66, ab94368, 63aea56) verified in git history.

---
*Phase: 05-lab-ingest-pipeline*
*Completed: 2026-06-10*
