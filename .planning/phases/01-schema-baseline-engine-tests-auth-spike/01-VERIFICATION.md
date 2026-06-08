---
phase: 01-schema-baseline-engine-tests-auth-spike
verified: 2026-06-07T20:32:00Z
status: passed
score: 3/3 must-haves verified
overrides_applied: 0
---

# Phase 01: Schema Baseline + Engine Tests + Auth Spike — Verification Report

**Phase Goal:** The project has a committed migrations baseline, a working Vitest harness covering the engine's critical pure functions, and a resolved spike on the Better-Auth↔Neon-JWK integration seam — so Phase 3 can build auth and RLS without re-discovering technical risk.

**Verified:** 2026-06-07T20:32:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `remix-app/migrations/` exists, is committed, and the baseline validates against the Neon project without error | VERIFIED | `git ls-files` shows `0000_light_blue_shield.sql`, `meta/0000_snapshot.json`, `meta/_journal.json` all tracked. Committed at `1124d3d`. Validation-against-Neon satisfied by stronger mechanism: migration was actually applied to the production Neon DB via `drizzle-kit migrate` (empty DB — no dry-run needed). |
| 2 | `vitest run` passes with 39 tests covering metric status classification, cessation phase at all required days with injectable `now`, and Pearson correlation with known inputs | VERIFIED | `npx vitest run` ran and returned: 3 files / 39 tests / 0 failed. All boundary cases present: optimal/borderline/deficient/excess (11 tests), days -5/0/1/21/22/60/61/120/121/150/151 (21 tests), Pearson perfect+/−/two-element/zero-denom/empty/mismatched/single-element (7 tests). CR-01 BLOCKER fixed in commit `c91e12b`: day 0 now returns `acute` not `optimization`. |
| 3 | A spike document confirms/resolves the Better-Auth↔Neon integration seam — the seam is proven (verdict recorded), not assumed | VERIFIED | `01-SPIKE-FINDINGS.md` records a concrete verdict: `SET LOCAL request.jwt.claims + RLS (D-04 path)` — not assumed, proven on a disposable Neon branch. Specific demos: `auth.session()` returned claims; row visibility flipped between tenant-a/tenant-b; `SET LOCAL` did not leak across a pooled connection (bare `SET` did). Four actionable Phase 3 implications recorded. No throwaway spike code under `remix-app/spikes/` — directory does not exist; no files tracked in git under that path. |

**Score:** 3/3 truths verified

---

### Criterion 1 Detail — Migrations Baseline (DATA-03)

- `remix-app/migrations/0000_light_blue_shield.sql` — tracked in git (not `0000_baseline.sql` as the initial context correctly noted)
- `remix-app/migrations/meta/0000_snapshot.json` — tracked
- `remix-app/migrations/meta/_journal.json` — tracked
- Committed at `1124d3d feat(01-02): generate Drizzle baseline migration (DATA-03)`
- SQL content confirmed substantive: CREATE TYPE statements for 7 enums (`cessation_phase`, `data_source`, `metric_category`, `metric_status`, `protocol_change_type`, `supplement_tier`, `sync_status`) followed by table DDL

### Criterion 2 Detail — Vitest Harness / COMP-01

Test coverage by function, verified against verbose `vitest run` output:

**`getMetricStatus` — `metrics.test.ts` (11 tests):**
- optimal min boundary, optimal max boundary, mid optimal, ref-below-optimal (borderline), ref-above-optimal (borderline), ref-min-exactly (borderline), ref-max-exactly (borderline), below-ref (deficient), above-ref (excess), no-ranges fallback, optimalRange-only quirk

**`getCessationDay` + `getCurrentCessationPhase` — `protocol-data.test.ts` (21 tests):**
- `getCessationDay` at days 1/21/22/60/61/120/121/150/151 + 0 (all via injected `now`)
- `getCurrentCessationPhase` at -5/0/1/21/22/60/61/120/121/150/151 — using `.phase` field, not `.name`
- Day 0 → `acute` (CR-01 fix confirmed; prior to `c91e12b` this returned `optimization`)

**`calculatePearsonCorrelation` — `seed-data.test.ts` (7 tests):**
- Perfect positive [1,2,3,4,5] vs [1,2,3,4,5] → `toBeCloseTo(1.0, 10)`
- Perfect negative → `toBeCloseTo(-1.0, 10)`
- Two-element → `toBeCloseTo(1.0, 10)`
- Zero denominator → `toBe(0)`
- Empty arrays → `toBe(0)`
- Mismatched lengths → `toBe(0)`
- Single element → `toBe(0)`

**`npx react-router typegen && npx tsc --noEmit`:** Exit 0, zero errors — the `getCessationDay(now: Date = new Date())` signature change is call-site-safe; `home.tsx` no-arg call preserved via default parameter.

### Criterion 3 Detail — Auth Spike (Phase 3 de-risk)

`01-SPIKE-FINDINGS.md` records:

