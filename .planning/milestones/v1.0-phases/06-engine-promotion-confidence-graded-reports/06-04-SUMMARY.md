---
phase: 06-engine-promotion-confidence-graded-reports
plan: 04
subsystem: ui
tags: [react, typescript, ui-components, nav, evidence-tier, css-vars]

# Dependency graph
requires:
  - phase: 06-engine-promotion-confidence-graded-reports
    plan: 01
    provides: CONFIDENCE_LEVELS relabeled (Established/Probable/Emerging/Speculative), EvidenceTier type, KLevel type contracts

provides:
  - KGradeBadge component (chip+inline variants, K1–K4 CSS-var evidence-tier pill)
  - DisclaimerCallout component (zero-props, locked K4 disclaimer string)
  - RecommendationBlock component (per-finding card, locked K-body, K4 DisclaimerCallout)
  - Reports nav entry in NAV_TREE (FileText → /reports)
  - BottomTab overflow resolved (Import mobileHidden, 5-item mobile nav)

affects:
  - 06-05 (report routes — imports KGradeBadge, DisclaimerCallout, RecommendationBlock)
  - 06-02 (corpus-lint.test.ts — asserts verbatim K4_DISCLAIMER string presence)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS-var-only color pattern: K_CONFIG record maps K1–K4 to CSS vars only (never Tailwind color classes); dark remap automatic via cascade"
    - "Zero-props component with locked string: DisclaimerCallout exports a zero-props function; the locked string is a const visible to lint assertions"
    - "Inline flow body assembly: KGradeBadge inline + muted mono parenthetical + colon + Hanken body text — badge rendered as component, not string-concatenated into corpus text"
    - "mobileHidden flag on NavGroup: resolves BottomTab overflow by filtering mobileHidden groups from mobile drawer nav; active-group exception ensures visibility when user is on that route"

key-files:
  created:
    - remix-app/app/components/ui/KGradeBadge.tsx
    - remix-app/app/components/ui/DisclaimerCallout.tsx
    - remix-app/app/components/ui/RecommendationBlock.tsx
  modified:
    - remix-app/app/components/shell/nav-tree.ts
    - remix-app/app/components/shell/Sidebar.tsx

key-decisions:
  - "K_CONFIG uses CSS vars exclusively (var(--ink)/var(--n-100)/var(--focus-500)/etc) — no Tailwind color class strings; dark mode remap is automatic via cascade"
  - "KGradeBadge chip variant: badge span + sibling muted span (not inside badge) for (label) text — per UI-SPEC Pattern 1"
  - "mobileHidden flag chosen over a separate MOBILE_NAV_TREE constant — single source of truth with opt-out flag; active-group exception avoids stranding users on hidden routes"
  - "DisclaimerCallout: removed empty interface (ESLint no-empty-object-type not in project config) — zero-props function signature directly"

# Metrics
duration: 4min
completed: 2026-06-12
---

# Phase 6 Plan 04: UI Components (KGradeBadge, DisclaimerCallout, RecommendationBlock) + Nav Extension Summary

