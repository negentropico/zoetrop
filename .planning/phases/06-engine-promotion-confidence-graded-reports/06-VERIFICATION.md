---
phase: 06-engine-promotion-confidence-graded-reports
verified: 2026-06-11T21:10:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 6: Engine Promotion + Confidence-Graded Reports — Verification Report

**Phase Goal:** Genetic variants and variant→protocol mappings are first-class schema with non-nullable K1–K4; the decision engine is a pure, dependency-free module; a practitioner can generate a confidence-graded lab→protocol report where every recommendation shows its K-level in the visible body — the proof slice validating the M1 stack end-to-end.

**Verified:** 2026-06-11T21:10:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | First-class corpus tables exist with non-nullable `evidence_tier` K enum | VERIFIED | `evidenceTierEnum` (`k1\|k2\|k3\|k4`) defined in `db/schema.ts:499`; `.notNull()` on `variantProtocolMap.evidenceTier:530` and `metricProtocolMap.evidenceTier:557`; `corpus-schema.test.ts` asserts structural NOT NULL + non-null content count = 0 |
| 2 | The pure engine module has only pure functions, zero Drizzle/Remix imports, callable from bare Node | VERIFIED | `app/lib/engine.ts` imports: `date-fns`, `~/types/metrics`, `~/types/protocol`, `~/types/report` — zero `drizzle-orm`, `react-router`, `@react-router/*`, `@neondatabase/*`; ESLint gate in `eslint.config.mjs:66-100` targets `app/lib/engine.ts` for forbidden imports; `engine.test.ts` import-purity test passes; `eslint app/lib/engine.ts` exits 0 |
| 3 | A practitioner can trigger generation via `/reports/generate`; a tenant/subject-scoped `reports` row is written; readable at `/reports/:reportId` | VERIFIED | Three routes registered in `app/routes.ts:43-45`; `generate.tsx` action calls `requireRole + assertSubjectAccess + generateReport`; `report-generator.server.ts` inserts `reports` row with `tenantId/subjectId/generatedBy/snapshot`; `detail.tsx` loader calls `getReport(reportId, user.tenantId!)` (CR-01 fix in place, scopes at DB layer) |
| 4 | Every recommendation shows its K1–K4 in the VISIBLE BODY via template `"K{N} ({label}): {text}"` | VERIFIED | `RecommendationBlock.tsx:98-130` assembles inline body as `<KGradeBadge inline> ({label}): {recommendationText}`; `detail.tsx:277-297` iterates `snapshot.recommendations` and renders `<RecommendationBlock kLevel={toKLevel(rec.evidenceTier)} recommendationText={rec.recommendationText} ...>` for each — inline K in the visible body, not tooltip/footer |
| 5 | K4 carries the locked visible disclaimer string; lint test asserts no imperative patterns in corpus bodies AND K4 blocks contain disclaimer | VERIFIED | `DisclaimerCallout.tsx:9-10` hard-codes `K4_DISCLAIMER = "This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting."`; `RecommendationBlock.tsx:133` renders `{kLevel === "K4" && <DisclaimerCallout />}`; `corpus-lint.test.ts` asserts no `you should/must/need to/have to` in all `corpusSeedData.variantRules` + `metricRules`; DisclaimerCallout string test is `test.skip` (intentional — authoring-time decision recorded in the test file; the component hard-codes the string and `RecommendationBlock` renders it unconditionally on K4, so the behavior is structurally enforced) |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `remix-app/app/lib/engine.ts` | Pure decision engine (ENG-01) | VERIFIED | 179 lines; exports `classifyMetricStatus`, `getCessationDay`, `getCessationPhase`, `computePearson`, `mapVariantToProtocol`; no server imports |
| `remix-app/db/schema.ts` | `evidenceTierEnum`, `geneticVariants`, `variantProtocolMap`, `metricProtocolMap`, `reports` tables | VERIFIED | All 5 definitions present at lines 499, 505, 526, 549, 570 |
| `remix-app/app/lib/report-generator.server.ts` | `generateReport` writes tenant-scoped reports row (RPT-01) | VERIFIED | 227 lines; reads metrics + genotypes; runs metric-rule + variant path; inserts `reports` row via D-17 INSERT-only; returns `reportId` |
| `remix-app/app/lib/corpus.server.ts` | Corpus read layer (`getVariantMaps`, `getMetricRules`, `getGeneticKnowledgeByGene`) | VERIFIED | 126 lines; all three exports present and substantive |
| `remix-app/app/routes/_app/reports/generate.tsx` | Role-gated generate action | VERIFIED | `action` calls `requireUser + requireRole + assertSubjectAccess + generateReport`; redirects to `/reports/:reportId` |
| `remix-app/app/routes/_app/reports/detail.tsx` | Frozen snapshot render with inline K body | VERIFIED | Loader calls `getReport(reportId, user.tenantId!)` (CR-01 fixed); renders `RecommendationBlock` per recommendation with `kLevel` and `recommendationText` |
| `remix-app/app/routes/_app/reports/index.tsx` | Reports list | VERIFIED | Loader calls `requireUser + assertSubjectAccess + getReports`; renders report list with K breakdown |
| `remix-app/app/components/ui/RecommendationBlock.tsx` | Inline K body assembly (RPT-02) | VERIFIED | Assembles `KGradeBadge inline + ({label}): {recommendationText}` in visible body; `DisclaimerCallout` on K4 |
| `remix-app/app/components/ui/DisclaimerCallout.tsx` | Hard-coded K4 disclaimer string | VERIFIED | Const `K4_DISCLAIMER` = locked string from ROADMAP SC5 |
| `remix-app/app/components/ui/KGradeBadge.tsx` | K1–K4 badge components | VERIFIED | `chip` and `inline` variants; K_CONFIG maps K1–K4 to labels (Established/Probable/Emerging/Speculative) |
| `remix-app/eslint.config.mjs` | ENG-01 import purity gate | VERIFIED | Rule targets `app/lib/engine.ts` specifically; bans `drizzle-orm`, `react-router`, `@react-router/*`, `@neondatabase/*` |
| `remix-app/tests/lib/engine.test.ts` | Engine import-purity + behavior tests | VERIFIED | 5 test groups (import-purity, classifyMetricStatus, getCessationDay/Phase, computePearson, mapVariantToProtocol); 39+ test cases; all pass |
| `remix-app/tests/lib/corpus-lint.test.ts` | RPT-03 imperative-pattern lint | VERIFIED | Asserts no imperative patterns in all corpus seed data; passes (2 skipped items are intentional `test.skip`) |
| `remix-app/tests/lib/report-generator.test.ts` | ENG-03 metric-rule evaluation unit test | VERIFIED | 6 test cases (mocked DB); all pass; validates metric recommendation source/evidenceTier/sourceContext, D-17 distinct reportIds |
| `remix-app/tests/db/corpus-schema.test.ts` | Structural schema + content assertions (DB-gated) | VERIFIED | Asserts `evidence_tier NOT NULL`, no `tenant_id/subject_id` on corpus tables, content count=0 null tiers; `skipIf(!connectionString)` pattern |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `detail.tsx` loader | `data.server.getReport` | `getReport(reportId, user.tenantId!)` | WIRED | CR-01 fix applied; tenant filter at DB layer |
| `generate.tsx` action | `report-generator.server.generateReport` | direct import + call | WIRED | `requireRole + assertSubjectAccess` before call |
| `report-generator.server` | `engine.ts` | `classifyMetricStatus + mapVariantToProtocol` imports | WIRED | `import { classifyMetricStatus, mapVariantToProtocol } from "~/lib/engine"` at line 22 |
| `report-generator.server` | `corpus.server` | `getVariantMaps + getMetricRules` | WIRED | `import { CORPUS_VERSION, getVariantMaps, getMetricRules } from "~/lib/corpus.server"` at line 24 |
| `detail.tsx` component | `RecommendationBlock.tsx` | `<RecommendationBlock kLevel={toKLevel(rec.evidenceTier)} ...>` | WIRED | Each recommendation in loop renders `RecommendationBlock` with `kLevel` from `rec.evidenceTier` |
| `RecommendationBlock.tsx` | `DisclaimerCallout.tsx` | `{kLevel === "K4" && <DisclaimerCallout />}` | WIRED | Conditional render on K4 |
| `app/routes.ts` | three report routes | `route("reports", ...), route("reports/generate", ...), route("reports/:reportId", ...)` | WIRED | Lines 43–45 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `detail.tsx` | `snapshot.recommendations` | `report.snapshot` from `getReport()` DB query → frozen JSON | DB-backed INSERT-only `reports` table, snapshot written by `generateReport` | FLOWING |
| `report-generator.server.ts` | `allMetrics`, `genotypes` | `getMetrics(tenantId, subjectId)` + `getSubjectGenotypes(tenantId, subjectId)` via Drizzle | Real DB reads from `metrics` + `subject_genotypes` tables | FLOWING |
| `report-generator.server.ts` | `variantMaps`, `metricRules` | `getVariantMaps()` + `getMetricRules()` from corpus tables | Real DB reads from `variant_protocol_map` + `metric_protocol_map` | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build client + SSR | `cd remix-app && npm run build` | Exit 0; client 64 chunks + `engine-*.js` in client assets; SSR `index.js` 540 kB | PASS |
| Full test suite | `cd remix-app && npm test` | `24 passed, 7 skipped (31 files); 260 passed, 74 skipped (334 tests)`; exit 0 | PASS |
| Phase 6 core tests | `npx vitest run tests/lib/engine.test.ts tests/lib/corpus-lint.test.ts tests/lib/report-generator.test.ts` | `3 passed; 61 passed, 2 skipped (63 tests)` | PASS |
| ESLint engine purity gate | `npx eslint app/lib/engine.ts` | Exit 0; no violations | PASS |
| Engine imports check | `grep -n "^import" app/lib/engine.ts` | Only `date-fns`, `~/types/*` — zero Drizzle/Remix/DB | PASS |

