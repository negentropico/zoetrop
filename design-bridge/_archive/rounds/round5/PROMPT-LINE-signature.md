# PROMPT — LINE-signature (make the visual language *more unique* — within the LOCK)

> A **refinement line** off the **frozen** ZOETROP-R1 foundation, run per `../round1/ROUNDTRIP.md`.
> `lineType: refinement` · `propagation: physics` (screen-only). Run via `zoetrop-design-line` →
> `zoetrop-design-roundtrip`. Inbound transport for this line = **DesignSync** (the `48aebc…` "Zoetrope
> Design System" project ⇄ `docs/design-system/`); the `react-tailwind` CORE adapter stays deferred.
> Read order: this → `../round1/CHARTER.md` → `../round1/DECISIONS.md` (S1.0–S1.2 ☑) →
> `../round1/ROUNDTRIP.md` → `package/current-state/app.css`.

## Header — line context

- **Charter:** ZOETROP-R1 — **FROZEN / ARCHIVED**. **Predecessor `S1.2` closes** (calm-instrument screen
  language: frames charts · canonical status tokens · compact density · dark + mobile sweeps — FINAL).
  **Do not reopen** anything S1.0–S1.2 locked.
- **Line:** `LINE-signature` (round5). **Scope (C)** — *within the LOCK now; stage a deliberate
  ZOETROP-R2 reopening only if the honesty render still reads generic.*

## Kickoff (one artifact, one sentence)

Across three layout archetypes, make Zoetrop read as **unmistakably itself** — by *activating the
expressive brand layer the charter already locked but the product never used* — **without changing a
single locked token.**

## Context to load first (ordered)

1. `package/current-state/app.css` — the token + `zt-*`/`zn-*` class snapshot. **The source of truth for
   every value.** Your returned `new.css` must contain only rules **not already here**.
2. `../round1/CHARTER.md` (the LOCK) → `../round1/DECISIONS.md` (S1.0–S1.2 closed record) →
   `../round1/ROUNDTRIP.md` §5 (the guardrails every line inherits).
3. `docs/design-system/` (components, guidelines) — the adopted DS-as-skill; brand reference, not to be
   duplicated.

## Prior-session closed record (this is *record*, not up for re-decision)

- **S1.0 ☑** — the Zoetrop language: three metric hue families (Energy amber · Vital teal · Focus
  periwinkle = default action) over warm Paper/Mist/Ink neutrals; Space Grotesk / Hanken Grotesk / Space
  Mono; large-radius frame cards, pill controls, soft warm ink-tinted shadows; **spiral + phyllotaxis
  brand motifs**. No gradients. No emoji.
- **S1.1 ☑** — the consolidated left-sidebar interaction model. **BAKED.**
- **S1.2 ☑** — every screen reads as one calm instrument; the **"frames"** chart idiom; status only via
  the four canonical tokens (never the trend line); **compact density** is the default.

## Locked decisions (the LOCK — reopening any of these is an explicit ZOETROP-R2 event, NOT this line)

Palette / hues · the three metric families · the four status colours · type pairing (Space Grotesk /
Hanken Grotesk / Space Mono) · warm neutral ramp · left-nav chrome · the frame-card idiom · the frames
chart idiom · compact density · dark = `html[data-theme="dark"]` variable-remap only · **no gradients · no
emoji · no new colour / radius / duration / family / size without a charter decision.**

## The problem this line solves

The expressive layer **already exists in the design system — the shipped app just never consumes it.**
The DS owns a documented spiral + phyllotaxis **motif system** (`docs/design-system/guidelines/brand-patterns.html`
+ `assets/pattern-{spiral,spiral-dots,spiral-twin,phyllotaxis,phyllotaxis-dense,spiral-arms}.svg` and the
`mark-{aperture,spiral,orbit,drum,pulsering}.svg` marks) **and** a paper-grain texture utility (`.zt-grain`
in `docs/design-system/tokens/base.css` — a faint 1px dotted radial grain). But `remix-app/app/app.css` +
the components reference only the **logo mark** (`app.css:1094`); none of the patterns, none of the grain,
and there is no recognizable **motion signature** (motion is generic: eased transitions + a mount-only
ring sweep). So the foundation reads **interchangeable** — it could be many well-made dashboards. The gap
is **consumption, not invention.** "More unique" here = **wire the already-locked motif + texture
vocabulary into the product**, plus add the one genuinely-missing expressive piece (the motion signature).
This is the purest within-LOCK move: zero new design vocabulary, **zero** new locked tokens, nothing
reopened.

## Record vs decide

- **Record (do not re-pick — all frozen):** every token in the snapshot; the palette + hues; the type
  pairing; the four status tokens; the left-nav chrome; the frame-card idiom; the frames chart idiom;
  compact density; the dark variable-remap mechanism; no gradients / no emoji.
- **Decide (scoped this line — the expressive layer ONLY):**
  1. **Motif activation (consume the existing library)** — bring the DS's existing spiral / phyllotaxis
     **patterns** (`assets/pattern-*.svg`) and **marks** (`mark-aperture/orbit/drum/pulsering/spiral`) from
     guideline-only into the product as a quiet, recurring structural motif (e.g. phyllotaxis ordering of
     rings/dots; a spiral/aperture ghost in empty/loading states; a hairline structural watermark on a hero
     surface). Decide *where each belongs and where it must not*. Calm, never decorative noise; in
     `--ink` / neutrals — no new hue. (These assets already live in the repo + this design project — wire
     them in, don't redraw them.)
  2. **A motion signature (the one genuinely-new piece)** — one restrained, recognizable Zoetrop gesture
     applied consistently (e.g. a phyllotaxis-ordered mount stagger; `--ease-frame` as *the* signature
     curve; a `pulsering`-style settle on data update). The DS has no motion signature today — this is the
     net-new expressive decision. Reduced-motion → instant; everything renders JS-off.
  3. **Chart + empty-state personality** — within the frozen frames idiom, deepen the *expressive finish*:
     calm branded empty/loading states (today only a bare `zt-chart-empty` exists; give it a spiral/aperture
     character from the motif library), micro-personality that stays inside the frames rules.
  4. **Texture (consume + extend `.zt-grain`)** — the DS already defines a paper-grain utility (`.zt-grain`,
     a 1px dotted radial grain at ~3.5% ink) that `app.css` never adopts. Wire it into the product surfaces
     (and refine if needed) so surfaces feel like a crafted instrument, not flat utility CSS. Both themes,
     JS-off. The dotted-grain technique (a 1px radial dot, not a colour gradient fill) is texture, **not** a
     banned gradient — keep it that way; no colour gradients.
  5. **Iconography** — a signature icon treatment (consistent stroke; motif-informed where natural — the
     aperture/orbit marks are a cue) so the glyph set reads bespoke, not stock.

  Express all five through **existing tokens** + **new namespaced `zt-*` classes** (a `zt-sig-*` layer is
  fine). **Prefer ZERO new tokens.** Any structurally-unavoidable new token must extend an existing family
  and be logged in `CHANGES.md`.

## Proving ground — three layout archetypes (prove character before any app-wide sweep)

| Archetype | Surface | View file |
|---|---|---|
| Composite / overview | `dashboard` | `remix-app/app/routes/_app/dashboard.tsx` |
| Chart-heavy detail | `metric-detail` | `remix-app/app/routes/_app/metrics/detail.tsx` |
| Data-dense list / catalog | `metrics` | `remix-app/app/routes/_app/metrics/index.tsx` |

The character must hold across all three (it must not turn a dense list into noise, and must survive a
chart-heavy screen). If it only works on the showcase dashboard, it hasn't landed.

## Propagation

`physics` (screen-only) — this is texture / radius-free / duration / motif / component-finish work, landed
on the one `screen` medium. New work gets new `zt-sig-*` (or `zt-*`) classes; never reuse a claimed word.

## Decisions this line must close

1. **The motif rule** — exactly where spiral/phyllotaxis appears and where it must *not*, so it reads as a
   quiet signature, not ornament.
2. **The signature motion** — one named gesture + where it applies; reduced-motion + JS-off behaviour.
3. **The texture** — what it is, at what opacity, both themes, with no gradient and no contrast cost.
4. **Empty/loading personality** — the branded calm state for charts and dense lists.
5. **Iconography** — the signature stroke/treatment and where it changes anything today.

## Exit (and the scope-(C) escape hatch)

- The **three surfaces** render on the token layer in **both themes**, **JS-off**, reading as a *more
  distinctive, unmistakably-Zoetrop* instrument — with **every locked token intact** and the honesty
  render passing (real components, both themes, reduced-motion → instant).
- Close in writing: append the session block + `npm run design:round` (regenerates the manifest +
  `DECISIONS.md`); if the codebase needs it, fold `FEEDBACK-LINE-signature.md`.
- **Scope-(C) trigger:** if, with the expressive layer fully pushed, the honesty render **still reads
  generic** — i.e. the distinctiveness genuinely requires a *locked* decision (sharper type pairing,
  evolved card/radius idiom, wider neutral range) — **do NOT reopen it here.** Record that finding as the
  next-line constraint and scope a deliberate **ZOETROP-R2** charter reopening (with `MIGRATION.md`) as a
  separate second pass.

## Process rules

One artifact; variations as labelled frames, never forked files. Real content only (real metrics, real
markers, real statuses — no lorem). Calm, precise, encouraging voice; sentence case except mono
micro-labels. **Touch the truth in place**, additively. **No new colour / radius / duration / family /
size** without a charter decision — prefer zero new tokens; any unavoidable one extends an existing family
and is logged. Dark is variable-remap only — no per-component dark selectors, no `dark:` forks.

---

### also report for the ledger (the 6 outputs)

**(a)** selected direction · **(b)** rejected + why · **(c)** token delta (names + values; ideally *none*)
· **(d)** AA-contrast notes (pairings + ratios, both themes) · **(e)** reduced-motion / JS-off · **(f)**
next-line constraints (incl. the scope-(C) verdict: did character land within the LOCK, or is R2 warranted?).
