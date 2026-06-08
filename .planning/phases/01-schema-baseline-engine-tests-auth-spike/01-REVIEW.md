---
phase: 01-schema-baseline-engine-tests-auth-spike
reviewed: 2026-06-07T20:30:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - remix-app/app/lib/metrics.ts
  - remix-app/app/lib/metrics.test.ts
  - remix-app/app/lib/protocol-data.ts
  - remix-app/app/lib/protocol-data.test.ts
  - remix-app/app/lib/seed-data.test.ts
  - remix-app/app/routes/home.tsx
  - remix-app/app/routes/metrics/index.tsx
  - remix-app/app/routes/metrics/category.tsx
  - remix-app/app/routes/metrics/detail.tsx
  - remix-app/vite.config.ts
  - remix-app/package.json
  - remix-app/tsconfig.json
  - remix-app/migrations/0000_light_blue_shield.sql
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-06-07T20:30:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 1 added a Vitest harness, a committed Drizzle baseline migration, extracted a duplicated `getMetricStatus` into `app/lib/metrics.ts` consumed by four routes, and made `getCessationDay` accept an injectable `now`. I verified the extraction is behavior-stable (the four removed inline copies are byte-identical in logic to the new shared util, confirmed via diff), all 37 tests pass, and the migration is a faithful generated snapshot (vestigial `sync_*` columns / `is_active:int` are intentional per D-09 and are NOT flagged).

The phase's work is largely sound, but the cessation phase-mapping logic carries one genuine BLOCKER that the new tests do not guard: `getCurrentCessationPhase(0)` returns the *final* (`optimization`) phase rather than the initial (`acute`) phase. This is reachable in production because `home.tsx` calls `getCessationDay()` with the live clock and feeds the result straight into `getCurrentCessationPhase` — on the literal cessation start date the dashboard would render "Day 0 ... Optimization phase — Tier 1 supplements only," which is the inverse of correct. A related lower-clamp gap in the progress bar shares the same root cause. The remaining findings are pre-existing unused imports and a latent numerical edge, none introduced by this phase.

## Critical Issues

### CR-01: `getCurrentCessationPhase(0)` returns the final phase instead of the initial phase (day-0 / pre-start fallthrough)

**File:** `remix-app/app/lib/protocol-data.ts:36-41` (consumed at `remix-app/app/routes/home.tsx:45-46`)

**Issue:**
`getCessationDay()` returns `0` on the cessation start date (this is the documented, tested contract — see `protocol-data.test.ts:16-18`). But `CESSATION_PHASES[0]` (acute) is defined with `dayRange.start: 1` (`app/types/protocol.ts:93`). So `getCurrentCessationPhase(0)` finds no matching phase (`0 >= 1` is false) and hits the `|| CESSATION_PHASES[CESSATION_PHASES.length - 1]` fallback, returning **optimization** — the last phase. Any negative day (a real clock before 2025-12-23) behaves identically.

Verified by execution:
```
day 0   -> optimization   (should be acute)
day 1   -> acute
day 151 -> optimization   (correct: past last range)
```

`home.tsx` wires this directly to the dashboard:
```ts
const cessationDay = cessation ? getCessationDay() : 0;
const cessationPhase = getCurrentCessationPhase(cessationDay);
```
On day 0 (or any pre-start render) the UI shows the day-0 counter alongside "Optimization phase — Tier 1 supplements only" (`home.tsx:199`), the semantic opposite of the acute withdrawal phase. The fallback was intended only for days past 150; it silently absorbs the day-0/negative case too. The new test suite tests `getCessationDay` at day 0 but does **not** test `getCurrentCessationPhase` at day 0, so the contract gap is unguarded (see WR-02).

**Fix:** Floor the lookup so days ≤ the first phase start resolve to the first phase, and keep the past-end fallback explicit:
```ts
export function getCurrentCessationPhase(day: number): typeof CESSATION_PHASES[0] {
  const first = CESSATION_PHASES[0];
  const last = CESSATION_PHASES[CESSATION_PHASES.length - 1];
  if (day < first.dayRange.start) return first; // day 0 / pre-start → acute
  const phase = CESSATION_PHASES.find(
    (p) => day >= p.dayRange.start && day <= p.dayRange.end
  );
  return phase || last; // past the final range → optimization
}
```
Then add a contract test asserting `getCurrentCessationPhase(0).phase === "acute"` (and ideally a negative day).

