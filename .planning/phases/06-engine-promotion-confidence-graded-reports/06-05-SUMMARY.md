---
phase: 06-engine-promotion-confidence-graded-reports
plan: 05
subsystem: api+ui
tags: [typescript, react, drizzle, engine, reports, authz, vitest]

# Dependency graph
requires:
  - phase: 06-engine-promotion-confidence-graded-reports
    plan: 01
    provides: engine.server.ts (classifyMetricStatus, mapVariantToProtocol), report.ts type contracts
  - phase: 06-engine-promotion-confidence-graded-reports
    plan: 02
    provides: corpus.server.ts (CORPUS_VERSION, getVariantMaps, getMetricRules), data.server.ts (getReports, getReport), reports table
  - phase: 06-engine-promotion-confidence-graded-reports
    plan: 03
    provides: corpus data seeded (30 variant + 22 metric rules in Neon)
  - phase: 06-engine-promotion-confidence-graded-reports
    plan: 04
    provides: KGradeBadge, DisclaimerCallout, RecommendationBlock UI components

provides:
  - report-generator.server.ts (generateReport — deterministic engine+corpus → frozen snapshot → reports row)
  - /reports route (list page with K-breakdown chips + empty state)
  - /reports/generate route (role-gated action, requireRole + assertSubjectAccess)
  - /reports/:reportId route (frozen-snapshot render with RecommendationBlock inline K body + AppendixDisclosure)
  - ENG-03 metric-rule unit tests in tests/lib/report-generator.test.ts

affects:
  - M1 proof slice complete — confidence-graded report visible end-to-end

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Frozen snapshot pattern: generateReport inserts NEW reports row per call (crypto.randomUUID), never mutates existing rows (D-17)"
    - "Metric-rule evaluation inline in generator: classifyMetricStatus → filter metricProtocolMap rules by metricName + conditionStatus/any_non_optimal → GradedRecommendation (ENG-03)"
    - "Deterministic assembly: no LLM in generate path — pure engine + corpus text + typed snapshot (D-13)"
    - "Flat route registration: three reports routes inside single _app/layout.tsx block (project convention — no sub-layout)"
    - "Auth pattern: requireRole(['owner','practitioner']) gates generate action; assertSubjectAccess gates BOTH generate and detail loader (D-18/CR-01)"
    - "Vitest top-level vi.mock with vi.hoisted() for shared mock state across tests"

key-files:
  created:
    - remix-app/app/lib/report-generator.server.ts
    - remix-app/app/routes/_app/reports/generate.tsx
    - remix-app/app/routes/_app/reports/detail.tsx
    - remix-app/app/routes/_app/reports/index.tsx
    - remix-app/tests/lib/report-generator.test.ts
    - .planning/phases/06-engine-promotion-confidence-graded-reports/deferred-items.md
  modified:
    - remix-app/app/routes.ts

key-decisions:
  - "generateReport uses Promise.all to read metrics + genotypes + variantMaps + metricRules in parallel for efficiency"
  - "Button.asChild not available — used styled Link elements for navigation CTAs in reports index"
  - "Linter reverted complex vi.hoisted() test to simpler vi.mock pattern — tests still pass with both approaches"
  - "Pre-existing build failure (engine.server client bundle, 06-01 issue) documented in deferred-items.md; out of scope per scope boundary rule"

requirements-completed: [RPT-01, RPT-02, RPT-03, ENG-03]

# Metrics
duration: 10min
completed: 2026-06-12
---

# Phase 6 Plan 05: Report Generator + Routes (RPT-01/02/03 + ENG-03) Summary

**Deterministic generateReport (engine+corpus → frozen snapshot → reports row), three reports routes registered flat under _app/layout.tsx, assertSubjectAccess on generate + detail, ENG-03 metric-rule unit tests — M1 proof slice complete**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-12T02:38:40Z
- **Completed:** 2026-06-12T02:49:22Z
- **Tasks:** 2 (TDD)
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- Created `app/lib/report-generator.server.ts`: deterministic `generateReport(tenantId, subjectId, generatedBy) → Promise<string>`. Reads ALL committed metrics (D-16) + genotypes in parallel via data.server; reads corpus (getVariantMaps, getMetricRules) via corpus.server. ENG-03 metric-rule evaluation: for each non-optimal metric, filters metricProtocolMap rules by metricName + (conditionStatus === status || conditionStatus === 'any_non_optimal'); maps to GradedRecommendation (source:'metric', evidenceTier, sourceContext{metricName, metricStatus, metricValue, metricUnit}). Variant recommendations via mapVariantToProtocol. Assembles typed ReportSnapshot with schemaVersion:1, CORPUS_VERSION stamp, inputSummary, recommendations, appendix. Inserts NEW reports row (crypto.randomUUID) — never mutates (D-17). NO LLM (D-13).
- Created `tests/lib/report-generator.test.ts`: 7 unit tests (1 DB-gated skipped). Tests: ENG-03 deficient metric rule match (source/evidenceTier/sourceContext.metricName), any_non_optimal borderline match, RPT-02 non-null evidenceTier assertion, optimal metric exclusion, D-17 CORPUS_VERSION stamp, D-17 two distinct reportIds.
- Created `app/routes/_app/reports/generate.tsx`: POST action with requireRole(['owner','practitioner']) (T-06-EOP) + assertSubjectAccess (T-06-IDOR/D-18) + T-06-INPUT subject validation via getOwnerSubject + generateReport → redirect(`/reports/${reportId}`). Page renders generation form with loading state.
- Created `app/routes/_app/reports/detail.tsx`: loader with assertSubjectAccess (T-06-IDOR/CR-01 satisfied) on params.reportId. Component renders frozen ReportSnapshot: ReportSummaryCard, FINDINGS THAT NEED A LOOK eyebrow, CategorySection groups with RecommendationBlock per finding (RPT-02 inline K body), AppendixDisclosure toggle, corpus version footnote. Empty body copy when no findings.
- Created `app/routes/_app/reports/index.tsx`: loader with assertSubjectAccess + getReports. Renders report list with K-breakdown chips; empty state with "No reports yet" + Generate CTA.
- Updated `app/routes.ts`: three reports routes registered FLAT inside `layout("routes/_app/layout.tsx", [...])` block (project convention — no sub-layout introduced). Route param is `:reportId` not `:id`.

