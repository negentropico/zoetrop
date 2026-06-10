---
phase: 04-static-to-db-data-layer-migration
plan: "06"
subsystem: cessation-engine
tags: [cessation, protocol, db-migration, gap-closure, DATA-01]
dependency_graph:
  requires:
    - 04-05 (protocol-data.ts PHI data cut-over; CESSATION_START_DATE still exported)
  provides:
    - getCessationDay reads DB startDate parameter (DATA-01 / SC-1 satisfied)
  affects:
    - All three cessation-day consumers (cessation, dashboard, protocol-index)
tech_stack:
  added: []
  patterns:
    - Injectable startDate parameter (parallel to injectable now — Pitfall 5 pattern)
    - Date→toISOString normalization idiom (consistent with cessation.tsx lines 32-34)
key_files:
  created: []
  modified:
    - remix-app/app/lib/protocol-data.ts
    - remix-app/app/lib/protocol-data.test.ts
    - remix-app/app/routes/_app/protocol/cessation.tsx
    - remix-app/app/routes/_app/dashboard.tsx
    - remix-app/app/routes/_app/protocol/index.tsx
decisions:
  - "Preserve CESSATION_START_DATE as seed documentation + empty-cessation default; not removed"
  - "Do NOT add +1 to differenceInDays (IN-06 out of scope; parity fixture expects 169 not 170)"
  - "Date→toISOString fallback idiom for raw-row call sites matches normalization in cessation.tsx"
metrics:
  duration: "4 minutes"
  completed_date: "2026-06-10T18:18:55Z"
  tasks: 2
  files: 5
---

# Phase 04 Plan 06: getCessationDay DB Re-source Summary

getCessationDay re-signed to take `startDateIso` parameter from DB; all three loader call sites feed the DB `cessation_log.startDate`; owner day count unchanged at 169.

## What Was Built

Closed VERIFICATION.md BLOCKER 2 (CR-02, DATA-01 / SC-1): the cessation day count was computed from the hardcoded module constant `CESSATION_START_DATE` instead of the DB `cessation_log.startDate`. Despite all three loaders fetching the DB cessation row, `getCessationDay` was never receiving the DB start date — the most prominent derived number on the protocol pages still read static data.

### Task 1: Re-signature getCessationDay (TDD RED → GREEN)

Changed `getCessationDay` signature from `(now: Date = new Date())` to `(startDateIso: string, now: Date = new Date())`. The function body now computes `differenceInDays(now, parseISO(startDateIso))`, never reading `CESSATION_START_DATE` internally. The constant is retained and exported for two remaining uses: seed documentation and the empty-cessation default (routes that short-circuit to `currentDay: 0` when no cessation row exists).

TDD flow:
- RED: Updated test calls to `getCessationDay(CESSATION_START_DATE, day(n))` — 9 tests failed against the old single-arg signature
- GREEN: Updated implementation — all 21 tests passed

### Task 2: Update three loader call sites

- `cessation.tsx` line 67: `getCessationDay(now)` → `getCessationDay(cessation.startDate, now)`. Here `cessation.startDate` is already an ISO string (normalized at lines 29-42).
- `dashboard.tsx` line 169: `getCessationDay(now)` → `getCessationDay(Date→toISOString fallback, now)` with null guard retained. Raw DB row (`startDate is a Date`), using the same normalization idiom as cessation.tsx.
- `protocol/index.tsx` line 65: `getCessationDay(new Date())` → same `Date→toISOString fallback, new Date()` pattern as dashboard.tsx.

## Verification Results

| Check | Result |
|-------|--------|
| `parseISO(CESSATION_START_DATE)` absent from protocol-data.ts | PASS (0 occurrences) |
| `npx react-router typegen && npx tsc --noEmit` | PASS (clean exit) |
| `npx vitest run app/lib/protocol-data.test.ts` | PASS (21/21) |
| Loader-parity test (live Neon, FIXED_NOW=2026-06-10) | PASS (13/13) |
| `cessation.currentDay === 169` | CONFIRMED |
| `dashboard.cessationDay === 169` | CONFIRMED |
| `protocol-index.cessationDay === 169` | CONFIRMED |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The change re-routes an internal function call from a constant to a passed parameter — no new trust boundary crossings.

T-04-06-01 (Tampering): MITIGATED — getCessationDay now reads the DB startDate parameter; parity test confirms the owner value is unchanged and tsc confirms all call sites pass the DB value.

## Self-Check: PASSED

Files created/modified:
- `remix-app/app/lib/protocol-data.ts` — FOUND
- `remix-app/app/lib/protocol-data.test.ts` — FOUND
- `remix-app/app/routes/_app/protocol/cessation.tsx` — FOUND
- `remix-app/app/routes/_app/dashboard.tsx` — FOUND
- `remix-app/app/routes/_app/protocol/index.tsx` — FOUND

Commits:
- `97ade03` — test(04-06): add failing tests for getCessationDay new signature (RED)
- `cf24e3a` — feat(04-06): re-signature getCessationDay to take startDateIso parameter (GREEN)
- `88c7629` — feat(04-06): pass DB cessation.startDate into getCessationDay at all 3 loaders
