---
phase: quick-260612-d8s
plan: 01
subsystem: design-system
tags: [design-roundtrip, round3, prototype, screenshots, left-nav]
requires: []
provides:
  - "Self-rendering build-free prototype of all Part A screens (left-nav chrome, real app.css tokens, Recharts charts)"
  - "Round 3 package docs re-pointed from basic-auth preview URL to prototype/index.html"
  - "50-PNG light+dark reference screenshot archive of the live app"
affects: [docs/design-system/_rounds/round3/package]
tech-stack:
  added: []
  patterns:
    - "CDN UMD prototype pattern (round1 precedent + Recharts UMD + left-nav zn-* chrome)"
    - "Playwright-from-npx-cache screenshot harness against the live dev server"
key-files:
  created:
    - docs/design-system/_rounds/round3/package/prototype/index.html
    - docs/design-system/_rounds/round3/package/prototype/app.css
    - docs/design-system/_rounds/round3/package/prototype/app/data.js
    - docs/design-system/_rounds/round3/package/prototype/app/lib.jsx
    - docs/design-system/_rounds/round3/package/prototype/app/screens.jsx
    - docs/design-system/_rounds/round3/package/prototype/app/main.jsx
    - docs/design-system/_rounds/round3/package/screenshots/ (50 PNGs + _NOTES.md)
  modified:
    - docs/design-system/_rounds/round3/package/README.md
    - docs/design-system/_rounds/round3/package/BRIEF.md
decisions:
  - "Recharts 2.12.7 UMD + prop-types UMD via unpkg for the prototype trend chart (matches real TrendChart idiom)"
  - "Tailwind @import stripped from the prototype app.css copy (404s as a static file; tokens/remap/zn-* untouched)"
  - "Screenshot pass driven by npx-cached playwright@1.58.2 + cached chromium-1208 (chrome-devtools MCP unavailable in agent context — Rule 3 deviation, no new package installed)"
metrics:
  duration: ~35m (across checkpoint)
  tasks: 4
  files: 60
completed: 2026-06-12
---

# Quick Task 260612-d8s: Round 3 Self-Rendering Design Package + Reference Screenshots Summary

**One-liner:** Build-free CDN-React/Recharts prototype renders all Part A screens in the real left-nav chrome with real app.css tokens so the designer needs no auth; package docs re-pointed; 50 light+dark live-app screenshots archived.

## What was built

