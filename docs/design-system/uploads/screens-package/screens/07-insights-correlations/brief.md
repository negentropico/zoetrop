# 07 · Insights · correlations

- **Route:** `/insights/correlations` (`app/routes/insights/correlations.tsx`)
- **Archetype:** **Data table** + filters + stat row
- **Screenshots:** `desktop.png` · `mobile.png`
- **Informs:** **Phase 6 (reports)** — the engine surfaces evidence in tables

## Purpose
Show supplement ↔ metric correlations with strength, significance, lag, and
sample size — the analytical / evidence layer.

## Data shown
- **5 stat tiles** (colored borders): Total · Strong · Moderate · Weak · p<0.05.
- **Filters:** significance pills (All/Strong/Moderate/Weak), supplement
  `<select>`, sort `<select>`.
- **Correlation table:** Supplement · Metric · **Correlation bar** (diverging,
  center line, +green / −red) · Significance badge · Lag · p-value · n.
- **Interpretation guide** (strength + significance legend).

## Current structure
Stat grid → filter row → a real `<table>` in a `rounded-lg border` card →
guide card. Heavy use of green/blue/yellow tints; native selects.

## Screen-specific violations
- Stat tiles tinted `green/blue/yellow-50` → V8/V5.
- Correlation bar: positive **green**, negative **red** → map to brand
  (Vital `+` / Danger `−`, or a documented diverging scale).
- Significance badges raw colors; native `<select>` controls are unstyled → V4.
- The dense 7-column table has **no mobile strategy** → V9.

## Redesign goals
- **This screen defines the data-table pattern for the whole product** (Phase 6
  reports will lean on it heavily). The brand DS has **no table component** —
  please design one (header row in mono eyebrow style, warm hairline row
  dividers, hover in `--surface-sunken`, tabular-num data cells in Space Mono,
  zebra optional). **Flag it as a new component** for the system.
- Correlation bar → brand diverging scale; numbers mono tabular.
- Significance → brand `Badge` tones (strong=Vital, moderate=Focus,
  weak=Energy, none=neutral).
- Filters → brand SegmentedControl (significance) + brand select/Input styling.
- Stat tiles → brand `Stat`.
- Define the table's **responsive behavior** (horizontal scroll vs
  card-per-row) — this is the canonical dense-table test for Q4.
