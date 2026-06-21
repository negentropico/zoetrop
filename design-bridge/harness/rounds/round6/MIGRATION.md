# MIGRATION — ZOETROP-R1 → ZOETROP-R2 (chart / data-viz language)

> The continuous v1→v2 alias map for the **chart-language** reopening. **Append a row the moment** a chart
> token/class is renamed or re-roled, or a component is swapped. Required by `CHARTER.md`; a freeze
> criterion (`viz-tokenized`) checks it. Everything NOT in the chart language carries over unchanged from
> R1 — this file only records what R2 moves.

## Engine swap (charter-level)

| R1 (Recharts) | R2 (visx) | Status | Round | Note |
|---|---|---|---|---|
| `recharts` dependency | `@visx/*` (visx 4) | planned | R2.1 | retire Recharts from `package.json` once all call sites move |
| `TrendChart.tsx` (ComposedChart) | visx `LinePath` + custom frame marks + `@visx/{scale,axis,grid,tooltip,responsive}` | planned | R2.0 re-express → R2.1 land | the "frames" idiom, rebuilt |
| `Sparkline.tsx` | visx `LinePath` (+ last-point glyph) | planned | R2.1 | |
| `recharts` `<Tooltip>` + `zt-tip-frame` | visx `@visx/tooltip` + the evolved frame-card tooltip | planned | R2.0 | one tooltip across all viz |

## Token / class aliases (append as they occur)

| R1 name | R2 name / role | Kind | Round | Note |
|---|---|---|---|---|
| _(none yet)_ | | | | new chart classes use the `zt-viz-*` namespace; prefer ZERO new tokens |

## Re-roles (a value kept but used differently)

| Token | R1 role | R2 role | Round | Note |
|---|---|---|---|---|
| `--energy-* / --vital-* / --focus-*` | brand/metric hues (accents, category identity) | **+ series-encoding palette** in multi-series / composition charts | R2.0 | additive re-role — does NOT touch the four status tokens (kept reserved for status) |

> **Invariant:** the four status tokens (`--optimal/--borderline/--deficient/--excess`) are **never**
> re-roled to encode series — that separation is a freeze criterion (`series-vs-status-distinct`).
