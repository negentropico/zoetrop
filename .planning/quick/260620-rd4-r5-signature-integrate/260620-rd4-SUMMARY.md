---
id: 260620-rd4
slug: r5-signature-integrate
type: quick
status: complete
created: 2026-06-21
completed: 2026-06-21
branch: design/zoetrop-dl-prime
commits:
  - bff7bd2  # Task 1: Signature module + CSS layer
  - 1b68e0e  # Task 2: Root wiring + chart delegation
  - b0705ae  # Task 3: Three archetypes
---

# Quick Task 260620-rd4 — r5-signature-integrate SUMMARY

## One-liner

Spiral/phyllotaxis LINE-signature integrated into Zoetrop app: `Signature.tsx` module,
`zt-sig-*` CSS layer appended to `app.css`, root `useSignature()` wired, `ChartEmpty`/
`ChartLoading` delegated to branded states, and the three layout archetypes (dashboard,
metric detail, metrics catalog) carry the settle gesture + icon-signature — zero token delta.

## Must-haves status

| Requirement | Status |
|---|---|
| Zero new CSS custom properties (token delta = none) | PASSED — `git diff` of appended block shows only `.zt-sig-*` / `@keyframes ztSig*` rules; `grep -E '^\s*--[a-z]'` of the new section returns zero matches |
| Both themes via existing `html[data-theme="dark"]` remap | PASSED — two dark rules in new.css (`zt-sig-ghost`, `zt-sig-empty-mark .zt-sig-ghost`) already in `app.css`; no per-component dark selectors added |
| JS-off renders the resting (final, visible) state | PASSED — all animations gate under `.zt-sig-on` (JS-added) + `@media (prefers-reduced-motion: no-preference)`; base states are always fully drawn/visible |
| Metrics catalog: icon-signature only, no watermark, no row grain | PASSED — `grep SigGhost/zt-sig-ghost/SigEmpty` on `metrics/index.tsx` returns zero results; only `zt-sig-frame`, `zt-sig-icon`, `sigDelay` appear |
| `remix-app/app/components/ui/Signature.tsx` created | PASSED |
| `remix-app/app/app.css` has zt-sig-* layer at tail | PASSED |
| AppShell, TrendChart, dashboard, metrics/index, metrics/detail updated | PASSED |

## Build gate

`npm run build` passed clean. Pre-existing sourcemap warnings on `Dropzone.tsx` and
`PdfPageViewerInner.tsx` are unrelated to this task (present before any changes).
TypeScript strict: `npx tsc --noEmit` returned zero errors across all three task cycles.

## Tasks completed

| Task | Commit | Files |
|---|---|---|
| Task 1: Signature module + CSS layer | bff7bd2 | `Signature.tsx` (new), `app.css` (zt-sig-* appended) |
| Task 2: Root wiring + chart delegation | 1b68e0e | `AppShell.tsx`, `TrendChart.tsx` |
| Task 3: Three archetypes | b0705ae | `dashboard.tsx`, `metrics/detail.tsx`, `metrics/index.tsx` |

## Honesty render notes

**Dashboard (`/`):**
- Corner `SigGhost` (draw, 200px, `position:absolute bottom:-40 right:-40`) is clipped by
  `overflow:hidden` on the hero Card. Only one watermark per surface.
- `SigEyebrow` (frame-dot + mono label) wraps "Metric status", "Recent highlights", and
  "Metric categories" section eyebrows.
- 4 highlight cards + 9 category cards carry `zt-sig-frame` + `sigDelay(goldenRanks(n)[i])`.
- Category icon tiles wrapped in `<span className="zt-sig-icon">` for the hairline frame.

**Metric detail (`/metrics/:category/:id`):**
- Three frame cards (chart, ranges, 2026 targets) carry `zt-sig-frame` at stagger indices
  0, 1, 2 in sequence. Targets card is conditional — only applies `zt-sig-frame` when it renders.
- Chart empty/loading states (when `history.length < 2`) delegate to `SigEmpty`/`SigLoading`
  via the updated `ChartEmpty`/`ChartLoading` in `TrendChart.tsx`.

**Metrics catalog (`/metrics`):**
- Each `CategorySection` card carries `zt-sig-frame` + φ-stagger.
- Category icon tiles in the section header wrapped in `zt-sig-icon`.
- Dense `MetricRow` rows unchanged — no watermark, no grain, no animation per-row.
  Character holds without noise.

**Grain stacking (reconciliation #3):**
- `.zt-sig-on .zn-app::before` sits at `z-index: -1` behind all in-flow content.
- Shell elements (topbar `z-40`, sidebar `z-60`, flyout `z-80`, mobile backdrop `z-55`,
  account menu `z-90`) are `position: fixed` — they participate in the viewport stacking
  context, not in `.zn-app`'s. The `position: relative` shim on `.zt-sig-on .zn-app` creates
  a stacking context for the grain pseudo-element but has no effect on fixed-positioned
  descendants. Grain cannot disturb the collapsed-rail flyout, sticky topbar, or mobile drawer.

**JS-off / reduced-motion:**
- All motion and the spiral draw are gated under `.zt-sig-on` (JS-added on mount) +
  `@media (prefers-reduced-motion: no-preference)`. The global reduce rule
  (`animation-duration: 0.01ms !important`) collapses all durations to instant for
  reduced-motion users. The resting state (fully drawn spiral, base opacity seed dots,
  7px-settled cards) is always the visible state — nothing is hidden at zero.

**Dark theme:**
- `html[data-theme="dark"] .zt-sig-ghost` bumps opacity to 0.08 (vs 0.05 light).
- `html[data-theme="dark"] .zt-sig-on .zn-app::before` flips to `mix-blend-mode: screen`
  at 0.07 opacity — reads as light grain on warm-dark paper.
- No per-component dark selectors added beyond the two already in `new.css`.

## Deviations from plan

None. Plan executed exactly as written. All four resolved reconciliations honored:
1. `ZT_SPIRAL_D` inline in `Signature.tsx` with canonical-source comment.
2. `feTurbulence` canvas grain from `new.css` adopted; `.zt-grain` dotted utility untouched.
3. `.zt-sig-on .zn-app { position: relative }` + `::before { z-index: -1 }` kept as specified.
4. `--sig-i` typed via `as React.CSSProperties` cast in `sigDelay()`.

## Known stubs

None. All wired. The chart empty/loading states use branded components. The grain is live CSS.
The signature fires on mount via `useSignature()`.

## Threat flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced.
The grain is a pure CSS pseudo-element (SVG data URI, no network request). `useSignature()`
manipulates only `document.documentElement.classList`.

## Self-Check: PASSED

Files exist:
- `remix-app/app/components/ui/Signature.tsx` — created
- `remix-app/app/app.css` — zt-sig-* block appended

Commits exist:
- bff7bd2 — Task 1
- 1b68e0e — Task 2
- b0705ae — Task 3

Build: PASSED (npm run build, no errors)
TypeScript: PASSED (npx tsc --noEmit, no errors)
Token delta: ZERO (no `--token:` definitions in appended CSS block)
