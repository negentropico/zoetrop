# NEXT-LINE-PLAN — refinement LINE-signature (more-unique visual language)

> **Saved 2026-06-20, updated 2026-06-20 (session: `/design-login`).** Goal: roundtrip Zoetrop's design
> language **again** to refine it further — *more unique* — off the **frozen** `ZOETROP-R1` foundation.
> Run via `zoetrop-design-line` (lifecycle) + `zoetrop-design-roundtrip` (per-round).
> **STATUS: round5/LINE-signature is SEEDED and ready to transmit.** Both blocking decisions are resolved
> (scope + inbound). The line is **not yet returned/integrated.**
> **Resume pointer:** read this file → §"On reopen, do this first".

---

## State of play (verified 2026-06-20)

- **Design access — LIVE via the native `DesignSync` tool (NOT an MCP server).** The plan originally
  assumed `/design-login` registers a `claude.ai design` connector visible in `claude mcp list`. **It does
  not** — and never will. `/design-login` grants the **design OAuth scope**, and the interface is the
  built-in **`DesignSync`** tool (+ the `/design-sync` skill), which reads/writes the user's
  claude.ai/design projects. Verified: `DesignSync method=list_projects` returns the projects, including
  **`48aebcac-8daa-4a26-b920-7e9f98bafa40` → "Zoetrope Design System"** (writable, owned). So Phase 0 is
  **done**; ignore the old "MCP not connected" framing.
- **The two source projects** (re-import = re-establish design context, not new work):
  - `48aebcac-8daa-4a26-b920-7e9f98bafa40` → **Zoetrope Design System** (= `docs/design-system/`,
    namespace `ZoetropDesignSystem_48aebc`). **Reachable via `DesignSync`.**
  - `f200a4ef-34c4-4d73-9e03-c210e759225a?file=round3-return/index.html` → **Zoetrop1** prototype (round3
    return). *Not* in `list_projects` (that lists only writable design-system projects; a prototype is a
    regular project) — expected. Both preserved in `PROVENANCE.md`.
- **Harness: outbound DONE for round5; inbound = DesignSync (by-hand integration).** `round5/` is seeded
  (`design:seed`), the manifest is registered (`design:round`), and `design:typecheck` is clean. The
  `react-tailwind` CORE adapter is **intentionally still deferred** — DesignSync is the transport, and the
  decode→rebuild→token-sync step runs by hand per `round1/ROUNDTRIP.md §7`.
- **Charter `ZOETROP-R1` is FROZEN** (S1.0–S1.2 ☑, locked at S1.0). This line presses on the LOCK's
  *expressive* edge but does not reopen it (scope C, below). The drafted `round4`/`LINE-reports` line is a
  *different* goal (apply the language to Reports) and stays parked.
- **KEY FINDING (2026-06-20, verified local + remote DS):** the expressive vocabulary **already exists in
  the design system** — `docs/design-system/guidelines/brand-patterns.html` (the spiral + phyllotaxis motif
  system), `assets/pattern-*.svg` + `mark-{aperture,orbit,drum,pulsering,spiral}.svg`, and a `.zt-grain`
  paper-texture utility in `tokens/base.css` — but `remix-app/app/app.css` + components **consume none of
  it** (only the logo mark). The round5 gap is **consumption, not invention**: Phase 5 wires these existing
  repo assets + `.zt-grain` into the product surfaces; the only net-new expressive piece is the **motion
  signature**. The round5 artifacts were corrected to reflect this.

## Decisions taken

| # | Decision | Choice |
|---|---|---|
| Surfaces | Proving ground this round | **3 archetypes** — `dashboard` (composite) + `metric-detail` (chart-heavy) + `metrics` (data-dense list/catalog). Prove character across the 3 layout archetypes before any app-wide sweep. |
| **Scope** | "more unique" vs the FROZEN foundation | **(C) Within-LOCK now; stage R2 if needed** *(resolved 2026-06-20)*. Push the *expressive layer only* — activate the locked-but-unused spiral/phyllotaxis motif, a motion signature, chart/empty-state finish, texture, iconography — changing **zero** locked tokens. `lineType: refinement`, `propagation: physics`, no `MIGRATION.md`. Reopen a *locked* decision (→ ZOETROP-R2) only if the honesty render still reads generic. |
| **Inbound** | how the return integrates | **DesignSync transport; CORE adapter deferred** *(resolved 2026-06-20)*. **Two projects, two roles:** the round *return/prototype* lives in the **`f200a4ef…` "ZTP1" prototype project** (`PROJECT_TYPE_PROJECT` — where round3/4 also ran; pull via `DesignSync get_file`); the **`48aebc…` "Zoetrope Design System"** project (`PROJECT_TYPE_DESIGN_SYSTEM`) ⇄ `docs/design-system/` is for syncing the reusable **component library** (a *post-integration* promotion via `/design-sync`). Rebuild React to spec + token-sync into `app.css` by hand (`ROUNDTRIP.md §7`). Build the `react-tailwind` adapter later only if the by-hand step hurts. |
| Sequencing | MCP + plan | Done — design access verified, both decisions resolved, round5 seeded. |

