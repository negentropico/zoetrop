# round5 Brief — LINE-signature (make the visual language *more unique* — within the LOCK)

> **Round goal:** across three layout archetypes, Zoetrop reads as **unmistakably itself** — its locked
> spiral/phyllotaxis brand DNA and instrument craft made *visible and consistent* — **without changing a
> single locked token.** "Done" = a calm health instrument you could pick out of a line-up of well-made
> dashboards, where every value still resolves to the frozen `app.css` token layer and the honesty render
> (both themes, JS-off, reduced-motion → instant) passes.

This is a **refinement LINE** off the FROZEN ZOETROP-R1 foundation (`lineType: refinement`,
`propagation: physics`). Nothing about the foundation reopens — see `../CHARTER.md` / `../ROUNDTRIP.md`
and the full line prompt `../PROMPT-LINE-signature.md`. **Scope (C):** push the expressive layer within
the LOCK now; stage a deliberate ZOETROP-R2 reopening only if the render still reads generic.

## The design problem (why this line exists)

The foundation is correct and calm — but **interchangeable**. And the twist: **the expressive vocabulary
already exists in the design system; the shipped app just never consumes it.** The DS owns a documented
spiral + phyllotaxis **motif system** (`guidelines/brand-patterns.html` + `assets/pattern-*.svg` +
`mark-{aperture,orbit,drum,pulsering,spiral}.svg`) *and* a paper-grain texture (`.zt-grain` in
`tokens/base.css`). But `current-state/app.css` + the components reference only the logo mark — no
patterns, no grain — and there is no recognizable **motion signature**. So the gap is **consumption, not
invention**: wire the already-locked motif + texture into the product, add the one missing piece (motion),
and the app becomes unmistakably itself with **zero** new design vocabulary and **zero** new locked tokens.

## What to evolve — the expressive layer ONLY (the five levers)

1. **Motif activation (consume the existing library)** — bring the DS spiral/phyllotaxis patterns + marks
   from guideline-only into the product as a quiet recurring structural motif; in `--ink`/neutrals, never a
   new hue, never decorative noise. Wire in the existing assets — don't redraw them.
2. **A motion signature (net-new)** — one restrained, recognizable Zoetrop gesture, applied consistently
   (the DS has none today); reduced-motion → instant; JS-off safe.
3. **Chart + empty-state personality** — deepen the *expressive finish* inside the frozen frames idiom;
   give the bare chart-empty state a spiral/aperture character from the motif library.
4. **Texture (consume + extend `.zt-grain`)** — wire the DS's existing paper-grain utility into the
   surfaces (refine if needed); both themes; no contrast cost. The 1px dotted-grain technique is texture,
   not a banned colour gradient.
5. **Iconography** — a signature stroke/treatment (the aperture/orbit marks are a cue) so the glyph set
   reads bespoke.

## Surfaces in scope (three layout archetypes — prove character before any app-wide sweep)

| Archetype | Surface | View file | What it is |
|---|---|---|---|
| Composite / overview | dashboard | `remix-app/app/routes/_app/dashboard.tsx` | the cessation-tracker + at-a-glance dashboard (mixed widgets) |
| Chart-heavy detail | metric-detail | `remix-app/app/routes/_app/metrics/detail.tsx` | a single marker over time — the frames chart at full size |
| Data-dense list / catalog | metrics | `remix-app/app/routes/_app/metrics/index.tsx` | the dense catalog of markers by category + status |

The character must hold across all three — it must not turn the dense list into noise, and must survive a
chart-heavy screen. If it only works on the showcase dashboard, it has not landed.

## Out of scope (frozen — do not touch)

The whole LOCK: the palette + three metric hues + four status colours; the type pairing (Space Grotesk /
Hanken Grotesk / Space Mono); the warm neutral ramp; the left-nav chrome (S1.1, BAKED); the frame-card
idiom; the **frames** chart idiom and the one app-wide frame-card tooltip; compact density; the dark
variable-remap mechanism. **No gradients. No emoji. No new colour / radius / duration / family / size**
without a charter decision (that would be ZOETROP-R2, not this line).

## Token discipline

Prefer **zero** new tokens — express everything through existing tokens + a new namespaced `zt-sig-*` (or
`zt-*`) class layer. Any structurally-unavoidable new token must extend an existing family and be logged
in `CHANGES.md` (name · value · family). Return per `RETURN-SPEC.md`.