## Task Commits

1. **Task 1 RED+GREEN: report-generator.server.ts + ENG-03 unit tests** - `f00b489` (feat)
2. **Task 2: reports routes + routes.ts** - `60338d0` (feat)

## Files Created/Modified

- `remix-app/app/lib/report-generator.server.ts` - Deterministic generateReport: engine+corpus→frozen snapshot→reports row (no LLM, no UPDATE)
- `remix-app/tests/lib/report-generator.test.ts` - ENG-03 metric-rule unit tests (7 pass, 1 skipped); RPT-02 evidenceTier assertion; D-17 distinct IDs
- `remix-app/app/routes/_app/reports/generate.tsx` - Role-gated generation action (requireRole + assertSubjectAccess)
- `remix-app/app/routes/_app/reports/detail.tsx` - Frozen snapshot render: RecommendationBlock inline K body, AppendixDisclosure, assertSubjectAccess (CR-01)
- `remix-app/app/routes/_app/reports/index.tsx` - Reports list with K-breakdown chips + empty state
- `remix-app/app/routes.ts` - Reports routes registered flat (project convention)
- `.planning/phases/06-engine-promotion-confidence-graded-reports/deferred-items.md` - Pre-existing build issue documented

## Decisions Made

- Button.asChild not in ButtonProps API — used styled `<Link>` elements for primary/secondary CTAs in index.tsx (correct approach per project's Link-based navigation)
- Promise.all for concurrent reads in generateReport — parallel fetch of metrics, genotypes, variantMaps, metricRules
- Linter reverted vi.hoisted() mock approach to simpler top-level vi.mock pattern; tests pass with both
- Pre-existing `npm run build` failure (engine.server client bundle) is out of scope per scope boundary rule — documented in deferred-items.md; confirmed pre-exists before 06-05

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed relative import path in report-generator.server.ts**
- **Found during:** Task 1 GREEN (vitest run)
- **Issue:** `import { reports } from "../../../db/schema"` — wrong path (app/lib/ only needs `../../db/schema`)
- **Fix:** Changed to `import { reports } from "../../db/schema"`
- **Files modified:** remix-app/app/lib/report-generator.server.ts
- **Committed in:** f00b489

**2. [Rule 1 - Bug] Fixed Button.asChild type error in routes**
- **Found during:** Task 2 typecheck
- **Issue:** `ButtonProps` doesn't have `asChild` prop — used styled Link elements instead
- **Fix:** Replaced `<Button asChild>` with styled `<Link>` elements using matching CSS vars
- **Files modified:** remix-app/app/routes/_app/reports/index.tsx
- **Committed in:** 60338d0

**3. [Rule 1 - Bug] Fixed Card padding="xl" type error**
- **Found during:** Task 2 typecheck
- **Issue:** `Card.padding` only supports `"none" | "sm" | "md" | "lg"` — `"xl"` not valid
- **Fix:** Changed to `padding="lg"`
- **Files modified:** remix-app/app/routes/_app/reports/index.tsx
- **Committed in:** 60338d0

**4. [Rule 1 - Bug] Removed unused CONFIDENCE_LEVELS import in detail.tsx**
- **Found during:** Task 2 typecheck
- **Issue:** Imported but not used (causes potential unused import warning)
- **Fix:** Removed the import
- **Files modified:** remix-app/app/routes/_app/reports/detail.tsx
- **Committed in:** 60338d0

---

**Pre-existing out-of-scope issue (not auto-fixed per scope boundary rule):**
`npm run build` fails with `[commonjs--resolver] Server-only module referenced by client: './engine.server' imported by 'app/lib/metrics.ts'`. Confirmed pre-existing before 06-05 (tested with git stash). Documented in `.planning/phases/06-engine-promotion-confidence-graded-reports/deferred-items.md`.

## Known Stubs

None — all three routes are fully wired to live data.server reads. generateReport evaluates the live engine against real corpus rules and writes to the live reports table.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth-gated-write | remix-app/app/routes/_app/reports/generate.tsx | New DB write path (reports INSERT) gated by requireRole + assertSubjectAccess as required |
| threat_flag: auth-gated-read | remix-app/app/routes/_app/reports/detail.tsx | Cross-tenant IDOR prevention via assertSubjectAccess (CR-01 satisfied) |

Both flags are MITIGATED per the plan's threat register (T-06-EOP, T-06-IDOR). No unmitigated new surface.

## Self-Check

- `remix-app/app/lib/report-generator.server.ts` — FOUND
- `remix-app/tests/lib/report-generator.test.ts` — FOUND
- `remix-app/app/routes/_app/reports/generate.tsx` — FOUND
- `remix-app/app/routes/_app/reports/detail.tsx` — FOUND
- `remix-app/app/routes/_app/reports/index.tsx` — FOUND
- Commit `f00b489` — Task 1 (report-generator.server.ts + ENG-03 unit tests)
- Commit `60338d0` — Task 2 (routes + routes.ts)
- `npx vitest run` — 260 passed, 74 skipped (all DB-gated), 0 failed
- `npx tsc --noEmit` — 0 errors

## Self-Check: PASSED

---
*Phase: 06-engine-promotion-confidence-graded-reports*
*Completed: 2026-06-12*