## The smoothest roundtrip — phased plan (status)

### Phase 0 · Connect & verify — ✅ DONE
- `/design-login` ran; **`DesignSync method=list_projects` confirms the design scope is live** and the
  `48aebc…` "Zoetrope Design System" project is reachable. (No `claude mcp list` entry — that's expected;
  DesignSync is a native tool, not an MCP server.)

### Phase 1 · Decide scope — ✅ DONE
- **(C)** chosen → `round5/LINE-signature`, `lineType: refinement`, `propagation: physics`, no
  `MIGRATION.md`. Name fixed: **LINE-signature**.

### Phase 2 · Inbound adapter — ⏸️ DEFERRED (superseded by DesignSync)
- The `react-tailwind` CORE adapter is **not** being built first. DesignSync provides the transport; the
  rest of inbound runs by hand (`ROUNDTRIP.md §7`). Revisit only if the by-hand integration proves painful.

### Phase 3 · Define & seed — ✅ DONE
- `round5/PROMPT-LINE-signature.md` authored (the 9-section line prompt, scope-C framed).
- `npm run design:seed -- --round=round5` → `round5/package/` with `current-state/app.css` snapshot.
- `round5/package/BRIEF.md` (round-specific) + `round5/package/PROMPT-PASTE-signature.md` (the
  paste-into-claude.ai/design message) authored.
- `round5/round-manifest.json` + `DECISIONS.md` registered via `design:round` (seeded, not returned).

### Phase 4 · Transmit & specify — ✅ DONE (return received + gated)
- Round ran in the **`f200a4ef…` "ZTP1"** prototype project; return at
  `round3-return/round5/return/` (`index.html` + `app/sig.jsx` + `new.css` + `CHANGES.md`, RETURN-SPEC
  shape). **Gate PASSED 2026-06-20:** zero new/redefined tokens (all `var()`s resolve in the frozen
  snapshot); all classes `zt-sig-*`; texture = `feTurbulence` noise (no gradient); motion transform-only,
  JS-off/reduced-motion safe; inline spiral = byte-identical to `mark-spiral.svg`. Design's scope-(C)
  self-verdict: character landed within the LOCK, **no R2 warranted** (binding verdict taken after our
  honesty render).

### Phase 5 · Retrieve & integrate — ⬜ NEXT (by hand; first phase that edits app source)
- Return already pulled via `DesignSync get_file` (from `f200a4ef…`). Per `ROUNDTRIP.md §7`: fold `new.css`
  `zt-sig-*` rules into `app.css`; **rebuild `sig.jsx` as real React Router 7 + TS components** (don't
  paste the prototype's `window`-global UMD JSX) + the `useSignature` root wiring + the `charts.jsx`
  empty/loading delegation; capture light+dark × mobile/tablet/desktop, reduced-motion on, on the 3
  surfaces. ⚠️ Edits app source → route appropriately (GSD `/gsd-quick` or explicit bypass).
- Integration reconciliations (from review): (i) decide inline spiral path vs reference `mark-spiral.svg`;
  (ii) new `feTurbulence` canvas grain vs the existing unused `.zt-grain` dotted utility — pick one;
  (iii) verify the `.zn-app{position:relative}` + `z-index:-1` grain shows behind content and doesn't
  disturb flyout/sticky/drawer stacking. Honesty render (both themes, JS-off).

### Phase 6 · Land & ledger — ⬜
- Persist renderings under `data/case-facts/renderings/`; author the S-block (the 6 ledger outputs +
  recordVsDecide + propagation); `npm run design:round` (regenerates manifest + `DECISIONS.md`); log gaps
  in `FEEDBACK-LINE-signature.md`.
- **Scope-(C) verdict:** if character landed within the LOCK → freeze stays, no migration, done. If the
  render still reads generic → record it and scope **ZOETROP-R2** (`MIGRATION.md` + re-run freeze
  criteria) as a separate second pass. Commit referencing the round id (stage explicitly — parallel
  sessions share this tree; never `git add -A`).

---

## On reopen, do this first
1. Design access is live (`DesignSync`); the `48aebc…` project is the target. No re-auth needed unless a
   `DesignSync` call reports the scope is missing — then re-run `/design-login`.
2. **Transmit (Phase 4):** open claude.ai/design → the Zoetrope Design System project → paste
   `round5/package/PROMPT-PASTE-signature.md`, attach `round5/package/current-state/app.css`. Iterate.
3. **Integrate (Phase 5):** pull the return via `DesignSync` (+ `/design-sync`), then rebuild to spec +
   token-sync by hand (`round1/ROUNDTRIP.md §7`). Close the line in the ledger (Phase 6).

## Carried context (read order)
`design-bridge/OPEN-A-LINE.md` → `harness/rounds/round1/CHARTER.md` → `round1/DECISIONS.md` (S1.0–S1.2 ☑)
→ `round1/ROUNDTRIP.md` → `harness/rounds/round5/PROMPT-LINE-signature.md` → this plan. Token truth:
`remix-app/app/app.css`. DS-as-skill: `docs/design-system/`.
