# FEEDBACK — LINE-signature (Code → Design)

> The Code→Design half of `round1/ROUNDTRIP.md` for round5. What the codebase did when
> integrating the return: what couldn't be honored as-specified, what the real app needed,
> any token added. Design reconciles each into the truth or rejects it with a reason.
> **Integrated at quick task `260620-rd4`** (3 atomic commits; build green; gate PASS 7/7).

## Summary

The return integrated **cleanly and within the LOCK** — **zero tokens added**, no rule
broken, no silent fork. Below are the few reconciliations the code side made and the notes
Design should fold back.

## Reconciliations (resolved on the code side)

1. **Prototype was build-free UMD JSX → rebuilt as the real stack.** `app/sig.jsx` (React via
   CDN, `window`-global exports) was **re-authored** as `remix-app/app/components/ui/Signature.tsx`
   (typed React Router 7 + TS module). No prototype JSX/CSS was pasted. Per ROUNDTRIP §7 — this is
   expected, not a defect; flagging so Design knows the shipped component is a faithful re-author,
   not the prototype file.
2. **Spiral geometry — kept inline.** `ZT_SPIRAL_D` is **byte-identical** to
   `docs/design-system/assets/mark-spiral.svg`, so the watermark uses the inline path (avoids an
   asset fetch for a hairline mark) with a comment citing the canonical asset. The other DS motif
   assets (`pattern-*.svg`, `mark-aperture/orbit/drum/pulsering`) were **not** consumed this round —
   only the spiral. **Carry-forward for Design:** if later surfaces want the phyllotaxis/aperture
   patterns, reference the canonical SVGs (don't redraw).
3. **Texture — adopted the new `feTurbulence` canvas grain.** The return drew its own noise grain
   on `.zn-app::before` rather than consuming the DS's existing `.zt-grain` dotted-radial utility
   (`docs/design-system/tokens/base.css`). Adopted the feTurbulence grain as shipped; left `.zt-grain`
   untouched. **Note for Design:** there are now two grain mechanisms in the system — consider
   reconciling to one (the canonical `.zt-grain` dot vs the feTurbulence noise) in a future pass.
4. **Grain stacking verified.** `.zt-sig-on .zn-app{position:relative}` + `::before{z-index:-1}`
   renders behind content; the shell's fixed elements (topbar/sidebar/flyout/mobile-backdrop/account
   menu) are viewport-fixed and structurally independent of the `.zn-app` stacking context — no
   disturbance.

## What the real app needed (not in the prototype)
- Nothing token-level. The signature applied to the three archetypes via the shared `Card` / section
  eyebrow / icon-tile patterns, so the app-wide sweep is a propagation (carry-forward), not a rewrite.

## Tokens added
- **None.** (Within-LOCK guarantee held; verified by diff — no `--token:` definitions added/changed.)

## Open carry-forward (for the next line, not this one)
- Propagate `zt-sig-frame` + the φ-stagger to the remaining ~13 surfaces via the shared `Card`.
- Wire the `ztSigSettle` curve as the live **data-update** "settle" (the prototype only showed mount).
- Reconcile the two grain mechanisms (`.zt-grain` vs feTurbulence) into one canonical technique.