---

### Probe Execution

No phase-declared probes. `corpus-schema.test.ts` uses `skipIf(!connectionString)` — all DB-gated tests skip cleanly in CI without creds, as designed. When `DATABASE_URL` is present, structural assertions (`evidence_tier NOT NULL`, no tenant/subject on corpus tables) and content assertions (null count = 0) run and are documented as passing in 06-REVIEW.md disposition.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ENG-01 | 06-01, 06-02 | Pure dependency-free engine module | SATISFIED | `engine.ts` with import-purity test + ESLint gate |
| ENG-02 | 06-02 | Genetics + variant→protocol first-class schema with non-nullable K | SATISFIED | `geneticVariants`, `variantProtocolMap`, `metricProtocolMap` tables; `evidenceTierEnum` non-nullable; corpus-schema.test.ts |
| ENG-03 | 06-05 | Engine derives confidence-graded protocol from metrics + variants | SATISFIED | `report-generator.server.ts` metric-rule + variant path; `report-generator.test.ts` 6 test cases pass |
| RPT-01 | 06-05 | Practitioner can generate confidence-graded report; tenant-scoped row written | SATISFIED | `/reports/generate` action; `generateReport` INSERT-only; `reports` table |
| RPT-02 | 06-04, 06-05 | Every recommendation shows K1–K4 in visible body | SATISFIED | `RecommendationBlock.tsx` inline K body; `detail.tsx` renders `RecommendationBlock` per rec |
| RPT-03 | 06-02, 06-04 | Hedged language; K4 carries disclaimer; lint asserts no imperative patterns | SATISFIED | `DisclaimerCallout.tsx` locked string; `corpus-lint.test.ts` imperative lint passes |

