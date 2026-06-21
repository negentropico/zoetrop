# PROMPT — ZOETROP-R2 · S2.0 (the data-visualization language, on visx)

> The **opening session** of charter **ZOETROP-R2** — a *scoped reopening* of R1's locked chart language.
> Run via `zoetrop-design-line` → `zoetrop-design-roundtrip`. `lineType: charter` · `propagation: physics`.
> Engine: **visx 4** (`@visx/*`, https://visx.airbnb.tech/) — Recharts is retired.
> Inbound transport = **DesignSync** (the ZTP1 prototype project `f200a4ef-34c4-4d73-9e03-c210e759225a`);
> gate every return with `design-bridge/RETURN-GATE.md`.
> Read order: this → `CHARTER.md` (the R2 contract) → `../round1/CHARTER.md` + `../round1/DECISIONS.md`
> (what stays frozen) → `package/current-state/app.css` → the current frames idiom in
> `remix-app/app/components/ui/TrendChart.tsx` (the thing being reopened) → the visx docs.

## Header — session context

- **Charter:** ZOETROP-R2 — **OPEN**. This is an **explicit reopening** of the one R1 subsystem the app
  outgrew: the **chart / data-visualization language** (locked at R1 S1.2). **Everything else in R1 stays
  frozen** (see `CHARTER.md` "What stays FROZEN").
- **Session:** S2.0 (round6) — the opener.

## Kickoff (one artifact, one sentence)

Design **one calm, visx-built data-visualization language** that handles the app's real data shapes —
**distributions, multiple series, and composition-over-time** — and **re-expresses the trend "frames"** in
the same language, with **one tooltip, one axis system, and one honest series-vs-status colour policy.**

## Context to load first (ordered)

1. `package/current-state/app.css` — the frozen token + class layer (the source of truth for every value).
2. `CHARTER.md` (this charter — what R2 reopens vs what stays frozen, the crux, the freeze criteria).
3. `../round1/CHARTER.md` → `../round1/DECISIONS.md` (R1 S1.0–S1.2 — the frozen foundation) and
   `../round1/ROUNDTRIP.md` §5 (the guardrails that still hold).
4. **The thing being reopened:** the locked "frames" idiom + its 8 rules, as built today on Recharts in
   `remix-app/app/components/ui/TrendChart.tsx` (header comment) + `Sparkline.tsx`.
5. **The engine:** https://visx.airbnb.tech/ — packages you'll likely use: `@visx/{scale,shape,axis,grid,
   group,curve,glyph,text,tooltip,responsive}` (the frames idiom), `@visx/stats` (distributions),
   `@visx/shape` `BarStack`/`AreaStack` (composition), `@visx/threshold` + `@visx/voronoi` (multi-series),
   `@visx/heatmap` (later). Umbrella: `@visx/visx`.
6. **ASSET-INVENTORY** (per `design-bridge/RETURN-GATE.md`): the round5 signature layer is live — the
   `zt-sig-*` motif/grain/frame-dot and the `--ease-frame` "settle". **Consume it** (the frame-dot glyph,
   the settle on chart mount) — do not reinvent or fight it.

## Prior closed record (R1 — this is *record*, except S1.2 which this session REOPENS)

- **S1.0 ☑** — the Zoetrop language (palette · type · frame cards · the four status tokens). **Frozen.**
- **S1.1 ☑** — the consolidated left-nav chrome. **Frozen / BAKED.**
- **S1.2 ☑ → REOPENED here** — the "calm instrument" screen language. Its **chart** decisions (the frames
  idiom, the 8 rules, the status-on-bands-only rule, the frame-card tooltip, milestones-not-dates,
  linear-fit projections, the chart empty/loading) are **what R2 reopens.** Its **non-chart** decisions
  (status tokens, density, populated-state patterns) stay frozen.

## Locked decisions (still frozen in R2 — do NOT reopen)

Palette / the three metric hue families / **the four status token VALUES** · type pairing · warm neutral
ramp · left-nav chrome · the **frame-CARD** (`zt-card`) · compact density · dark = variable-remap only ·
**no gradients · no emoji · no new colour / radius / duration / family / size** without an R2 decision ·
the **round5 signature layer** (`zt-sig-*`).

## Reopened this session (the *decide* scope — the chart language only)

1. **The marker language**, generalized — the frames "ringed ink dot + tick" was built for one series; define
   how a marker reads across **distribution**, **multi-series**, and **composition** (it need not be one
   shape, but it must feel like one family).
2. **The series-encoding policy (the crux)** — how to distinguish 2–4 series **without** using the four
   status tokens and **without** a new hue. The within-palette resource is the **three metric families**
   (Energy amber · Vital teal · Focus periwinkle). Make "which series?" and "what status?" two
   unmistakably-separate axes.
3. **One tooltip** across all viz types (evolve the frame-card tooltip), **one axis/tick system** (mono
   labels; units once), **the empty/loading** states (build on the round5 `SigEmpty`/`SigLoading`).
4. **The engine** — express all of the above in **visx**, and **re-express the trend frames** on visx so the
   old chart and the new viz are one language.

## Deliverable spec (one artifact, on visx, both themes)

The R2 chart language, proven on **the trend frames re-expressed + three new viz**:
- **Distribution / "you are here"** (`@visx/stats` or a `@visx/shape` density) — where a marker sits within
  its reference/optimal (and, if available, a population) range; the "you are here" marker may carry the
  **status** colour (status on a dot is allowed); the distribution shape itself is neutral/ink. Surface:
  metric-detail.
- **Multi-series autonomic** (HRV · RHR · recovery · sleep over time) — the series-encoding policy in
  action; overlaid and/or small-multiples. Surface: the autonomic category.
- **Composition-over-time** (DEXA: lean · fat · bone) — `BarStack`/`AreaStack`; composition the single line
  can't show. Surface: body-composition.
- **The trend "frames"** — re-expressed in visx, visibly the same language as the three above.

## Decisions this session must close

1. The generalized **marker language** (one family across the four viz).
2. The **series-encoding policy** (the crux) — exact mapping of the three metric families to series, and how
   it stays distinct from the four status tokens.
3. The **one tooltip** + **one axis system** for all viz types.
4. The **empty/loading** treatment (consuming the round5 signature).
5. The **visx package set** + the **frames re-expression** approach (so R2.1 can migrate the rest).
6. The **MIGRATION rows** for anything renamed/re-roled (incl. Recharts→visx and any new `zt-viz-*` tokens).

## Propagation

`physics` (screen-only). New chart work gets the **`zt-viz-*`** namespace — never reuse a claimed word.
Prefer zero new tokens; any structurally-unavoidable one extends an existing family, is logged in
`CHANGES.md`, and gets a `MIGRATION.md` row.

## Process rules + Exit

One artifact; real data only (real markers, real WHOOP/DEXA series); calm/precise voice; sentence case
except mono micro-labels. **Touch the truth in place**, additively. Honor `../round1/ROUNDTRIP.md` §5 for
everything NOT reopened. **Exit:** the four viz render in the R2 language on the token layer, both themes,
JS-off, reduced-motion → instant; series-vs-status is unmistakable; the frames re-expression matches the
new viz; close in writing (append the S2.0 block; `npm run design:round`); the return is gated by
`RETURN-GATE.md`; `MIGRATION.md` carries every rename/re-role; log gaps in `FEEDBACK-LINE-viz.md`.

---

### also report for the ledger (the 6 outputs)

**(a)** selected direction · **(b)** rejected + why · **(c)** token delta (names + values; + MIGRATION rows)
· **(d)** AA-contrast notes (every chart pairing incl. series hues, both themes) · **(e)** reduced-motion /
JS-off (SSR-safe) · **(f)** next-session constraints (what R2.1 migration inherits).
