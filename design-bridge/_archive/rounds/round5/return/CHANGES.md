# CHANGES — round 5 · LINE-signature

> Refinement line off the **frozen** ZOETROP-R1 foundation. Goal: make Zoetrop
> read as *unmistakably itself* by activating the locked **spiral + phyllotaxis**
> motif and **instrument craft** the product never used — **without changing a
> single locked token.** One artifact; the character is proven on three layout
> archetypes (dashboard · metric-detail · metrics catalog) in both themes.

## What ships

| Class | Files |
|---|---|
| **Deliverable stylesheet** (RETURN-SPEC §1, additions-only) | `new.css` — `zt-sig-*` rules only; **zero** token redefinitions |
| **Loose source** | `app/sig.jsx` (new, the signature layer) · edits to `app/screens.jsx`, `app/charts.jsx`, `app/main.jsx` |
| **Viewing artifacts only** | `index.html` · `app.css` (unmodified current-state snapshot) · the rest of `app/*` (unchanged round-3/4 prototype) |

`app.css` is the **frozen** `current-state/app.css` byte-for-byte. `new.css` is loaded
after it and contains only rules **not already present** there.

---

## The five levers — decisions closed

### 1. Motif rule — *where the spiral/phyllotaxis appears, and where it must not*
- **Appears (once per surface, ink/neutral only):** a hairline **spiral watermark**
  (`SigGhost`) anchored to the **dashboard cessation hero** (one corner, clipped);
  the **spiral** behind the chart **empty** caption; the **phyllotaxis seed-head**
  as the chart **loading** state. Phyllotaxis is also the *ordering principle* of the
  mount stagger (lever 2) — geometry as timing, not decoration.
- **Must NOT appear:** never on the **metrics dense catalog** rows (would become
  noise — verified: the list carries the icon-signature only, no watermark); never
  tinted with a hue; never tiled/repeated behind live data; at most one watermark per
  screen. Drawn in `--ink`/`--n-*` at 5–8% — a quiet signature, not ornament.

### 2. Signature motion — **"the settle"** (one named gesture)
- On mount, frames (cards, stat/highlight cells, list cards) **rise 7px → 0** on
  **`--ease-frame`** (now *the* signature curve), staggered in **golden-ratio (φ)
  order** via `--sig-i` (`goldenRanks()` in `sig.jsx`) — so a grid settles in
  phyllotaxis order, not strict top-to-bottom.
- **Transform-only (no opacity drop):** content is never hidden, so every static /
  JS-off / reduced-motion render shows it. The locked **ring sweep** (`--dur-ring`,
  once on mount) is untouched. The same `ztSigSettle` curve is the intended
  data-update "settle" (not demonstrated in a static prototype).
- **Reduced motion → instant** (global app.css reduce rule). **JS-off → static**
  (the gesture only runs under `.zt-sig-on`, added by JS on mount).

### 3. Chart + empty-state personality (inside the frozen frames idiom)
- **Empty** (`SigEmpty`): the locked `zt-chart-empty` dot-grain frame + a **spiral
  ghost** that unspools behind a calm mono caption.
- **Loading** (`SigLoading`): a **phyllotaxis seed-head** whose dots breathe in golden
  order (stepped on `--ease-frame`) — replaces the bare hairline pulse.
- Both wired through `charts.jsx` `ChartEmpty`/`ChartLoading` (graceful fallback to the
  round-3 bare states if `sig.jsx` is absent), so the frame-card tooltip, status-token
  rules and band idiom are **unchanged** — only the *finish* is deepened.

### 4. Texture — paper grain
- A desaturated **fractal-noise** tile (inline SVG `feTurbulence` + `feColorMatrix`),
  multiplied onto the **canvas only** (`.zn-app::before`, `z-index:-1`, behind all
  in-flow content). **No gradient.** Light **5% / multiply**, dark **7% / screen** —
  so it reads as ink grain on warm paper and as light grain on warm-dark. Because it
  sits **behind** content there is **zero contrast cost**. Pure CSS → JS-off safe.

### 5. Iconography — the **frame-dot** signature
- The chart idiom's *"ringed ink dot + frame tick"* becomes the app's wayfinding glyph:
  a **hairline frame** around category **icon-tiles** (`.zt-sig-icon`, echoing the
  frame-card radius) and a **ringed frame-dot** leading every mono **section eyebrow**
  (`FrameDot` / `.zt-sig-eyebrow`). Consistent **1.5px ink** stroke; UI icons unified to
  Lucide **stroke 1.75**. **No icon-set change, no new icon names.**

---

## Per-screen changes

**Dashboard (`/`)** — hero card gains the corner spiral watermark + the settle;
category cards (9) settle in φ-order with hairline icon-frames; highlight cards (4)
settle in sequence; section eyebrows carry the frame-dot.