### Task 1 — Prototype scaffold (`9e08ef7`)
- `prototype/index.html`: pre-paint `zt-theme` script (mirrors the app's NO_FLASH_SCRIPT), real `app.css` link, CDN UMD chain (React 18.3.1 → ReactDOM → prop-types → Recharts 2.12.7 → Lucide 0.544.0 → Babel standalone), then `data.js` + `lib.jsx` + `screens.jsx` + `main.jsx`.
- `prototype/app.css`: verbatim copy of the `current-state/app.css` token snapshot (`--zn-side-w`, warm-dark remap, full zn-* shell CSS).
- `app/data.js`: `window.ZD` seeded dataset — 9 categories with status counts, 4–7 metrics each with opt/ref ranges + 4-point history, 10 correlation rows, 5 protocol versions, 3 supplement tiers, 4 cessation phases, 5 genetic variants. Plausible but obviously sample, no PHI.
- `app/lib.jsx`: hash router, Lucide `Icon`, left-nav `Sidebar` using real zn-* classes (single-open accordion that re-opens the active group, collapsed rail + hover flyout, mobile drawer + topbar), `AppShell` with class-driven content offset, `PageHeader` (eyebrow left / crumb right meta row), `ThemeToggle` writing `zt-theme` + `data-theme`, plus `StatusDot/StatusBadge/CountDots/Sparkline/RangeBar/PhaseBar/MetricRing/DataTable` and a **Recharts `TrendChart`** (LineChart + two ReferenceArea bands + custom tooltip + custom dots).
- `app/main.jsx`: path → screen mapping for the full Part A route set.

### Task 2 — Screens + doc re-pointing (`9e21b42`)
- `app/screens.jsx`: 19 screens — Dashboard (cessation PhaseBar + category grid + highlight cards), Metrics overview, Category detail (RangeBar rows + sparklines), **Metric detail (Recharts TrendChart with optimal/reference bands + tooltip + history DataTable)**, Protocol overview/Versions/Supplements/Cessation/Compare, Insights overview, **Correlations (stat cards + significance filter pills + sortable DataTable with colored r/p columns)**, Genetics, Import overview/WHOOP/Vault, Ingest overview/Upload/Review, Settings. Every sidebar link resolves.
- `README.md`: "Work from the live preview" (basic-auth Vercel URL) replaced with "Self-render the app" pointing at `prototype/index.html`; return contract noted unchanged.
- `BRIEF.md`: "How to view the app for this round" section added above Part A; route table/Part B asks/NOT-to-change list untouched.

### Checkpoint fix (`d9a1ba4`)
- Stripped `@import "tailwindcss"` from the prototype app.css copy (harmless 404 noise as a static file). Requested at checkpoint approval.

### Task 4 (plan Task 3-post-checkpoint) — Screenshot pass (`837dd96`)
- 50 PNGs at 1280px full-page, light AND dark, from the live dev server (main repo, `npm run dev`, owner sign-in via `/login`): landing + login signed-out, all 21 authed Part A routes including dynamic `/metrics/autonomic/autonomic-hrv-m4` and `/protocol/versions/P6`, plus `metrics-detail-tooltip-{theme}` (Recharts hover tooltip captured) and `insights-correlations-hover-{theme}` (row hover).
- `screenshots/_NOTES.md`: coverage table, redirects (`/ingest` and `/ingest/consent` → `/ingest/upload`; consent already on file for owner), live-sidebar "Reports" group drift vs the round 3 nav-tree snapshot.
- Dev server started and stopped within the task; credentials read from `.env` at runtime by the harness script only — never echoed, logged, or committed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] chrome-devtools MCP tools unavailable in agent context**
- **Found during:** Task 4 (screenshot pass)
- **Issue:** Neither ToolSearch nor any `mcp__chrome-devtools__*` tool was loadable in this agent context (known upstream issue stripping MCP tools from sub-agents).
- **Fix:** Used the npx-cached `playwright@1.58.2` package (already on disk, matching cached chromium-1208 binaries) to drive a real headless browser. **No new package was installed.** Screenshots are genuine renders of the live dev server — 50/50 captures succeeded.
- **Files modified:** none in-repo (harness script lived in /tmp, removed after the run)
- **Commit:** `837dd96` (screenshots)

**2. [Checkpoint-requested fix] Tailwind import 404 in static prototype**
- **Found during:** human verification at the Task 3 checkpoint
- **Issue:** `@import "tailwindcss"` (line 1 of the copied app.css) 404s when served statically — console noise, no visual effect.
- **Fix:** Removed the import line; all tokens, dark remap, and zn-* rules untouched.
- **Commit:** `d9a1ba4`

## Authentication Gates

- Task 4 required owner sign-in through `/login` (no env bypass exists, by design). Handled in-task with credentials from `remix-app/.env` read at runtime — normal flow, not a blocker.

## Known Stubs

Prototype-only (intentional, design artifact — not app code):
- Lighter screens (`Compare`, `Vault`, `Ingest Review`) render a PageHeader + representative empty-state card per the plan's explicit allowance, so all sidebar links resolve.
- Sidebar account area is a static "Owner / owner@example.com" stub (no auth in a static prototype).

None block the plan goal; the two chart-bearing screens (metric detail, correlations) render real Recharts/DataTable idioms as required.

## Verification

- All four automated `<verify>` blocks pass (re-run at completion).
- Human checkpoint approved (dashboard, metric detail chart, correlations, theme toggle, README/BRIEF re-pointing).
- 50/50 screenshot captures OK; spot-checked dashboard-light + metrics-detail-tooltip-dark visually (real authed renders, warm-dark, tooltip visible).
- No `remix-app/` file touched (constraint honored — checked via `git diff --stat a8a619e..HEAD -- remix-app/` → empty).

## Self-Check: PASSED

- prototype/index.html, app.css, app/{data.js,lib.jsx,screens.jsx,main.jsx}: FOUND
- screenshots/: 50 PNGs + _NOTES.md: FOUND
- Commits 9e08ef7, 9e21b42, d9a1ba4, 837dd96: FOUND on `worktree-agent-a7005bbcbdabec700`
