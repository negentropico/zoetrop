---
phase: quick
plan: 260610-rj2
subsystem: ui-shell
tags: [breadcrumb, page-header, left-nav, react-router]
requires: []
provides:
  - "PageHeader crumbs prop (CrumbItem[] | null) with crumbsForPath auto-derive + meta-row layout"
  - "crumbsForPath without zoetrope segment; null for single-segment paths"
  - "AppShell with no shell-level crumb render"
affects: [all 17 PageHeader consumer routes, metrics/category, metrics/detail, protocol/version-detail]
tech-stack:
  added: []
  patterns:
    - "PageHeader owns crumbs: auto-derive from pathname, explicit crumbs prop overrides (null suppresses)"
    - "Crumbs only at depth >= 2 — single-segment crumbs suppressed as title duplication"
key-files:
  created: []
  modified:
    - remix-app/app/components/shell/nav-tree.ts
    - remix-app/app/components/ui/Crumb.tsx
    - remix-app/app/components/ui/PageHeader.tsx
    - remix-app/app/components/shell/AppShell.tsx
    - remix-app/app/routes/_app/metrics/category.tsx
    - remix-app/app/routes/_app/metrics/detail.tsx
    - remix-app/app/routes/_app/protocol/version-detail.tsx
decisions:
  - "Crumb component is margin-free; spacing is the container's responsibility (meta row mb-2.5 / marginBottom 10)"
  - "metrics/category + metrics/detail (no PageHeader) get the design's crumbs-only justify-end meta-row treatment instead of a forced PageHeader adoption"
metrics:
  duration: "~2m"
  completed: "2026-06-10"
---

# Quick Task 260610-rj2: Merge Breadcrumb into PageHeader Meta Row Summary

**One-liner:** Breadcrumb relocated from a stacked shell-level block into the PageHeader meta row (right of the eyebrow), with the ZOETROPE segment dropped everywhere and single-segment crumbs suppressed — crumbs now appear only at depth >= 2.

## What Was Done

### Task 1: Crumb plumbing (commit 8dc53ec)

- **nav-tree.ts `crumbsForPath`:** dropped the leading `{ label: "zoetrope", to: "/dashboard" }` item from every return; `/settings` and group-base paths (would be single-segment) now return null. Only non-null case: exact child → `[{group.label, to: group.base}, {child.label}]`. `/dashboard` early return, `ownCrumb` suppression, and deeper-than-child null unchanged. Doc comment updated to the new contract.
- **Crumb.tsx:** removed the built-in `marginBottom: "var(--gap-lg)"` — containers own spacing.
- **PageHeader.tsx:** new optional `crumbs?: CrumbItem[] | null` prop. `useLocation()` called unconditionally; `crumbs === undefined` auto-derives via `crumbsForPath(pathname)`, explicit `null`/array overrides. New layout: outer `mb-8` wrapper → conditional meta row (`flex items-baseline justify-between mb-2.5`: eyebrow left or empty `<span/>` spacer, Crumb right) → unchanged title row (h1 + sub left, `right` slot right).
- **AppShell.tsx:** shell-level crumb render, `crumbs` computation, and `Crumb`/`crumbsForPath` imports removed; `pathname` stays for the drawer-close effect; file-top comment updated.

### Task 2: Route migrations (commit ee771d4)

- **protocol/version-detail.tsx:** standalone `<Crumb/>` block + `Crumb` import deleted; explicit `crumbs={[Protocol, Versions, version.version]}` added to the existing PageHeader call. The `right` slot (prev/next buttons + Current badge) untouched — crumb lands in the meta row beside eyebrow "PROTOCOL VERSION".
- **metrics/category.tsx:** standalone Crumb replaced by a right-aligned `justify-content: flex-end` row (`marginBottom: 10`) with zoetrope-free items `[Metrics, categoryInfo.label]`; CatChip custom header unchanged; Crumb import kept (still used).
- **metrics/detail.tsx:** same justify-end treatment with items `[Metrics, categoryInfo.label → /metrics/:category, metric.name]`; Crumb import kept.

## Double-Crumb Verification (code-path)

- `/metrics/:category` → nav child has `ownCrumb: true` → `crumbsForPath` null (and page has no PageHeader anyway)
- `/metrics/:category/:metricId` → deeper than exact child → null
- `/protocol/versions/:version` → deeper than exact child → null; explicit `crumbs` prop overrides auto-derive regardless

Only the explicit per-page crumbs render — exactly one crumb per route.

## Verification

| Gate | Result |
|------|--------|
| `npm run typecheck` (typegen + tsc) | PASS |
| `npm run lint` | PASS |
| `npm run test` | PASS — 195 passed, 58 skipped |
| `npm run build` | PASS (client + SSR) |
| `grep -rn 'label: "zoetrope"' app/` | 0 matches (AppShell footer brand text is a plain string, retained) |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — pure client-side presentational restructure; no new inputs, data access, or packages (per plan threat model T-q-01: accept).

## Commits

| Commit | Description |
|--------|-------------|
| 8dc53ec | refactor(quick-260610-rj2): merge crumb into PageHeader meta row — plumbing |
| ee771d4 | refactor(quick-260610-rj2): migrate loader-crumb pages to meta-row crumbs |

## Self-Check: PASSED

- All 7 modified files exist with expected content (crumbsForPath zoetrope-free, PageHeader crumbs prop + auto-derive, AppShell crumb-free, three routes migrated)
- Commits 8dc53ec and ee771d4 present on `left-nav-refactor`
- No file deletions in either commit
