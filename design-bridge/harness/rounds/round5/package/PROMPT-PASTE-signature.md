# Zoetrop · LINE-signature — make the design language *more unique*, within the LOCK

> **Paste this whole message into the claude.ai/design "Zoetrope Design System" project** (the one this
> repo already syncs — it has the brand context loaded). This is a *refinement line* on Zoetrop's
> **frozen** foundation: you are **activating character the brand already locked**, not inventing a new
> language. Everything you need is inlined here; the attached `current-state/app.css` is the exact token +
> class layer — the source of truth for every value.

## What Zoetrop is

A calm, precise health instrument: it consolidates biometrics, blood work, genetics, and a supplement
protocol for one person, and produces confidence-graded protocol reports. It is shipped and live. The
foundation is calm and correct — and a little **interchangeable**. Your job is to make it
**unmistakably itself**.

## The ONE goal

**This design system already owns the expressive vocabulary — the app just never wired it in.** You have a
documented spiral + phyllotaxis **motif system** (see `guidelines/brand-patterns.html` and the
`assets/pattern-*.svg` + `mark-aperture/orbit/drum/pulsering/spiral.svg`) *and* a paper-grain texture
(`.zt-grain`). But the shipped app uses only the logo mark — no patterns, no grain — and has no motion
signature. Your job: **consume that locked vocabulary into three product screens** (plus add the one
missing piece, a motion signature) so the app becomes unmistakably itself — **without changing one locked
token.** Done = a health instrument you could pick out of a line-up of well-made dashboards. This is
*consumption, not invention* — wire in the existing assets; don't redraw them.

## Evolve the expressive layer ONLY — the five levers

1. **Motif activation (consume the existing library)** — bring the existing `pattern-*.svg` (golden
   spiral, spiral sequence, twin spiral, phyllotaxis, dense field, spiral arms) and the
   `mark-aperture/orbit/drum/pulsering` marks from guideline-only into the product as a quiet, recurring
   **structural** motif: phyllotaxis ordering of rings/dots; a spiral/aperture ghost in empty/loading
   states; a hairline structural watermark on a hero surface. Decide *where each belongs and where it must
   not.* In **ink / neutrals only — never a new hue**, never decorative noise.
2. **A motion signature (the one net-new piece)** — one restrained, recognizable Zoetrop gesture, applied
   consistently (e.g. a phyllotaxis-ordered mount stagger; the `--ease-frame` curve as *the* signature
   easing; a `pulsering`-style settle on data update). The system has no motion signature today.
   **Reduced-motion → instant. Everything renders with JS off.**
3. **Chart + empty-state personality** — *inside* the frozen "frames" chart idiom, deepen the expressive
   finish: give the bare chart empty/loading state a calm spiral/aperture character from the motif library;
   micro-personality that never breaks the frames rules.
4. **Texture (consume + extend `.zt-grain`)** — the system already defines a paper-grain utility
   (`.zt-grain`, a 1px dotted radial grain) that the app never adopts. Wire it into the surfaces (refine if
   needed) so they feel like a crafted instrument, not flat utility CSS. Both themes; no contrast cost. The
   1px dotted-grain dot is **texture, not a banned colour gradient** — keep it that way; no colour
   gradients.
5. **Iconography** — a signature stroke / treatment (the aperture/orbit marks are a cue) so the glyph set
   reads bespoke, not stock.

## The frozen language you are applying (do NOT change any of this)

**Posture:** every screen reads as one calm instrument — neutral structure, ink data, status carried only
by the four status colours, at a **compact, data-dense** rhythm. No gradients. No emoji. Sentence case
except mono micro-labels. Voice: calm, precise, encouraging; address the reader as "you".

**Colour:** brand families are **Energy** (amber), **Vital** (teal), **Focus** (periwinkle — the default
action colour). Warm **Paper / Mist / Ink** neutrals (never blue-grey); warm-dark in dark mode. Status
tokens only: `--optimal` · `--borderline` · `--deficient` · `--excess` (each with a soft `-bg`), on
bands / dots / badges — **never on the trend line.**

