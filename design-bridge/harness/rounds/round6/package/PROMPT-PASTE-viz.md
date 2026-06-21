# Zoetrop · ZOETROP-R2 — the data-visualization language, on visx

> **Paste this whole message into the claude.ai/design ZTP1 prototype project** (where round3–5 ran). This
> opens **charter R2**: a deliberate reopening of Zoetrop's **chart language** — the one subsystem the app
> outgrew. Everything else in the system stays **frozen**. The attached `current-state/app.css` is the
> exact token layer — the source of truth for every value.

## What Zoetrop is

A calm, precise health instrument: biometrics, blood work, genetics, and a supplement protocol for one
person, with confidence-graded reports. It already has a strong visual language and a single-series trend
chart. Your job is to give it a **data-visualization language** for the data shapes it actually has.

## The ONE goal

Design **one calm, visx-built viz language** that covers four things as a single family, both light/dark:
1. the existing **trend "frames"** (re-expressed on visx),
2. a **distribution / "you are here"** (where a marker sits in its range),
3. **multi-series** over time (autonomic: HRV / RHR / recovery / sleep),
4. **composition-over-time** (DEXA: lean / fat / bone).

One tooltip. One axis system. One honest colour policy. A reader must instantly separate **"which series
is this?"** from **"what is this marker's status?"**.

## The engine — visx 4 (not Recharts)

Build on **visx** (`@visx/*`, Airbnb's low-level React + D3 primitives — https://visx.airbnb.tech/).
Recharts is being retired. Likely packages: `@visx/scale`, `@visx/shape` (LinePath, Bar, `BarStack`,
`AreaStack`, custom frame marks), `@visx/axis`, `@visx/grid`, `@visx/group`, `@visx/curve`, `@visx/glyph`,
`@visx/text`, `@visx/tooltip`, `@visx/responsive` (ParentSize), `@visx/stats` (distributions),
`@visx/threshold`, `@visx/voronoi` (multi-series hit-testing), `@visx/legend`. (`@visx/heatmap` comes in a
later round.) visx is low-level by design — that's the point: it lets the bespoke marker language be exact.

## The ONE hard problem — series-encoding vs status (keep them unmistakably separate)

- **Status** is reserved: the four canonical tokens `--optimal` / `--borderline` / `--deficient` /
  `--excess` answer *"how is this marker?"* — and ONLY that. Never repurpose them to tell series apart.
- **Series** (which line/band is HRV vs RHR; which layer is lean vs fat) must be distinguished **without a
  new hue and without the status colours.** The within-palette resource is the **three metric families** —
  **Energy** (amber `--energy-*`), **Vital** (teal `--vital-*`), **Focus** (periwinkle `--focus-*`). Use
  these as the **series palette**. For a 4th series, use **Ink** (the neutral data colour) or a tint step —
  decide and state the rule. The reader should never confuse a series colour with a status colour.

## The frozen language you are applying (do NOT change any of this)

**Posture:** every screen reads as one calm instrument — neutral structure, ink data, **compact** density.
No gradients. No emoji. Sentence case except mono micro-labels.

**Colour:** brand families Energy (amber) · Vital (teal) · Focus (periwinkle). Warm Paper / Mist / Ink
neutrals (never blue-grey); warm-dark in dark mode via the `html[data-theme="dark"]` variable remap — **no
per-component dark styling.** Status tokens `--optimal/--borderline/--deficient/--excess` (each with a soft
`-bg`).

**Type:** Space Grotesk (display) · Hanken Grotesk (body) · **Space Mono** (axis labels, figures, IDs,
dates, UPPERCASE micro-labels). Tabular figures; units appear **once** (header readout + tooltip), never on
every tick.

**Shape & surface:** large-radius **frame cards** (`zt-card`) — charts live inside them. The **signature
layer** from the last round is live: a **frame-dot** glyph (ringed ink dot) and a mount **"settle"** on
`--ease-frame`. **Consume them** — lead chart eyebrows with the frame-dot; let charts settle on mount.

## What you MAY reopen (this is the point of R2 — the chart language only)

The **frames marker idiom** (generalize it across the four viz), the **status-encoding rule in charts**
(restate it for multi-series/distribution/composition — see the crux), the **one tooltip**, the **axis/tick
system**, the **projection treatment**, the **chart empty/loading**. Keep the marker feeling like one
family even as it adapts per chart type.

## Must hold

- **Both themes** via the existing dark variable remap — no `dark:` forks, no per-component dark styling.
- **Real data only** — real markers + ranges; real WHOOP HRV/RHR/recovery/sleep; real DEXA lean/fat/bone.
  No lorem.
- **JS-off / SSR-safe + reduced-motion → instant** — charts must render their resting state server-side
  (visx is SVG, so this is natural); motion (the settle) only under the signature gate.
- **No new colour / radius / duration / font / size** without flagging it; new chart classes are namespaced
  **`zt-viz-*`**; prefer **zero** new tokens (reuse the metric families + neutrals + status tokens).
- **One artifact**, variations as labelled frames.

## Decisions to close

1. The generalized **marker language** (one family across frames · distribution · multi-series · composition).
2. The **series-encoding policy** (the crux): exact mapping of Energy/Vital/Focus (+ Ink for a 4th) to
   series, and how it stays unmistakable from the four status tokens.
3. **One tooltip** + **one axis/tick system** across all four viz.
4. The **distribution / "you are here"** treatment (status on the marker only; shape neutral/ink).
5. The **empty/loading** states (build on the signature `SigEmpty`/`SigLoading`).

## Attach / source of truth

- `current-state/app.css` — the token + class layer (every value lives here; your `new.css` returns only
  what is **not** already in it).
- The project already carries the Zoetrop design-system context (the frame cards, the four status tokens,
  the round5 signature). Build on it; do not duplicate or override it.

## Return (how to send it back — see `RETURN-SPEC.md` + the code-side `RETURN-GATE.md`)

Return **loose source** (visx components) + ONE **new-rules-only stylesheet** (`new.css`, `zt-viz-*` only,
no token redefinitions) + a **`CHANGES.md`**. In `CHANGES.md`, per viz: what it is and why; the
series-encoding mapping; every new token (name · value · family — ideally none); plus the decision ledger:

- **(a) Selected direction** · **(b) Rejected + why** · **(c) Token delta** (+ MIGRATION rows for the
  Recharts→visx swap and any rename) · **(d) AA-contrast notes** (every pairing incl. the series hues, both
  themes) · **(e) Reduced-motion / JS-off (SSR-safe)** · **(f) Next-session constraints** (what the R2.1
  engine migration inherits).
