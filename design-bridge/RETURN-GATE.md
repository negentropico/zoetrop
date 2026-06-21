# RETURN-GATE — the standing check every design return must pass

> The line-agnostic gate Claude Code runs on **every** return before integrating it (round5/LINE-signature
> was hand-gated; this encodes that so it is by-design, not luck). Run it after decode, before any edit to
> app source. A single FAIL blocks integration until reconciled in writing. Pairs with the inbound flow in
> `harness/rounds/round1/ROUNDTRIP.md §7` and the line lifecycle in `OPEN-A-LINE.md`.
>
> Token truth = `remix-app/app/app.css`. The snapshot the return was authored against =
> the round's `package/current-state/app.css`. Canonical assets = `docs/design-system/assets/`.

## Transport (set the mental model first)

Inbound is the native **`DesignSync`** tool (`/design-login` grants the design OAuth scope — **not** an MCP
server; nothing in `claude mcp list`). The **round prototype/return** lives in a *regular* project
(`PROJECT_TYPE_PROJECT`, e.g. "ZTP1" `f200a4ef-34c4-4d73-9e03-c210e759225a`) — **not** in
`DesignSync list_projects` (which lists only writable design-system projects); reach it by id/URL via
`get_project` / `list_files` / `get_file`. The **design-system** project (`PROJECT_TYPE_DESIGN_SYSTEM`,
"Zoetrope Design System" `48aebcac-8daa-4a26-b920-7e9f98bafa40` ⇄ `docs/design-system/`) is the reusable
component library — a **post-integration promotion target** via `/design-sync`, not where rounds prototype.

## The 7-point gate

| # | Check | FAIL when |
|---|---|---|
| **a** | **Token existence** | any `var(--…)` in `new.css` does **not** resolve in the `current-state/app.css` snapshot. |
| **b** | **Zero new/redefined tokens** | a token is redefined, **or** a new token exists that does not extend an existing family + is not logged in `CHANGES.md` (name · value · family). Prefer zero new tokens. |
| **c** | **Namespacing** | a new class is not namespaced (`zt-sig-*` / `zt-<line>-*`), **or** a locked class is restyled without being logged as a feature-gated shim. |
| **d** | **No gradients** | texture/finish uses a **colour-gradient fill**. Noise/structure is allowed — `feTurbulence`, or the canonical dotted-radial `.zt-grain` technique (a 1px radial dot, *not* a colour gradient) — gradients used to fake colour are not. |
| **e** | **Motion is transform-only + gated** | motion hides via `opacity` (must be transform-only); or it is not gated under the signature root class **and** `@media (prefers-reduced-motion: no-preference)`; or JS-off / reduced-motion does not show the resting state. |
| **f** | **Motif consumes canonical assets** | a motif is reinvented instead of consuming `docs/design-system/assets/` — verify path/geometry **identity** (an inlined path must be byte-identical to the source SVG, or reference it). |
| **g** | **Decision ledger present** | the (a)–(f) verdict ledger is not recorded in `CHANGES.md`. |

A return that passes a–f but omits g still FAILs — the ledger is how the next round trusts this one.

## ASSET-INVENTORY convention (run before authoring the outbound prompt)

The DS already owns a rich expressive vocabulary. **Consume it; never assert it doesn't exist and redraw.**
Before writing a `PROMPT-LINE-*` / `BRIEF.md`, enumerate the existing assets + utilities and instruct the
design side to **reference or inline the canonical geometry**, not reinvent it:

- **Patterns / marks** — `docs/design-system/assets/pattern-*.svg` + `mark-*.svg` (spiral · phyllotaxis ·
  aperture · orbit · drum · pulsering). Inline the byte-identical path or reference the file.
- **Pattern system doc** — `docs/design-system/guidelines/brand-patterns.html`.
- **Texture** — the `.zt-grain` utility in `docs/design-system/tokens/base.css` (faint 1px dotted radial
  grain). Consume/extend it; don't author a new texture primitive unless `.zt-grain` genuinely can't serve.

The outbound prompt states which of these the round consumes, and gate-(f) verifies geometry identity on the
return. (round5 inlined the byte-identical `mark-spiral.svg` path — the expectation, not luck.)

## After the gate: build-free prototype → real stack

Returns arrive as `window`-global UMD JSX (React via CDN). **Never paste prototype JSX/CSS.** Integration
**rebuilds** as the repo's real stack — React Router 7 + TypeScript + Tailwind v4 — folding only the gated
`new.css` rules into `app.css`. The prototype is a spec to reimplement, not source to copy.
