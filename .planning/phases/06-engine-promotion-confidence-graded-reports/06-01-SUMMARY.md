---
phase: 06-engine-promotion-confidence-graded-reports
plan: 01
subsystem: api
tags: [typescript, vitest, engine, pure-functions, report-types, eslint]

# Dependency graph
requires:
  - phase: 05-lab-ingest-pipeline
    provides: metrics DB layer, data.server.ts patterns, Drizzle schema conventions

provides:
  - Pure engine.server.ts module (classifyMetricStatus, getCessationDay, getCessationPhase, computePearson, mapVariantToProtocol)
  - app/types/report.ts type contracts (EvidenceTier, SubjectGenotype, VariantMap, GradedRecommendation, ReportSnapshot)
  - Evidence-tier relabeled CONFIDENCE_LEVELS (Established/Probable/Emerging/Speculative)
  - Backward-compatible re-exports in metrics.ts, protocol-data.ts, correlations.ts
  - ESLint ENG-01 import-correctness gate for engine.server.ts
  - 52 new engine tests in tests/lib/engine.test.ts (import-purity + all 5 engine functions)

affects:
  - 06-02 (corpus schema — imports engine.server.ts types)
  - 06-03 (report generator — imports engine.server.ts + report.ts contracts)
  - 06-04 (UI components — imports EvidenceTier from report.ts)
  - 06-05 (integration tests — DB-seeded axis of D-02)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure engine module pattern: .server.ts suffix as bundle-hygiene only; module stays import-pure for Node/vitest (D-01 / ROADMAP SC2)"
    - "Re-export backward-compat pattern: source modules delegate to engine.server, expose legacy names"
    - "ESLint file-specific import gate: per-file restriction on engine.server.ts to enforce D-01 at commit time"
    - "Genotype normalization: sort alleles alphabetically within slash before matching (Pitfall 7)"
    - "Detection-confidence derivation: assaySource → verified|inferred|undefined (D-09 secondary annotation)"

key-files:
  created:
    - remix-app/app/lib/engine.server.ts
    - remix-app/app/types/report.ts
    - remix-app/tests/lib/engine.test.ts
  modified:
    - remix-app/app/types/genetics.ts
    - remix-app/app/lib/metrics.ts
    - remix-app/app/lib/protocol-data.ts
    - remix-app/app/lib/correlations.ts
    - remix-app/eslint.config.mjs

key-decisions:
  - "D-01 confirmed: .server.ts suffix is bundle-hygiene only; engine module stays import-pure despite the suffix (date-fns is pure computation, not Drizzle/Remix)"
  - "Backward-compat re-exports chosen over call-site rename: minimizes blast radius, existing tests stay green with zero changes"
  - "EvidenceTier type uses lowercase literals ('k1'|'k2'|'k3'|'k4') per RESEARCH §Snapshot JSON shape; ConfidenceLevel type ('K1'|'K2'|'K3'|'K4') unchanged in genetics.ts"
  - "ConfidenceLevelInfo.source and .color fields removed; KGradeBadge will use CSS vars per UI-SPEC Pattern 1"

patterns-established:
  - "Engine-pure pattern: pure TS module with only date-fns + ~/types imports; zero framework/DB dependencies"
  - "Re-export compat shim: export { newName as legacyName } from './engine.server' in source modules"

requirements-completed: [ENG-01]

# Metrics
duration: 9min
completed: 2026-06-12
---

# Phase 6 Plan 01: Engine Extraction + Report Type Contracts Summary

**Pure engine.server.ts with classifyMetricStatus/cessation/Pearson/mapVariantToProtocol (ENG-01), evidence-tier relabeled CONFIDENCE_LEVELS, and typed report.ts contracts — 52 engine tests passing, full suite 251/251 green**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-12T01:13:12Z
- **Completed:** 2026-06-12T01:21:49Z
- **Tasks:** 3
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments

- Created `app/lib/engine.server.ts` as a pure, import-pure module (zero Drizzle/Remix imports) hosting all five engine functions (D-01 / ROADMAP SC2 satisfied)
- Defined `app/types/report.ts` type contracts (EvidenceTier, SubjectGenotype, VariantMap, GradedRecommendation, ReportSnapshot) consumed by corpus/generator/UI plans in later waves
- Relabeled `CONFIDENCE_LEVELS` K1–K4 from detection-confidence (Confirmed/Likely/Inferred/Requires Testing) to evidence tiers (Established/Probable/Emerging/Speculative) per D-07/UI-SPEC; removed detection-oriented source/color fields
- Wired backward-compatible re-exports in metrics.ts, protocol-data.ts, correlations.ts — all existing call sites unchanged
- Added ESLint ENG-01 import-correctness gate to flag any future Drizzle/Remix/DB import added to engine.server.ts
- 52 new engine tests: import-purity check + classifyMetricStatus + cessation phase boundaries + Pearson + mapVariantToProtocol (including flipped-allele normalization, gene-level fallback, detectionConfidence derivation)