**KGradeBadge (K1–K4 CSS-var evidence-tier pill), DisclaimerCallout (locked K4 disclaimer, zero props), RecommendationBlock (inline locked K-body + K4 callout), Reports nav entry, and mobile BottomTab overflow resolved — all 3 tasks complete, lint+tsc clean**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-12T01:26:59Z
- **Completed:** 2026-06-12T01:31:28Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Created `app/components/ui/KGradeBadge.tsx`: K1–K4 evidence-tier pill using CSS vars only (K_CONFIG with var(--ink)/var(--n-100)/var(--focus-500)/var(--focus-50)/var(--n-600)/var(--surface-sunken)/var(--n-500)); chip variant renders badge + sibling muted mono label; inline variant renders K{N} only; aria-label on chip span; visually distinct from StatusBadge
- Created `app/components/ui/DisclaimerCallout.tsx`: zero-props component with locked K4_DISCLAIMER string (ROADMAP SC5), role="note" aria-label="K4 speculative recommendation notice", alert-triangle lucide icon, var(--excess-bg) background + 3px var(--energy) left-border
- Created `app/components/ui/RecommendationBlock.tsx`: wraps in Card elevation="xs" padding="md" (tone="mist" for K4); header row with KGradeBadge chip + source name + StatusBadge (metric) or SubBadge (variant); LOCKED body inline flow "K{N} ({label}): {text}" via KGradeBadge inline + muted mono + Hanken body; DisclaimerCallout rendered only for K4
- Extended `nav-tree.ts`: imported FileText; added Reports NavGroup (id:"reports", FileText, /reports, children: All reports + Generate); added mobileHidden field to NavGroup interface; marked Import mobileHidden:true
- Extended `Sidebar.tsx`: mobile drawer filters mobileHidden groups (shows Import only when active on /import/*), resolving 6-item BottomTab overflow per RESEARCH Open-Q #3

## Task Commits

1. **Task 1: KGradeBadge + DisclaimerCallout** - `9e90259` (feat)
2. **Task 2: RecommendationBlock** - `2b5ca8e` (feat)
3. **Task 3: Reports nav entry + BottomTab overflow** - `8a55cb8` (feat)

## Files Created/Modified

- `remix-app/app/components/ui/KGradeBadge.tsx` - Evidence-tier K1–K4 pill (chip + inline variants, CSS vars, aria)
- `remix-app/app/components/ui/DisclaimerCallout.tsx` - Zero-props K4 locked disclaimer callout
- `remix-app/app/components/ui/RecommendationBlock.tsx` - Per-finding card: locked K-body, header, SubBadge, DisclaimerCallout for K4
- `remix-app/app/components/shell/nav-tree.ts` - FileText import, Reports NavGroup, mobileHidden flag on NavGroup + Import
- `remix-app/app/components/shell/Sidebar.tsx` - Mobile drawer filtering via mobileHidden

## Decisions Made

- CSS vars exclusively in K_CONFIG — no Tailwind color classes; dark mode remap via cascade (per UI-SPEC Pattern 1 CRITICAL CONSTRAINT)
- KGradeBadge chip: badge span + sibling muted span for (label) — not nested inside the badge, per UI-SPEC Pattern 1 rendering spec
- mobileHidden field on NavGroup (not a separate constant) for single-source-of-truth nav; active-group exception prevents stranding users
- DisclaimerCallout zero-props function: removed empty interface — ESLint rule `@typescript-eslint/no-empty-object-type` not in project config; direct function signature is cleaner

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed empty interface from DisclaimerCallout**
- **Found during:** Task 3 (lint pass `npm run lint`)
- **Issue:** `interface DisclaimerCalloutProps {}` with `eslint-disable-next-line @typescript-eslint/no-empty-object-type` triggered `Definition for rule '@typescript-eslint/no-empty-object-type' was not found` error — rule not in project ESLint config
- **Fix:** Removed the empty interface and eslint-disable comment; changed to direct zero-props function signature `export function DisclaimerCallout()`
- **Files modified:** remix-app/app/components/ui/DisclaimerCallout.tsx
- **Committed in:** 8a55cb8 (Task 3 commit, bundled with nav changes)

---

**Total deviations:** 1 auto-fixed (Rule 1 - lint error from rule not in project config)
**Impact on plan:** Zero behavior change — DisclaimerCallout still takes zero props.

## Known Stubs

None — all three components are fully wired UI primitives with no mock data or hardcoded placeholder values. KGradeBadge renders live K-level props; DisclaimerCallout renders the locked string; RecommendationBlock assembles inline body from live props.

## Threat Flags

None — this plan creates pure UI components and extends the nav tree. No new network endpoints, no auth paths, no database access patterns introduced.

## Self-Check

- `remix-app/app/components/ui/KGradeBadge.tsx` — FOUND
- `remix-app/app/components/ui/DisclaimerCallout.tsx` — FOUND
- `remix-app/app/components/ui/RecommendationBlock.tsx` — FOUND
- Commit `9e90259` — Task 1 (KGradeBadge + DisclaimerCallout)
- Commit `2b5ca8e` — Task 2 (RecommendationBlock)
- Commit `8a55cb8` — Task 3 (nav + BottomTab)

## Self-Check: PASSED

---
*Phase: 06-engine-promotion-confidence-graded-reports*
*Completed: 2026-06-12*
