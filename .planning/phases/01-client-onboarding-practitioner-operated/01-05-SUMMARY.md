---
phase: 01-client-onboarding-practitioner-operated
plan: "05"
subsystem: shell/ui
tags: [subject-chip, phi-safety, cessation-guard, sidebar, active-subject]
dependency_graph:
  requires: ["01-02", "01-03"]
  provides: [SubjectChip, hasCessationProgram-guard]
  affects: [layout.tsx, AppShell, Sidebar, dashboard.tsx, protocol/index.tsx, protocol/cessation.tsx]
tech_stack:
  added: []
  patterns:
    - SidebarAccount analog for SubjectChip (same state/effects/trigger/dropdown structure)
    - Server-POST form for subject switching (no client-JS cookie write)
    - hasCessationProgram null-flag pattern (loader-level, not component-level)
key_files:
  created:
    - remix-app/app/components/shell/SubjectChip.tsx
  modified:
    - remix-app/app/routes/_app/layout.tsx
    - remix-app/app/components/shell/AppShell.tsx
    - remix-app/app/components/shell/Sidebar.tsx
    - remix-app/app/routes/_app/dashboard.tsx
    - remix-app/app/routes/_app/protocol/index.tsx
    - remix-app/app/routes/_app/protocol/cessation.tsx
decisions:
  - SubjectChip receives subjects + activeSubjectId only as loader props (never imports .server.ts) — build-gate T-01-server-leak enforced
  - Avatar ring=focus used on active-subject avatar in elevated state (visual affordance beyond accent border alone)
  - cessationDay/cessationPhase typed as number|null / Phase|null — null (not 0) when no program, making "no program" vs "day 0" unambiguous
metrics:
  duration: "~6 minutes"
  completed: "2026-06-14"
  tasks: 2
  files: 7
requirements: [ONB-03]
---

# Phase 01 Plan 05: SubjectChip + hasCessationProgram Guard Summary

**One-liner:** Persistent SubjectChip in sidebar footer with accent-elevated PHI-safety state + hasCessationProgram null-guard replacing misleading "Day 0 · Acute" hero on three surfaces.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | SubjectChip + layout loader + AppShell/Sidebar wiring | e46e938 | done |
| 2 | hasCessationProgram null-guard on dashboard + protocol surfaces | 98d4131 | done |

## What Was Built

### Task 1: SubjectChip component + layout loader extension + shell wiring

**SubjectChip.tsx** (183 lines) — a persistent active-subject switcher in the sidebar footer, modeled exactly on `SidebarAccount.tsx`. Key behaviors:

- Resting state (viewing owner): `bg var(--surface-sunken)`, subline `VIEWING`
- Elevated state (viewing a non-owner client): `bg var(--focus-50)`, `border 1px solid var(--accent)`, left `2px solid var(--accent)` accent bar, label and subline `color var(--accent)`, subline text `VIEWING CLIENT`
- Dropdown: header "SWITCH SUBJECT", owner row first with `Badge tone="neutral"`, client rows with `Badge tone="focus"`; each row is a `<Form method="post" action="/subject-switch">` (no client-JS cookie write — Pitfall 2 / T-01-chip-cookie-write)
- Close on navigation, on sidebar collapse toggle, on Escape
- `aria-expanded`, `aria-haspopup="menu"`, `aria-label="Switch active subject"` on trigger; `role="menu"` on dropdown; `role="menuitem"` on each submit button
- Zero `.server.ts` imports (build-gate T-01-server-leak verified via `npm run build`)

**layout.tsx loader extended**: reads `zt-subject` cookie with regex idiom; calls `listSubjectsForTenant(u.tenantId)` for owner/practitioner roles; maps to `{ id, displayName }` array; clients receive empty list and null; both `subjectList` and `activeSubjectId` added to loader return.

**AppShell.tsx**: added `subjectList` and `activeSubjectId` props; threads them through to Sidebar.

