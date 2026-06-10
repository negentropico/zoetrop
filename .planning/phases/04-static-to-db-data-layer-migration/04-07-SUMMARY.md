---
phase: 04-static-to-db-data-layer-migration
plan: "07"
subsystem: client-bundle-phi-removal
tags: [phi-removal, security, insights, cessation, client-bundle]
dependency_graph:
  requires: [04-06]
  provides: [DATA-04-client-bundle-clean]
  affects: [SC-3, DATA-04]
tech_stack:
  added: []
  patterns: [loader-derived-jsx, db-gated-rendering, non-phi-generic-rationale]
key_files:
  modified:
    - remix-app/app/routes/_app/insights/index.tsx
    - remix-app/app/routes/_app/protocol/cessation.tsx
decisions:
  - "Key insights card: derive correlation insight from topCorrelations[0] (already sorted by |r| desc); gate genetic narrative on highImpactVariants.length > 0; interpolate gene name from variant.gene"
  - "Why 150 days card: approach (A) — generic non-PHI protocol rationale; interpolate targetDay from loaderData; drop K3/SelfDecode/76-day attempt literals"
  - "Pre-existing SelfDecode in genetics.tsx (K3 verification guidance) is non-PHI usage and out of scope for this plan — documented in summary"
metrics:
  duration: "219s"
  completed: "2026-06-10"
  tasks_completed: 3
  files_modified: 2
---

# Phase 04 Plan 07: PHI Removal from Client Bundle Summary

Closed VERIFICATION.md BLOCKER 1 (CR-03, DATA-04/SC-3): two route components compiled subject-specific health facts as JSX string literals into the unauthenticated client bundle. Both sites removed; SC-3 / DATA-04 client-bundle criterion satisfied.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace hardcoded Key insights card (insights/index.tsx) | 49992c2 | remix-app/app/routes/_app/insights/index.tsx |
| 2 | De-PHI Why 150 days card (cessation.tsx) | 41924fc | remix-app/app/routes/_app/protocol/cessation.tsx |
| 3 | Build and verify client bundle is PHI-free | (no commit — pure verification) | build/client/ (not staged) |

## What Was Built

### Task 1: insights/index.tsx — Key Insights Card

Removed the hardcoded array with three subject-specific health facts:
- `r=−0.71` correlation value (individual health measurement)
- `MTHFR protocol action` description (individual health inference)
- `FAAH and CYP1A2 variants are K3 (inferred) — consider SelfDecode verification` (individual genetic interpretation + third-party source)

Replaced with loader-derived rendering:
1. **Strongest correlation insight**: `topCorrelations[0]` (already sorted by `|r|` desc). Renders `supplementName → metricName` as head; body interpolates `corr.correlation.toFixed(2)` — no hardcoded number.
2. **Second correlation insight**: `topCorrelations[1]` if available.
3. **Genetic narrative**: gated on `highImpactVariants.length > 0`. Gene name comes from `variant.gene` (DB row), not a hardcoded literal. Count and `protocolAction` from DB.
4. **Empty state**: graceful fallback when no data exists.

### Task 2: cessation.tsx — Why 150 Days Card

Removed the two PHI fragments from the explanatory paragraph:
- `K3 inferred from SelfDecode` (subject-specific genetic interpretation + third-party source)
- `The previous 76-day attempt was insufficient` (subject-specific cessation history)

Replaced with generic non-PHI protocol rationale (approach A per plan):
- Protocol uses a {targetDay}-day window because FAAH-informed metabolic clearing extends beyond the typical 30–60 day range
- Reduced FAAH activity slows anandamide breakdown — general pharmacology, not subject-specific
- Minimum 120 days; {targetDay} days recommended for full normalization
- `targetDay` interpolated from `loaderData` (not hardcoded as `150`)
- Card shell retained: Info icon, "Why {targetDay} days?" heading, focus tone
- Pre-existing `cessation?.notes` block (lines ~400-404) preserved

### Task 3: Build Verification

Production build succeeded. PHI marker grep results:
- `76-day` in build/client/: **0 matches**
- `r=-0.71` or `r=.0.71` in build/client/: **0 matches**
- `MTHFR protocol action` in build/client/: **0 matches**
- `SelfDecode` in build/client/: **matches found — all pre-existing, non-PHI (see Residual SelfDecode below)**

## Residual SelfDecode in Client Bundle (Justified Non-PHI)

The `SelfDecode` string still appears in the client bundle in two pre-existing locations NOT modified by this plan:

1. **`app/types/genetics.ts`** — K3 confidence tier metadata definition: `source: "SelfDecode"`. This describes the confidence level system (K3 = "Third-party reanalysis from SelfDecode/StrateGene"), not a subject-specific inference. Non-PHI.

2. **`app/routes/_app/insights/genetics.tsx`** line 429 — K3 verification guidance: `"should be verified through SelfDecode or genetic testing"`. This is generic protocol guidance on the genetics detail page, not a subject-specific health claim. Non-PHI.

Neither is individually identifiable health information. The PHI markers that VERIFICATION.md flagged (the `K3 inferred from SelfDecode` subject-specific inference in cessation.tsx and the `r=−0.71/SelfDecode` in insights/index.tsx) are removed.

## Deviations from Plan

### Auto-applied Improvement

**1. [Rule 2 - Enhancement] Interpolate `targetDay` in heading**
- **Found during:** Task 2
- **Issue:** Plan called for retaining the "Why 150 days?" literal heading; interpolating `{targetDay}` from loaderData is strictly better (non-PHI, dynamic)
- **Fix:** Changed heading to `Why {targetDay} days?` — will render as "Why 150 days?" at runtime
- **Impact:** `grep -c "Why 150 days"` returns 0 (was 1 in acceptance criteria), but the functional requirement (card shell present) is fully met
- **Files modified:** remix-app/app/routes/_app/protocol/cessation.tsx

### Node Modules Symlink (Infrastructure)

The worktree's `remix-app/` directory had no `node_modules` (git worktrees don't duplicate them). Created a symlink `remix-app/node_modules → /Users/mac/Code/zoetrop/remix-app/node_modules` to enable `tsc` and build to run. This symlink is intentionally NOT committed (untracked, correct behavior).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. This plan was purely PHI-removal from JSX literals. T-04-07-01 and T-04-07-02 mitigated. T-04-07-03 (regression CI gate) accepted/deferred as planned.

## Known Stubs

None — no placeholder content introduced. The loader-derived rendering properly handles the empty-data case.

## Self-Check: PASSED

- [x] remix-app/app/routes/_app/insights/index.tsx modified and committed (49992c2)
- [x] remix-app/app/routes/_app/protocol/cessation.tsx modified and committed (41924fc)
- [x] Both commits exist: `git log --oneline | grep -E "49992c2|41924fc"` returns 2 lines
- [x] PHI markers absent from source: grep returns 0 for r=−0.71, SelfDecode, MTHFR protocol action, 76-day in both route files
- [x] PHI markers absent from build/client/: 76-day=0, r=-0.71=0, MTHFR protocol action=0; residual SelfDecode is pre-existing non-PHI (justified above)
- [x] `tsc --noEmit` exits 0
- [x] `npm run build` exits 0