- **Verdict:** `SET LOCAL request.jwt.claims + RLS` (D-04 path) — not assumed, demonstrated on Neon branch `spike-auth-rls`
- **Proven behaviors:** claims readable (`auth.session()` returned `{sub, tenantId}`), row flip confirmed, `SET LOCAL` non-leak confirmed, bare `SET` leak confirmed
- **Four concrete Phase 3 implications:** NOBYPASSRLS role requirement, `FORCE ROW LEVEL SECURITY` requirement, `auth` schema ownership caveat + `current_setting` predicate workaround, empty-claims guard (`NULLIF`)
- **JWK-native path:** documented as deferred (not blocking M1), not assumed away — Neon Authorize feature identified as the path if later needed
- **Cleanup confirmed:** No `remix-app/spikes/` directory, no spike files tracked in git; `tsconfig.json` excludes `spikes/` as a residual path guard

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `remix-app/migrations/0000_light_blue_shield.sql` | Committed baseline migration | VERIFIED | Tracked in git since `1124d3d` |
| `remix-app/migrations/meta/0000_snapshot.json` | Migration metadata | VERIFIED | Tracked |
| `remix-app/migrations/meta/_journal.json` | Migration journal | VERIFIED | Tracked |
| `remix-app/app/lib/metrics.ts` | Shared `getMetricStatus` util | VERIFIED | Exists, substantive, imported by 4 routes |
| `remix-app/app/lib/metrics.test.ts` | Status classification tests | VERIFIED | 11 tests green |
| `remix-app/app/lib/protocol-data.ts` | Injectable `now` in `getCessationDay` | VERIFIED | Line 29: `getCessationDay(now: Date = new Date())`, CR-01 fix at lines 36-46 |
| `remix-app/app/lib/protocol-data.test.ts` | Cessation boundary tests | VERIFIED | 21 tests, all boundary days, `.phase` field used, day 0 → acute guarded |
| `remix-app/app/lib/seed-data.test.ts` | Pearson correlation tests | VERIFIED | 7 tests covering all required cases |
| `remix-app/.planning/phases/01-.../01-SPIKE-FINDINGS.md` | Spike verdict document | VERIFIED | Concrete verdict + 4 Phase 3 implications recorded |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `protocol-data.test.ts` | `protocol-data.ts` | `import { getCessationDay, getCurrentCessationPhase } from "~/lib/protocol-data"` | WIRED | Import at line 3, both functions used in test cases |
| `seed-data.test.ts` | `seed-data.ts` | `import { calculatePearsonCorrelation } from "~/lib/seed-data"` | WIRED | Import at line 2, function exercised in 7 test cases |
| `metrics.test.ts` | `metrics.ts` | `import { getMetricStatus } from "~/lib/metrics"` | WIRED | Import at line 2, function exercised in 11 test cases |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces pure-function unit tests and a migration SQL file. No dynamic data-rendering artifacts.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full Vitest suite green | `cd remix-app && npx vitest run` | 3 files / 39 tests / 0 failed | PASS |
| TypeScript clean after signature change | `npx react-router typegen && npx tsc --noEmit` | Exit 0, zero errors | PASS |
| Day 0 → acute (CR-01 fix) | `vitest run --reporter=verbose` | `day 0 → acute` PASS | PASS |
| Test count meets expected (39, not 37) | `vitest run` | 39 tests (37 pre-fix + 2 added for day -5 / day 0 guards) | PASS |

Note: SUMMARY.md references 37 tests (Plan 05 baseline); actual suite is 39 after the CR-01/WR-02 fix added two additional boundary assertions. This is correct — the review-driven fix strengthened the test suite.

### Probe Execution

No probe scripts declared or conventional. Spike was manual (one-time Neon branch experiment — not a re-runnable probe by design; findings documented in `01-SPIKE-FINDINGS.md`).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DATA-03 | 01-02-PLAN.md | Committed Drizzle migrations baseline | SATISFIED | `remix-app/migrations/` tracked in git with `0000_light_blue_shield.sql`; REQUIREMENTS.md marks as `[x]` complete |
| COMP-01 | 01-05-PLAN.md (+ 01-04, 01-01) | Engine logic (status classification, cessation phase with injectable `now`, Pearson) has passing unit tests covering boundary cases | SATISFIED | 39 tests green; all four status values tested; all 7 cessation day boundaries tested including day 0 via injected `now`; all 7 Pearson cases; REQUIREMENTS.md marks as `[x]` complete |

No orphaned requirements: REQUIREMENTS.md traceability table maps DATA-03 and COMP-01 to Phase 1 only.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (none) | No TBD/FIXME/XXX/placeholder markers found in phase-modified files | — | — |

Scanned: `protocol-data.ts`, `protocol-data.test.ts`, `seed-data.test.ts`, `metrics.ts`, `metrics.test.ts`, `0000_light_blue_shield.sql`. Zero matches.

The WR-01 (negative CSS width) warning from the code review was addressed in the same fix commit `c91e12b` (`Math.max(0, Math.min(...))` clamp added to `home.tsx`). The IN-01/IN-02 unused imports and IN-03 latent NaN in Pearson denominator were classified informational (pre-existing, not introduced by this phase) and are not blockers.

### Human Verification Required

None. All must-haves are verifiable programmatically:
- Migration existence and git tracking: verified via `git ls-files`
- Test suite correctness: verified via `npx vitest run`
- Spike verdict substance: verified by reading `01-SPIKE-FINDINGS.md` for concrete demonstrated behaviors (not claimed behaviors)

---

## Gaps Summary

No gaps. All three success criteria are fully satisfied in the codebase:

1. `remix-app/migrations/0000_light_blue_shield.sql` committed and tracked.
2. 39 tests passing, covering every required boundary (including day 0 → acute, which was a code-review BLOCKER now fixed and guarded by tests).
3. `01-SPIKE-FINDINGS.md` records a proven verdict with actionable Phase 3 implications — no throwaway spike code left behind.

Phase 3 can proceed to build auth and RLS on the `SET LOCAL request.jwt.claims + NOBYPASSRLS role` pattern without re-discovering the integration risk.

---

_Verified: 2026-06-07T20:32:00Z_
_Verifier: Claude (gsd-verifier)_
