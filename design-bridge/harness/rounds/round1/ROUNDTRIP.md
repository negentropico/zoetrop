# ROUNDTRIP — how Claude Design and Claude Code co-develop Zoetrop's system

> **Purpose.** Zoetrop's design system is one **foundation** (shipped, live). This is the standing
> contract for how **Claude Design** (authoring) and **Claude Code** (the codebase) extend and refine it
> in **roundtrip lines** without it drifting into two incompatible systems. Read it before opening any
> line on either side. Run via `zoetrop-design-line` (the lifecycle) + `zoetrop-design-roundtrip` (the
> per-round seed→return→integrate→gate→capture).

## 1 · The foundation (the single source of truth)

A change is *real* only when it lands in these files — the renders follow the truth, never the reverse.

| Truth | File(s) | Authority |
|---|---|---|
| Token truth (consumable) | `remix-app/app/app.css` | the values, both themes (`:root` + `html[data-theme="dark"]`) |
| Token truth (DS source) | `docs/design-system/tokens/*.css` + `_ds_manifest.json` | the catalogued DS vocabulary |
| DS-as-skill | `docs/design-system/` (SKILL.md · guidelines · components · assets) | brand + component reference (adopted, not duplicated) |
| Component truth | `remix-app/app/components/**` + the `zt-*`/`zn-*` class layers in `app.css` | role · states · rules |
| Honesty test | the running app (`npm run dev`) + `zoetrop-design-roundtrip` capture | renders prove the tokens |
| Rules | `CLAUDE.md` · `docs/design-system/readme.md` | the inviolable constraints |

## 2 · The two environments

| | **Claude Design** | **Claude Code** |
|---|---|---|
| Owns | the design source of truth — tokens, specs, reference renders | the product — the real remix-app, the running site |
| Produces | updated truth + reference HTML/CSS + a return bundle (loose source + `new.css` + `CHANGES.md`) | implemented components, the theme pipeline, **feedback deltas** |
| Must not | invent values that bypass the truth files | hard-code a value that exists as a token; "modernize" a frozen rule |

## 3 · The roundtrip loop

```
Design: refine truth → reference render → RETURN a bundle (loose source + new-rules CSS + CHANGES.md)
      → Code: token-sync new tokens into app.css · rebuild to the component layer · ship · record DELTAS
      → Design: fold deltas → re-render → re-return
```

Two artifacts cross the boundary: a **return bundle** (Design→Code; loose source + `new.css` with only
rules NOT already in the `current-state/` snapshot + `CHANGES.md`, per `package/RETURN-SPEC.md`) and
**`FEEDBACK-LINE-<name>.md`** (Code→Design; what couldn't be honored, what surface/state was needed, any
token added). No silent local forks on the code side. **Inbound is currently manual** — the
`react-tailwind` CORE adapter isn't built yet, so `zoetrop-design-roundtrip`'s decode→adapt→gate→capture
runs by hand against the existing harness scripts (`docs/design-system/_rounds/harness/unbundle.mjs` +
`css-delta.mjs` are the pre-harness origin of CORE's decode + css-delta gate).

## 4 · Lines of development

A **line** is a scoped branch off the foundation (`lineType: refinement`). It obeys one shape: name &
declare scope → branch the *prompt* (`PROMPT-LINE-<name>.md`), not the foundation → touch the truth in
place (additive; new namespaced `zt-*`/`zn-*` classes) → screen-only (`physics`) → **prove it** with the
honesty render (both themes, JS-off) → **close it in writing** (append a session block; `npm run
design:round` regenerates the manifest + `DECISIONS.md`). Parallel lines are fine on disjoint truth; two
lines editing one token serialize.

## 5 · Guardrails every line inherits (the closed rules — do not reopen without a charter decision)

- **Palette / action colour** — Focus periwinkle (`--accent` = `--focus-300`) is the default action
  colour; the three metric families are the only brand hues. **No gradients. No new hue.**
- **Status discipline** — status only via `--optimal / --borderline / --deficient / --excess`, on
  bands/dots/badges, never the trend line. Charts draw data in `--ink`.
- **Fact register** — Space Mono for figures / IDs / dates / micro-labels; tabular figures; lead with the
  figure; units once per surface.
- **Chrome** — the consolidated left-nav interaction model (S1.1) is BAKED.
- **No new colour / radius / duration / family / size** without a charter decision; new tokens extend the
  existing families and are logged in `CHANGES.md`.
- **Theming** — dark is a `html[data-theme="dark"]` variable-remap only; never a per-component dark selector.

## 6 · Playbook — Claude Design (start of a line)

1. Read the foundation (`CLAUDE.md` → `docs/design-system/readme.md` → the `current-state/app.css`
   snapshot in the line's `package/`). Read any open `FEEDBACK-LINE-*`.
2. Write `PROMPT-LINE-<name>.md`: scope, inputs, record-vs-decide, propagation (screen-only), exit.
3. Change the **truth** additively (a `new.css` of rules NOT already in the snapshot); keep `zt-*`/`zn-*`
   namespaces clean.
4. Re-render the honesty test (both themes, JS-off); fix until honest.
5. Return the bundle per `package/RETURN-SPEC.md`; close the line in writing.

## 7 · Playbook — Claude Code (implementing a line)

1. Decode the return (loose source; `unbundle.mjs` if it arrives as a bundler HTML). Read its `CHANGES.md`.
2. `css-delta.mjs` (or `design:tokens` once the adapter lands) the `new.css` against `current-state/` —
   confirm only-new tokens, no redefinitions; fold new tokens into `app.css` (`:root` + dark block).
3. Rebuild each component **to its spec** in React (recreate, don't paste prototype CSS); honor §5.
4. Verify in both themes (`zoetrop-design-roundtrip` capture: media light/dark, reduced-motion, the
   3-viewport device matrix) + the fact-register discipline + frozen rules.
5. Record every gap/constraint/added token in `FEEDBACK-LINE-<name>.md`. Never fork a token silently.

## 8 · When the two disagree

The **rule holds** until Design reconciles it. Code logs the conflict with the concrete constraint;
Design either changes the truth (and propagates) or keeps the rule and records why. The system never
carries an undocumented divergence.