**Sidebar.tsx**: added `subjectList` and `activeSubjectId` props; mounts `<SubjectChip>` above `<SidebarAccount>` in `.zn-foot` (conditional on `subjectList.length > 0`).

### Task 2: hasCessationProgram null-guard

Three route files updated to prevent the misleading "Day 0 · Acute" hero for client subjects with no cessation_log row (Pitfall 6):

**dashboard.tsx**:
- `hasCessationProgram = cessation !== null` in loader
- `cessationDay` type changed to `number | null` (null when no program)
- `cessationPhase` type changed to `Phase | null`
- Phasing hero card wrapped: `hasCessationProgram && cessationDay !== null && cessationPhase !== null` renders full hero; else renders locked UI-SPEC placeholder (eyebrow "PROGRAM" / heading "No program started" / body copy)
- `hasCessationProgram` added to loader return

**protocol/index.tsx**:
- Same null-guard pattern applied to cessationDay/cessationPhase
- Phasing card conditionally renders full PhaseBar or the locked placeholder

**protocol/cessation.tsx**:
- Existing `!active` early-return placeholder updated from "Nothing logged yet. Your first frame starts when you begin." to the locked UI-SPEC copy: "No program started" heading + "Program details will appear here once a program start date is set for this client."
- Phase timeline list (upcoming previews) retained as a useful reference even with no active program

## Verification

- `npm test`: 316 passed, 89 skipped (DB-gated) — no regressions
- `npx tsc --noEmit`: 0 errors
- `npm run build`: clean — no `.server` bundle leaks into client

## Deviations from Plan

### Auto-applied

**1. [Rule 2 - Enhancement] Avatar `ring=focus` on elevated active subject**
- **Found during:** Task 1 SubjectChip implementation
- **Issue:** Plan spec showed a border-only elevated state in rail/collapsed mode; Avatar component already supports a `ring` prop that adds a colored ring — more visually clear in rail mode where the chip collapses to avatar-only
- **Fix:** Added `ring={isClientActive ? "focus" : null}` on the trigger Avatar to supplement the border/background treatment
- **Files modified:** remix-app/app/components/shell/SubjectChip.tsx
- **Commit:** e46e938

**2. [Rule 1 - Bug] Conditional SubjectChip render guard**
- **Found during:** Task 1 Sidebar integration
- **Issue:** `subjectList.length === 0` for client-role users; rendering SubjectChip with an empty `subjects` array would display nothing but the component-internal guard (`if (!subjects.length) return null`) handles this — added a redundant outer conditional at the Sidebar level for clarity and to avoid the chip wrapper div for client-role pages
- **Fix:** `{subjectList.length > 0 && <SubjectChip ... />}` in Sidebar footer
- **Files modified:** remix-app/app/components/shell/Sidebar.tsx
- **Commit:** e46e938

None of the above deviations are architectural (Rule 4 threshold not reached). All changes are small behavioral correctness improvements within the task scope.

## Known Stubs

None. SubjectChip receives real subjects from the DB via `listSubjectsForTenant`. The cessation guard renders real data (existing cessation_log) or the locked placeholder — no mock data.

## Threat Flags

No new trust boundaries introduced. SubjectChip is a client component that receives only `Array<{id, displayName}>` — no PHI beyond display names. The `/subject-switch` POST target (Plan 02) owns the security validation (`assertSubjectAccess`). The chip itself is not a trust boundary.

## Self-Check: PASSED

| Item | Result |
|------|--------|
| SubjectChip.tsx exists | FOUND |
| layout.tsx exists | FOUND |
| AppShell.tsx exists | FOUND |
| Sidebar.tsx exists | FOUND |
| dashboard.tsx exists | FOUND |
| protocol/index.tsx exists | FOUND |
| cessation.tsx exists | FOUND |
| Commit e46e938 exists | FOUND |
| Commit 98d4131 exists | FOUND |
