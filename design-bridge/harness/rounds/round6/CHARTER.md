# CHARTER — Zoetrop ZOETROP-R2 (the data-visualization language — visx)

> The parent contract for Zoetrop's **second** charter: a *scoped reopening* of the one subsystem R1
> froze that the product has outgrown — the **chart / data-visualization language**. Authored at S0 of
> R2; every R2 session references it. Run via `zoetrop-design-line`. Ledger: `DECISIONS.md` · manifest:
> `round-manifest.json` (`lineType: charter`, `charter: ZOETROP-R2`) · migration: `MIGRATION.md`.
>
> **STATUS: OPEN.** This is an **explicit charter reopening** (the design-line "reopen a locked decision"
> event), chosen deliberately over a within-LOCK refinement. It un-freezes **only** the S1.2 chart
> language; **everything else in ZOETROP-R1 stays frozen.** It exists because the app's data has outgrown
> a single-series trend chart: it needs distributions, multi-series, and composition-over-time — shapes
> the locked frames idiom cannot express — and a single, lower-level engine to build them.

## S0 decisions (do not re-resolve)

- **Archetype:** B · existing-app round — a **scoped charter reopening** of one subsystem (the chart
  language) inside the otherwise-frozen R1 token system. Not greenfield; not a within-LOCK refinement.
- **Medium:** `screen` (single — no print sibling).
- **Engine (charter-level decision):** **visx 4** (`@visx/*`, Airbnb's low-level React+D3 viz primitives —
  https://visx.airbnb.tech/). **Recharts is retired.** Rationale: visx is lower-level than Recharts, so it
  expresses a bespoke marker language *more* faithfully, and it covers the viz types Recharts can't
  (`@visx/stats` distributions, `@visx/shape` stacks, `@visx/heatmap`, `@visx/threshold`). One engine,
  app-wide.
- **North star:** *Every reading still reads as one calm instrument — but now the instrument has more than
  one dial. Distributions, multiple series, and composition each get a calm, legible, unmistakably-Zoetrop
  treatment, drawn on one visx-built language with one tooltip, one axis system, and one honest color
  policy.*

## What R2 REOPENS (was locked at S1.2 — now up for redesign, this charter only)

The **chart language** — and only the chart language:
- the **"frames" marker idiom** (ringed ink dot + hairline tick) — may evolve / generalize across chart types;
- the **status-encoding rule in charts** ("status only on bands/dots/badges, never the line") — must be
  *restated* for a multi-series / distribution / composition world (see the crux below);
- the **one frame-card tooltip**, the **axis/tick system**, the **projection treatment**, the **chart
  empty/loading** states;
- the rendering **engine** (Recharts → visx).

## What stays FROZEN from R1 (NOT reopened — touching these is out of scope)

Palette / the three metric hue families / **the four status token VALUES** (`--optimal/--borderline/
--deficient/--excess`) · type pairing (Space Grotesk / Hanken Grotesk / Space Mono) · the warm neutral
ramp · the **left-nav chrome** (S1.1) · the **frame-CARD** idiom (`zt-card`) · **compact density** · dark =
`html[data-theme="dark"]` variable-remap only · **no gradients · no emoji · no new colour / radius /
duration / family / size** without an R2 charter decision · the **round5 signature layer** (`zt-sig-*`:
motif, the settle, grain, frame-dot). New work extends existing families and is logged in `MIGRATION.md`.

## The crux this charter must resolve (the design heart)

A single series is **Ink**. But **multi-series** (autonomic: HRV/RHR/recovery) and **composition** (DEXA:
lean/fat/bone) cannot all be ink, and status colour is reserved for the four status tokens. **R2 must
define an honest series-encoding policy that does NOT borrow the status colours and does NOT introduce a
new hue.** The available within-palette resource is the **three metric families** (Energy amber · Vital
teal · Focus periwinkle) — brand hues, not status. The charter's job is to make "how is this marker?"
(status) and "which series is this?" (encoding) two unmistakably-separate axes — exactly as R1 kept
evidence-tier and health-status separate on Reports.

## Stages (the session map — the first is round6)

| Session | Round | Title | Closes |
|---|---|---|---|
| R2.0 | round6 | The viz language + 3 proving viz, on visx | the R2 chart-language rules (marker · series-encoding · tooltip · axes · empty/loading) proven on **distribution · multi-series autonomic · body-comp**, AND the trend "frames" re-expressed on visx |
| R2.1 | round7 | Engine migration complete | TrendChart + Sparkline + every Recharts call site moved to visx; Recharts removed from `package.json`; MIGRATION rows for each swap |
| R2.2 | round8 | Remaining viz surfaces + FREEZE | correlations (revisit the dropped heatmap), protocol-compare, genetics on the R2 language; evaluate freeze |

## Declared freeze criteria (→ `round-manifest.freezeCriteria` — evaluated at R2.2)

| id | kind | note |
|---|---|---|
| viz-tokenized | freeze-blocking | every chart value resolves to a token; any new viz token extends an existing family + has a `MIGRATION.md` row |
| both-themes | freeze-blocking | light + dark parity via the variable-remap (no per-component dark selectors) |
| contrast-floor | freeze-blocking | AA for every chart text/mark pairing, both themes, incl. the series-encoding hues |
| series-vs-status-distinct | freeze-blocking | series encoding never collides with the four status tokens; the two axes are visually unmistakable |
| engine-unified | freeze-blocking | all viz on visx; Recharts removed from the dependency tree |
| reduced-motion-js-off-ok | freeze-blocking | charts render JS-off (SSR-safe) and reduced-motion → instant |
| owner-accept | human-required | owner accepts the R2 chart language live |

## Process rules (in force for every R2 session)

One artifact per session; variations as labelled frames, never forked files. Real data only (real markers,
real WHOOP/DEXA series). Calm, precise voice; sentence case except mono micro-labels. **Touch the truth in
place**; new chart classes get a new namespace (`zt-viz-*`) — never reuse a claimed word. **Append a
`MIGRATION.md` row the moment a token/class is renamed or re-roled** (incl. the Recharts→visx component
swap). The **honesty render** (real components on the token layer, both themes, JS-off) is the exit test of
every session.

## Exit (when R2 freezes)

All data-viz renders on **one visx-built R2 chart language**, both themes, JS-off; series-vs-status is
unmistakable; Recharts is gone; every freeze criterion met and `owner-accept` recorded by a person;
`MIGRATION.md` complete. Then tag the v2 chart-language baseline, author the v2 doc set, write `RETRO.md`.
Future viz work runs as refinement LINEs off the frozen R2 language.
