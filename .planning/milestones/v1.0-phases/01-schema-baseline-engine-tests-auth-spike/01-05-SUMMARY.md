---
phase: 01-schema-baseline-engine-tests-auth-spike
plan: 05
subsystem: testing
tags: [vitest, protocol-data, seed-data, cessation, pearson, date-fns]

requires:
  - phase: 01-01
    provides: Vitest harness + ~/ alias resolution
provides:
  - getCessationDay(now: Date = new Date()) — deterministic cessation math
  - protocol-data.test.ts (cessation day + phase boundary coverage)
  - seed-data.test.ts (Pearson correlation coverage)
  - Full engine test suite (37 tests) green
affects: [04-engine, testing]

tech-stack:
  added: []
  patterns: ["Injectable now: Date default param for deterministic time-based pure functions"]

key-files:
  created:
    - remix-app/app/lib/protocol-data.test.ts
    - remix-app/app/lib/seed-data.test.ts
  modified:
    - remix-app/app/lib/protocol-data.ts

key-decisions:
  - "Used CESSATION_PHASES `.phase` field (not `.name`) for phase assertions, resolving RESEARCH Open Question 1 / A3"
  - "Tests always inject `now` (Pitfall 5) — never call getCessationDay() with no args"

patterns-established:
  - "Floating-point assertions: toBeCloseTo(_, 10) for precise correlations, exact toBe(0) for guard/degenerate cases"

requirements-completed: [COMP-01]

duration: ~12 min
completed: 2026-06-08
---

# Phase 01 Plan 05: Cessation Determinism + Engine Tests (COMP-01) Summary

**getCessationDay made deterministic via an injectable `now: Date = new Date()` param, with cessation day/phase boundary tests and Pearson correlation tests — the full engine suite is 37 tests green and tsc clean.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-06-08
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Changed `getCessationDay()` → `getCessationDay(now: Date = new Date())`; body uses the injected `now`. No-arg call sites (home.tsx:55) unaffected by the default.
- `protocol-data.test.ts`: getCessationDay at days {1,21,22,60,61,120,121,150,151} + start=0; getCurrentCessationPhase at every phase boundary via `.phase` (incl. the post-150 fallback).
- `seed-data.test.ts`: Pearson perfect +/-, two-element, zero-denominator, empty, mismatched-length, single-element degenerate cases.
- Full suite: 3 files / 37 tests green; `tsc --noEmit` clean (confirms the signature change is call-site-safe).

## Task Commits

1. **Task 1: Inject now + cessation tests** - `cd19d5b` (feat)
2. **Task 2: Pearson tests + full-suite/tsc gate** - `3d8e85c` (test)

## Files Created/Modified
- `remix-app/app/lib/protocol-data.ts` - getCessationDay injectable now (one-param change)
- `remix-app/app/lib/protocol-data.test.ts` - cessation day + phase boundary tests
- `remix-app/app/lib/seed-data.test.ts` - Pearson correlation tests

## Decisions Made
- `.phase` (not `.name`) for phase identity; explicit injected dates only.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- COMP-01 fully satisfied across 01-01 (harness), 01-04 (status), 01-05 (cessation + Pearson).
- Engine logic is now test-covered and deterministic — ready for Phase 4 engine work.

---
*Phase: 01-schema-baseline-engine-tests-auth-spike*
*Completed: 2026-06-08*
