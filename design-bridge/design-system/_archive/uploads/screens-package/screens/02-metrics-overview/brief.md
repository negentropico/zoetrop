# 02 · Metrics overview

- **Route:** `/metrics` (`app/routes/metrics/index.tsx`)
- **Archetype:** Filterable grouped list
- **Screenshots:** `desktop.png` · `mobile.png`
- **Informs:** Phase 4 (live-data metric browsing)

## Purpose
Browse all tracked metrics grouped by category, filterable by status, each row
showing where the value sits relative to its reference/optimal range.

## Data shown
- Header "All Metrics" — "38 metrics across 9 categories".
- **Status filter bar:** pills — All (38) · optimal · borderline · deficient ·
  excess, each with a count; active pill inverts.
- **Category sections:** header (emoji + label + count + per-status count
  badges) over a list of **metric rows**: status dot · name · trend-chart
  indicator · **mini range bar** · value + unit.
- Legend explaining the range bar + trend indicator.

## Current structure
`space-y-4` of `rounded-lg border` category sections; each section header is a
grey strip; rows are hover-highlight links. Filter pills use raw status colors.

## Screen-specific violations
- Emoji section icons → V2.
- Filter pills + count badges use raw `green/yellow/red/orange-*` → V8.
- **Mini range bar** uses `green-400` (optimal) / `yellow-300` (reference) →
  V8; restyle to brand status tokens.
- Blue hover text on rows / metric names → V4.
- Dense rows with fixed `w-24` / `w-20` columns risk cramping at 393px → V9.

## Redesign goals
- The status filter is an ideal **SegmentedControl** (brand component) or a row
  of brand pill Buttons; counts in mono.
- Category headers → mono eyebrow + Lucide icon; section as a frame card.
- Mini range bar → brand status palette; value marker in Ink; keep the
  "value-against-range" semantics (it's good — just re-skin).
- Tabular numerals for every value; units in Space Mono.
- Periwinkle hover/active; warm row hover (`--surface-sunken`).
- Define how rows reflow on mobile (the range bar + value need room).