## Task Commits

1. **Task 1: Define report.ts type contracts + relabel CONFIDENCE_LEVELS** - `571af5d` (feat)
2. **Task 2: Create pure engine.server.ts + import-purity and engine tests** - `efcbe00` (feat)
3. **Task 3: Re-point source modules + ESLint engine import rule** - `e1c5bb2` (feat)

## Files Created/Modified

- `remix-app/app/lib/engine.server.ts` - Pure decision-engine module (5 exported functions; no Drizzle/Remix imports)
- `remix-app/app/types/report.ts` - EvidenceTier, SubjectGenotype, VariantMap, GradedRecommendation, ReportSnapshot typed contracts
- `remix-app/app/types/genetics.ts` - CONFIDENCE_LEVELS relabeled to evidence tiers; ConfidenceLevelInfo.source/.color removed
- `remix-app/app/lib/metrics.ts` - getMetricStatus replaced with re-export from engine.server
- `remix-app/app/lib/protocol-data.ts` - getCessationDay/getCurrentCessationPhase replaced with re-exports from engine.server; unused imports removed
- `remix-app/app/lib/correlations.ts` - calculatePearsonCorrelation replaced with re-export from engine.server
- `remix-app/app/lib/eslint.config.mjs` - Added ENG-01 gate: no-restricted-imports for engine.server.ts
- `remix-app/tests/lib/engine.test.ts` - 52 tests: import-purity + all 5 engine functions + mapVariantToProtocol cases

## Decisions Made

- Backward-compat re-exports (not call-site renames): minimizes blast radius, all 39 existing tests remain green with zero test file changes
- `EvidenceTier` uses lowercase string literals ('k1'|'k2'|'k3'|'k4') per RESEARCH §Snapshot JSON shape; `ConfidenceLevel` ('K1'–'K4') stays uppercase in genetics.ts (two distinct types, D-05)
- `ConfidenceLevelInfo.source` and `.color` removed: detection metadata belongs in `GradedRecommendation.sourceContext.detectionConfidence`; badge colors use CSS vars per UI-SPEC Pattern 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed type error: GradedRecommendation.gene does not exist**
- **Found during:** Task 3 (typecheck pass)
- **Issue:** Engine test accessed `results[0].gene` directly — `gene` is not on `GradedRecommendation`; it lives on `sourceContext.gene`
- **Fix:** Updated test assertion to `results[0].sourceContext.gene`
- **Files modified:** remix-app/tests/lib/engine.test.ts
- **Verification:** tsc --noEmit reports no engine.test.ts errors; 52 tests pass
- **Committed in:** e1c5bb2 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type error in test)
**Impact on plan:** Minor test assertion fix — no behavior change, no scope change.

## Issues Encountered

- Worktree lacks `node_modules/` directory (shares main repo's). Created a symlink `remix-app/node_modules → /Users/mac/Code/zoetrop/remix-app/node_modules` to allow vitest to run from the worktree context. The symlink is untracked (gitignore covers `node_modules/`).
- Pre-existing type errors in routes (missing `+types/` generated files, `any` in insights/index.tsx) — these are unrelated to this plan and were present before execution. Scope boundary: not fixed (Rule 3 would not apply to pre-existing out-of-scope errors).

## Known Stubs

None — this plan creates pure type/logic modules with no UI rendering or data source stubs.

## Threat Flags

None — this plan creates a pure computation module and TypeScript type contracts only. No new network endpoints, auth paths, or database access patterns introduced.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `app/lib/engine.server.ts` is ready for import in Phase 6 corpus/generator/UI plans (06-02 through 06-04)
- `app/types/report.ts` type contracts are the interface every downstream plan builds against
- Existing test suite green (251/251); engine tests provide the synthetic-input D-02 coverage axis
- ESLint gate enforces import-purity at commit time going forward

## Self-Check

---
*Phase: 06-engine-promotion-confidence-graded-reports*
*Completed: 2026-06-12*