**Metric detail (`/metrics/:category/:metricId`)** — the three frame cards settle in
sequence; the frames chart is unchanged in rule, but its **empty/loading** states now
carry the spiral / phyllotaxis personality. Survives the chart-heavy screen.

**Metrics catalog (`/metrics`)** — category cards settle in φ-order and carry the
icon-signature; **no watermark, no grain-on-rows** — the character holds without
turning the dense list into noise.

(The signature is authored app-wide via shared helpers — `Card`, `SectionLabel`,
`IconTile`, `charts.jsx` — so an app-wide sweep is a propagation, not a rewrite.)

---

## §shims — the only touches to locked classes (zero-risk, logged)
1. `.zt-sig-on .zn-app { position: relative }` — establishes the containing block for
   the `z-index:-1` grain layer. No layout effect.
2. `charts.jsx` `ChartEmpty`/`ChartLoading` delegate to the branded states **iff**
   `sig.jsx` is loaded; identical fallback otherwise. No idiom change.

Both are scoped under `.zt-sig-on` / feature-detected, so the frozen layer is intact
when the signature is absent.

---

## Decision ledger

**(a) Selected direction.** Activate the *already-locked* expressive layer:
spiral/phyllotaxis as a quiet **structural** motif (watermark + empty/loading + φ
stagger ordering), one motion gesture (**"the settle"** on `--ease-frame`), canvas
**paper grain**, branded **empty/loading**, and a **frame-dot** icon signature. Zero
new locked tokens; reopens nothing.

**(b) Rejected + why.**
- *Hue-tinted motif / metric-coloured spiral* — breaks the "status colour only on
  bands/dots/badges, structure is neutral" lock. Motif stays ink/neutral.
- *Grain over cards / over text, or a gradient sheen* — contrast cost + "no gradients"
  ban. Grain lives behind content on the canvas only.
- *Fade-in entrance (opacity 0→1)* — left content hidden in static / JS-off / reduced
  renders; replaced with a **transform-only** settle.
- *Repeating phyllotaxis wallpaper behind data* — became ornament/noise on the dense
  list; restricted to one watermark per surface and to empty/loading.
- *Bespoke icon set* — out of scope (icon-set swap = a charter decision); we treat the
  glyphs instead (consistent stroke + frame-dot).

**(c) Token delta.** **None.** Every value resolves to an existing token (`--ink`,
`--n-100/150/300/400`, `--border`, `--border-strong`, `--surface`, `--radius-md`,
`--ease-frame`, `--dur-fast/slow`). No new colour / radius / duration / family / size.

**(d) AA-contrast notes.** Text contrast is **unchanged** — the signature adds nothing
in front of text. Body `--text` (#272324) on `--surface` (#fff) ≈ **13.6:1**; dark
`--text` (#f2ece9) on dark `--surface` (#221d1b) ≈ **14.8:1** — both AAA. Grain is a
≤7% layer **behind** content (no text pairing). Spiral watermark 5–8% `--ink` and the
empty-state ghost (`--n-400`, 45%) are **decorative, non-informational**, never the
sole carrier of meaning. Mono eyebrows keep their existing `--text-muted` pairing; the
frame-dot is `--ink` (max contrast). No pairing regressed in either theme.

**(e) Reduced-motion / JS-off.** Reduced-motion → instant (global rule collapses all
durations; the settle is transform-only so the resting state is the visible one; the
spiral resolves fully drawn; seed dots rest at base opacity). JS-off → fully static and
visible: motion/grain/draw are all gated under `.zt-sig-on` (JS-added on mount); every
base state is the final visible state.

**(f) Next-line constraints — scope-(C) verdict.** **The character landed within the
LOCK.** Activating the dormant brand layer made the three archetypes read as a distinct
instrument with **zero** locked-token change — the most legitimate within-LOCK move.
**No ZOETROP-R2 reopening is warranted** by this line. Carry-forward for the app-wide
sweep: (i) propagate `zt-sig-frame` + φ-stagger to remaining list/grid screens via the
shared `Card`; (ii) wire the `ztSigSettle` curve as the live **data-update** "settle";
(iii) if a future honesty render still reads generic *after* full propagation, the
remaining distinctiveness would require a **locked** decision (sharper type pairing or
an evolved card/radius idiom) → stage that deliberately as **ZOETROP-R2** with
`MIGRATION.md`, not here.

---

### New `zt-sig-*` classes (all in `new.css`)
`zt-sig-on` · `zt-sig-grain-off` · `zt-sig-motif-off` · `zt-sig-motion-off` (root
toggles) · `zt-sig-frame` · `zt-sig-ghost` (+ `--draw`) · `zt-sig-empty` /
`-mark` / `-body` · `zt-sig-seed` · `zt-sig-icon` · `zt-sig-dot` · `zt-sig-eyebrow`.
Custom property used for the stagger: `--sig-i` (a unitless index, not a token).
**No new lucide icon names.**