## Warnings

### WR-01: `progressPercent` clamps the upper bound but not the lower bound (negative CSS width on pre-start days)

**File:** `remix-app/app/routes/home.tsx:177`

**Issue:**
```ts
const progressPercent = Math.min((currentDay / targetDay) * 100, 100);
```
This caps the bar at 100% but has no floor. When `currentDay` is negative (the clock is before the 2025-12-23 start date — the same pre-start window as CR-01), this yields a negative percentage (e.g., `-1.33%` at day -2), which is then emitted as `style={{ width: '-1.33%' }}` (`home.tsx:207`). A negative width is invalid CSS and the rendered fill is unpredictable. Same root cause as CR-01.

**Fix:** Clamp both ends:
```ts
const progressPercent = Math.max(0, Math.min((currentDay / targetDay) * 100, 100));
```

### WR-02: New cessation tests omit the day-0 / boundary case for `getCurrentCessationPhase`, leaving CR-01 unguarded

**File:** `remix-app/app/lib/protocol-data.test.ts:21-38`

**Issue:**
The `getCurrentCessationPhase` test cases start at day 1 and explicitly cover the *upper* fallback (`[151, "optimization"]`, with the comment "past the last range → falls back to the last phase"), but never assert the *lower* boundary. Meanwhile `getCessationDay` is tested at day 0 (`protocol-data.test.ts:16-18`), so the test author was aware day 0 is a real, in-contract value — yet the phase mapping for that exact value is untested. This is precisely the gap that lets CR-01 ship green. A contract-lock suite that pins the wrong-but-passing upper fallback while skipping the lower boundary gives false confidence in the phase function.

**Fix:** After applying the CR-01 fix, add boundary cases to the `cases` array:
```ts
const cases: Array<[number, string]> = [
  [0, "acute"],   // start date → acute (guards CR-01)
  [1, "acute"],
  // ... existing cases ...
];
```
Consider also asserting a negative day resolves to `acute` rather than `optimization`.

## Info

### IN-01: Unused import `MILESTONES` in metric detail route

**File:** `remix-app/app/routes/metrics/detail.tsx:9`

**Issue:** `MILESTONES` is imported from `../../lib/real-data` but never referenced anywhere in the file. It is pre-existing (present before this phase's `getMetricStatus` extraction) and tsc does not catch it because `noUnusedLocals` is not enabled in `tsconfig.json`. Noted because this phase edited the import block of this file (added the `getMetricStatus` import on line 10), making it adjacent to the change.

**Fix:** Drop `MILESTONES` from the import:
```ts
import { getRealMetrics, getProjections, getMetricTargets } from "../../lib/real-data";
```

### IN-02: Unused imports `differenceInDays` / `parseISO` in dashboard route

**File:** `remix-app/app/routes/home.tsx:20`

**Issue:** `import { differenceInDays, parseISO } from "date-fns";` — neither symbol is used in `home.tsx` after the inline `getMetricStatus` removal (date math is delegated to `getCessationDay`/`getCurrentCessationPhase`). Pre-existing and not flagged by tsc (`noUnusedLocals` off), but the phase touched this import block.

**Fix:** Remove the unused `date-fns` import line from `home.tsx`.

### IN-03: Latent `NaN` escape in `calculatePearsonCorrelation` denominator

**File:** `remix-app/app/lib/seed-data.ts:616-621` (test: `remix-app/app/lib/seed-data.test.ts`)

**Issue:** Not modified this phase, but newly under test. If floating-point rounding drives the radicand `(n*sumX2 - sumX²)*(n*sumY2 - sumY²)` slightly negative, `Math.sqrt` returns `NaN`; the guard `if (denominator === 0) return 0;` does not catch `NaN` (`NaN === 0` is false), so the function returns `NaN` instead of a defined value. The new test suite correctly exercises the zero-variance and mismatched-length paths and does not mask this, but the edge remains. Low severity — current call sites use well-conditioned integer fixtures.

**Fix (optional, if hardening the engine):** Guard for non-finite denominators:
```ts
if (!Number.isFinite(denominator) || denominator === 0) return 0;
```

---

_Reviewed: 2026-06-07T20:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
