# round6 Brief — ZOETROP-R2 · S2.0 (the data-visualization language, on visx)

> **Round goal:** one calm, **visx-built** data-visualization language that handles the app's real data
> shapes — **distributions, multiple series, composition-over-time** — and **re-expresses the trend
> "frames"** in the same family, with one tooltip, one axis system, and **one honest series-vs-status
> colour policy.** "Done" = four viz (the re-expressed frames + distribution + multi-series + composition)
> that read as one instrument, both themes, JS-off, where a reader instantly separates *"which series?"*
> from *"what status?"*.

This is the **opening session of charter ZOETROP-R2** — an **explicit reopening** of the one R1 subsystem
the app outgrew (the chart language, locked at S1.2). It is NOT a within-LOCK refinement. See
`../CHARTER.md` (what reopens vs what stays frozen, the crux, freeze criteria) and `../PROMPT-S-R2.0.md`.

## Why R2 (the design problem)

R1's chart language is a single-series trend chart — the "frames" idiom (ringed ink dot + tick; data is
Ink; status only on bands/dots/badges; one frame-card tooltip; milestones not dates; linear-fit
projection), built on **Recharts**. The app's data has outgrown it: it needs **distributions** ("is this
marker normal — where do I sit?"), **multi-series** (autonomic: HRV/RHR/recovery/sleep), and
**composition-over-time** (DEXA: lean/fat/bone) — shapes a single ink line can't show. R2 re-opens the
chart language, moves to **one lower-level engine (visx)**, and resolves the crux below.

## The crux (the heart of this round)

A single series is **Ink**. Multi-series and composition cannot all be ink, and the four **status** tokens
are reserved for "how is this marker?". So R2 must define a **series-encoding** policy that uses **neither
the status colours nor a new hue** — the available within-palette resource is the **three metric families**
(Energy amber · Vital teal · Focus periwinkle). Make *"which series?"* and *"what status?"* two
unmistakably-separate axes (the same discipline R1 used to keep evidence-tier and health-status apart).

## Surfaces / viz in scope (the proving set)

| Viz | What | Surface | Likely visx |
|---|---|---|---|
| Trend "frames" (re-expressed) | the locked idiom, rebuilt on visx, visibly the same language as the rest | metric-detail | `@visx/{shape,scale,axis,grid,curve,glyph,tooltip,responsive}` |
| Distribution / "you are here" | where a marker sits vs reference/optimal (+ population if available); status on the "you are here" marker only | metric-detail | `@visx/stats` or `@visx/shape` density + marker |
| Multi-series autonomic | HRV/RHR/recovery/sleep over time — the series-encoding policy in action | autonomic category | `@visx/shape` LinePath ×N + `@visx/voronoi` + `@visx/legend` |
| Composition-over-time | DEXA lean/fat/bone — stacked/segmented | body-composition | `@visx/shape` `BarStack`/`AreaStack` |

## Out of scope (frozen — do not touch)

Everything in R1 except the chart language: palette + the three metric hues + **the four status token
values** · type pairing · warm neutrals · the left-nav chrome · the **frame-CARD** (`zt-card`) · compact
density · dark variable-remap · **no gradients / no emoji** · the **round5 signature layer** (`zt-sig-*`) —
consume it (frame-dot, the settle), don't fight it. Other viz surfaces (correlations heatmap,
protocol-compare, genetics) come in R2.2 — not this round.

## Token & migration discipline

Engine = **visx 4** (`@visx/*`); **Recharts retired** (the swap is logged in `MIGRATION.md`). New chart
classes use the **`zt-viz-*`** namespace. Prefer zero new tokens; any unavoidable one extends an existing
family, is logged in `CHANGES.md`, and gets a `MIGRATION.md` row. Return per `RETURN-SPEC.md`; the code
side gates every return with `design-bridge/RETURN-GATE.md` before integrating.
