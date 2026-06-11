---
phase: quick-260610-rwg
plan: 01
subsystem: ui
tags: [page-header, breadcrumbs, metrics, refactor]
requires: []
provides:
  - PageHeader with optional icon and titleAccessory props
  - metrics category + detail headers unified on PageHeader geometry
affects: []
tech-stack:
  added: []
  patterns:
    - "All page headers render via PageHeader: meta row (eyebrow left, crumbs right) then title row"
key-files:
  created: []
  modified:
    - remix-app/app/components/ui/PageHeader.tsx
    - remix-app/app/routes/_app/metrics/category.tsx
    - remix-app/app/routes/_app/metrics/detail.tsx
decisions:
  - "icon slot wraps title block in flex items-center gap-16; titleAccessory wraps h1 in flex items-center gap-12 flex-wrap — both optional, default render path unchanged"
  - "Metric unit stays in the right slot (never the eyebrow) so the no-text-transform rule keeps µmol/L from becoming MMOL/L"
metrics:
  duration: ~5 min
  completed: 2026-06-10
---

# Quick Task 260610-rwg: Unify Page Headers (PageHeader icon/titleAccessory) Summary

PageHeader gained optional `icon` and `titleAccessory` slots, and the two hand-rolled metrics headers (category + detail) migrated onto it — every page now shares identical header geometry with no orphan crumb rows or floating meta labels.

## What Changed

**PageHeader.tsx** — two new optional props:
- `icon?: ReactNode` — renders beside the title block (h1 + sub) in a `flex items-center` row with `gap: 16` (reproduces the old CatChip-beside-title layout). Absent = identical to prior render.
- `titleAccessory?: ReactNode` — wraps the h1 in a `flex items-center flex-wrap` row with `gap: 12`, accessory after the h1 (StatusBadge beside metric name). Absent = bare h1 as before.
- Meta row, title-row justify-between/items-end, `right` slot, mb-8, sub maxWidth 620, and crumb auto-derive semantics all unchanged. Header comment updated.

**category.tsx** (`/metrics/:category`) — standalone crumb row and custom header div deleted; replaced by a single `<PageHeader>` with CatChip icon, `"{totalCount} tracked"` eyebrow (zt-eyebrow renders mono uppercase, replacing the floating right-side span), title/sub from categoryInfo, and explicit 2-level crumbs. `Crumb` import removed, `PageHeader` import added.

**detail.tsx** (`/metrics/:category/:metricId`) — standalone crumb row and custom header flex deleted; replaced by `<PageHeader>` with "Last updated … · source" eyebrow, `titleAccessory={<StatusBadge status={status} />}`, explicit 3-level crumbs, and the readout column (zt-readout value + unit div) moved verbatim into the `right` slot. The unit div's load-bearing comment — no text-transform because uppercasing µ (U+00B5) maps to Greek capital mu Μ (U+039C), rendering "µmol/L" as "MMOL/L" — preserved byte-for-byte. `Crumb` import removed, `PageHeader` import added.

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test` | Pass (195 passed, 58 skipped) |
| `npm run build` | Pass |
| `grep "<Crumb" app --include=*.tsx \| grep -v components/ui` | Empty — no standalone Crumb rows remain |
| Unit no-text-transform comment in detail.tsx | Present (1 occurrence); unit not inside any zt-eyebrow |

## Commits

| Commit | Description |
|--------|-------------|
| 299c488 | refactor(quick-260610-rwg): unify metrics headers onto PageHeader (icon + titleAccessory) — 3 files, +99/-114 |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — pure presentational refactor, all data already wired.

## Self-Check: PASSED

- SUMMARY.md exists, commit 299c488 on left-nav-refactor, titleAccessory in PageHeader.tsx, `<PageHeader` in both migrated routes.
