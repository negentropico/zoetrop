---
phase: 01-schema-baseline-engine-tests-auth-spike
plan: 04
subsystem: testing
tags: [vitest, refactor, metrics, react-router]

requires:
  - phase: 01-01
    provides: Vitest harness + ~/ alias resolution in tests
provides:
  - Canonical getMetricStatus in app/lib/metrics.ts (single source of truth)
  - 11-case status-classification contract test (metrics.test.ts)
  - All four routes import the shared util (no inline copies)
affects: [04-engine, ui, testing]

tech-stack:
  added: []
  patterns: ["Pure engine logic extracted to app/lib/*.ts + colocated *.test.ts; routes consume via ~/ alias"]

key-files:
  created:
    - remix-app/app/lib/metrics.ts
    - remix-app/app/lib/metrics.test.ts
  modified:
    - remix-app/app/routes/home.tsx
    - remix-app/app/routes/metrics/index.tsx
    - remix-app/app/routes/metrics/category.tsx
    - remix-app/app/routes/metrics/detail.tsx
    - remix-app/tsconfig.json

key-decisions:
  - "Extracted the compact home.tsx form verbatim as canonical; all four copies confirmed behaviorally identical before deletion"
  - "Excluded spikes/ from tsconfig typecheck so the throwaway 01-03 harness doesn't break the tsc gate (cross-plan integration fix)"

patterns-established:
  - "Contract-lock: 11 boundary cases (incl. the no-referenceRange fallback quirk) green before and after extraction"

requirements-completed: [COMP-01]

duration: ~15 min
completed: 2026-06-08
---

# Phase 01 Plan 04: Extract getMetricStatus + Tests (COMP-01) Summary

**getMetricStatus consolidated into app/lib/metrics.ts (single source of truth) with an 11-case boundary contract test; all four route copies (home, metrics/index, metrics/category, metrics/detail) now import the shared util — behavior unchanged, tsc clean.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-06-08
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- Created `app/lib/metrics.ts` with the canonical `getMetricStatus` (verbatim from the home.tsx form).
- Created `app/lib/metrics.test.ts` — 11 cases covering all 4 outcomes + exact boundaries + the no-referenceRange fallback quirk; green.
- Removed all FOUR inline copies and swapped each route to `import { getMetricStatus } from "~/lib/metrics"`; kept type imports still referenced (MetricStatus/Metric in home + detail).
- `npx tsc --noEmit` clean after the swap.

## Task Commits

1. **Task 1: Extract + contract-lock tests** - `2a627ce` (test)
2. **Task 2: Swap four route imports** - `69e92c1` (refactor)
   - Supporting: `984dfef` (chore: tsconfig exclude spikes/)

## Files Created/Modified
- `remix-app/app/lib/metrics.ts` - canonical getMetricStatus + JSDoc
- `remix-app/app/lib/metrics.test.ts` - 11 boundary/fallback cases
- `remix-app/app/routes/home.tsx` - inline copy removed, imports shared util
- `remix-app/app/routes/metrics/index.tsx` - same
- `remix-app/app/routes/metrics/category.tsx` - same (+ helper comment removed)
- `remix-app/app/routes/metrics/detail.tsx` - same
- `remix-app/tsconfig.json` - exclude spikes/ from typecheck

## Decisions Made
- Used the compact home.tsx form as canonical (all four copies are behaviorally identical).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded spikes/ from tsconfig**
- **Found during:** Task 2 (tsc --noEmit gate)
- **Issue:** The throwaway 01-03 spike files (`spikes/auth-rls/*.ts`, which import the dev-only `ws`) were being typechecked by the app tsconfig (`include: **/*`), failing the tsc gate with TS2307.
- **Fix:** Added `"exclude": ["spikes"]` to `remix-app/tsconfig.json` — spike code is throwaway scratch outside the app build. Committed under 01-03 (the originating plan).
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** 984dfef

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary cross-plan integration fix; no behavioral change to the routes. No scope creep.

## Issues Encountered
- None beyond the tsconfig cross-contamination above.

## Next Phase Readiness
- COMP-01 status-classification coverage complete; 01-05 adds cessation + Pearson coverage to finish COMP-01.

---
*Phase: 01-schema-baseline-engine-tests-auth-spike*
*Completed: 2026-06-08*