**Type:** Space Grotesk (display) · Hanken Grotesk (body) · **Space Mono** (data: figures, IDs, dates,
UPPERCASE micro-labels). Tabular figures; lead with the figure; units once per surface.

**Shape & surface:** large-radius **frame cards**, pill controls, soft warm ink-tinted shadows. Reuse the
existing class vocabulary — frame card (`zt-card`), stat-strip (`zt-stat-strip`/`zt-stat`), pill
(`zt-pill`). New signature work gets **new `zt-sig-*` classes** — never reuse a claimed word.

**Charts:** the **"frames"** idiom — ringed ink dot + hairline frame tick; thin connecting line; optimal
band as a quiet vital tint (50%) with a mono band tag; one app-wide frame-card tooltip; milestones not
dates. The idiom is **locked** — you may deepen its *finish*, not its rules.

**Motion:** brisk, eased, never bouncy; ring sweeps once on mount; **reduced-motion → instant** (global
rule). Existing curves: `--ease-out`, `--ease-in-out`, `--ease-frame`; durations `--dur-fast/base/slow`
and `--dur-ring` (1600ms).

## Prove it on three layout archetypes

1. **Dashboard** (`/`) — composite / overview (cessation tracker + at-a-glance widgets).
2. **Metric detail** (`/metrics/:category/:metricId`) — the chart-heavy screen; the frames chart at full
   size.
3. **Metrics overview** (`/metrics`) — the **data-dense** catalog of markers by category + status.

The character must hold across all three — it must **not** turn the dense list into noise, and must
survive the chart-heavy screen. If it only works on the showcase dashboard, it hasn't landed.

## Must hold

- **Both themes** via the existing `html[data-theme="dark"]` variable remap — **no per-component dark
  styling**, no `dark:` forks. Use the tokens; dark follows automatically.
- **Real content only** — real markers, statuses, dates. No lorem.
- **Token freeze** — reuse existing tokens; prefer **zero** new tokens. If something is structurally
  unavoidable, add a token **in an existing family** and log it. No new colour / radius / duration / font /
  size otherwise.
- **One artifact**, variations as labelled frames — never forked files.

## Decisions to close

1. The **motif rule** — exactly where spiral/phyllotaxis appears, and where it must *not*, so it reads as
   a quiet signature not ornament.
2. The **signature motion** — one named gesture + where it applies; reduced-motion + JS-off behaviour.
3. The **texture** — what it is, at what opacity, both themes, no gradient, no contrast cost.
4. **Empty / loading personality** — the branded calm state for charts and dense lists.
5. **Iconography** — the signature treatment and what (if anything) it changes today.

## Attach / source of truth

- `current-state/app.css` — the **token + class layer** (every value lives here; your `new.css` returns
  only what is **not** already in it).
- **The motif vocabulary to consume — already in this project:** `guidelines/brand-patterns.html` (the
  spiral + phyllotaxis motif system), `assets/pattern-*.svg`, `assets/mark-{aperture,orbit,drum,pulsering,
  spiral}.svg`, and the `.zt-grain` paper-texture utility in `tokens/base.css`. Build on these; do not
  duplicate, override, or redraw them.

## Return (how to send it back — see `RETURN-SPEC.md`)

Return **loose source files** + ONE **new-rules-only stylesheet** (`new.css`) — only rules / custom
properties **not already in `current-state/app.css`** (no redefinitions; new classes namespaced
`zt-sig-*`) — plus a **`CHANGES.md`**. The repo pulls your return back through **DesignSync** (this
project ⇄ the repo's `docs/design-system/`), so keep components as discrete, well-named files. In
`CHANGES.md`, per screen: what changed and why; every new token (name · value · family — ideally none);
any new icon names. Then report, for the decision ledger:

- **(a) Selected direction** · **(b) Rejected + why** · **(c) Token delta** (names + values; ideally none)
  · **(d) AA-contrast notes** (pairings + ratios, both themes) · **(e) Reduced-motion / JS-off** ·
  **(f) Next-line constraints** — including the **scope-(C) verdict:** did the character land *within the
  LOCK*, or does genuine distinctiveness require a locked decision (→ scope **ZOETROP-R2**, don't do it
  here)?