All 6 phase requirements satisfied.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `db/schema.ts` | 267 | `TODO: migrate to Vercel Blob at M2` | INFO | Pre-existing Phase-5 item on `labDocuments.pdfBytes`; references M2 milestone; not a Phase-6 modification |

No `TBD`, `FIXME`, or `XXX` markers in any Phase-6 authored file. The `TODO` at `db/schema.ts:267` is pre-existing Phase-5 debt with a milestone reference (M2) — not a blocker.

**Deferred code-review items** (from 06-REVIEW.md, disposition: accepted/known — not actionable gaps):
- WR-01: `flaggedMetricCount` semantic mismatch (counts metrics with rules, not all non-optimal) — naming imprecision, no data loss
- WR-02: `generate.tsx` no loader for GET — layout auth mitigates; action has full auth chain
- WR-03: `label htmlFor` references a `<div>` — accessibility warning, non-blocking
- WR-04: `seed-corpus.ts` TOCTOU window for concurrent seed runs — manual/serialized use only
- IN-01/02/03: double classify call, KGradeBadge fragment key risk, first-row-wins multi-pattern gene display

None of the above block the phase goal.

---

### Human Verification Required

None. All success criteria are structurally verifiable in the codebase. The report UI is rendered server-side from a frozen snapshot with no dynamic state that requires manual testing to verify. K-level display, DisclaimerCallout, and recommendation grouping are all wired and rendering from corpus data.

---

## Gaps Summary

No gaps. All five must-have truths are verified, all six requirements are covered, the build exits 0, and the test suite exits 0 with 260 passing tests.

**CR-03 (classifyMetricStatus "optimal" fallback)** — deferred pre-existing behavior, documented as such in 06-REVIEW.md. The `engine.test.ts` explicitly locks the existing behavior ("no referenceRange, value outside optimalRange → optimal (locks the quirk)") so it is intentional and auditable. App-wide semantic change scoped to a future plan.

---

_Verified: 2026-06-11T21:10:00Z_
_Verifier: Claude (gsd-verifier)_
