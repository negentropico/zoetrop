# CHARTER — Zoetrop ZOETROP-R1 (design language → IA spine → calm-instrument screen system)

> The parent contract for zoetrop's foundation line. Authored at S0; every session references it and
> nothing reopens what it locks. Run via `zoetrop-design-line`. Ledger: `DECISIONS.md` · manifest:
> `round-manifest.json`.
>
> **STATUS: FROZEN / ARCHIVED.** This charter is a **backfill** — it reconstructs the three design
> rounds that ran on zoetrop *before* this harness existed (the origin the design-roundtrip CORE was
> ported from). The foundation it describes is **shipped and live** (zoetrop.netlify.app). It is
> recorded here as history so the harness ledger has a spine; **further work runs as refinement LINEs**
> off this foundation (see `ROUNDTRIP.md`; the first is `../round4/PROMPT-LINE-reports.md`).

## S0 decisions (do not re-resolve)

- **Archetype:** B · existing-app round (a charter scoped on a real product, inside its own evolving
  token system — not a from-scratch design language). Here, **adopt-existing → refinement-LINE**: the
  foundation is already closed.
- **Medium:** `screen` (single — no print sibling, so no `PRINT-VS-SCREEN.md`).
- **North star:** *Every screen reads as one calm instrument — neutral structure, ink data, status
  carried only by the four canonical status colours, at a compact data-dense rhythm.*

## Stages (the session map — reconstructed from the prior rounds)

| Session | Title | Closed (decisions) | From |
|---|---|---|---|
| S1.0 | Foundation — brand language, token system, first screens | the visual language · the full token system · 11 core components · first screens | prior round1 (Zoetrop Redesign) |
| S1.1 | IA spine — consolidated left sidebar | the global nav/chrome interaction model (BAKED) | prior round2 (Left Nav Prototype) |
| S1.2 | Calm-instrument screen language | chart "frames" · canonical status tokens · compact density · populated states · dark + mobile sweeps (FINAL) | prior rounds 3+4+5 |

## Locked decisions (the LOCK — locked at S1.0; reopening is an explicit, written event)

- **Brand language** — three metric hue families (Energy amber `--energy` · Vital teal `--vital` · Focus
  periwinkle `--focus`, the default action colour) over warm Paper/Mist/Ink neutrals (never blue-grey);
  Space Grotesk display / Hanken Grotesk body / Space Mono data; large-radius "frame" cards, pill
  controls, soft warm ink-tinted shadows; spiral + phyllotaxis motifs. **No gradients. No emoji.**
- **Token system** — `remix-app/app/app.css` is the consumable token layer (DS source at
  `design-bridge/design-system/`); dark via `html[data-theme="dark"]` variable-remap (no per-component dark
  selectors); Tailwind v4 `@theme inline` bridge.
- **Left-nav interaction model** (S1.1) — consolidated left sidebar (264/64 rail, single-open accordion,
  collapsed-rail flyout, mobile drawer + sticky topbar, unified PageHeader). **BAKED.**
- **Status language** (S1.2) — status carried only by `--optimal / --borderline / --deficient / --excess`,
  on bands/dots/badges (never the trend line); chart "frames" idiom; one app-wide frame-card tooltip;
  units once per surface; ring sweep mount-only; compact density is the product default.

## Process rules (in force for any line off this foundation)

- One artifact per session; variations as labelled frames, never forked files.
- Real content only; calm, precise, encouraging voice; sentence case except mono micro-labels.
- Decisions close in writing — recorded in the session header *and* `DECISIONS.md`.
- **Touch the truth in place**; new components get new namespaced classes (`zt-*` / `zn-*`) — never reuse
  a claimed word. **No new colour / radius / duration / family / size** without a charter-level decision.
- **honesty render** is the exit test of every session (real components on the token layer, both themes,
  JS-off).

## Declared freeze criteria  (→ `round-manifest.freezeCriteria` — all MET; the foundation shipped)

| id | kind | met | note |
|---|---|---|---|
| tokenized | freeze-blocking | ✓ | every value a token in `app.css`; rounds added only new tokens in existing families |
| both-themes | freeze-blocking | ✓ | light `:root` + `html[data-theme="dark"]` parity via variable-remap (round3 sweep: it held) |
| contrast-floor | freeze-blocking | ✓ | AA verified; dark sweep fixed `--vital-500`/`--energy-500` as text on dark cards |
| canonical-status-tokens | freeze-blocking | ✓ | status only via the four tokens, consumed by every component (one-edit remap) |
| left-nav-baked | freeze-blocking | ✓ | the consolidated left-sidebar model shipped and is BAKED (round2) |
| reduced-motion-js-off-ok | freeze-blocking | ✓ | content renders JS-off; ring sweep mount-only; reduced-motion → instant |
| owner-accept | human-required | ✓ | owner baked all round-3 chart/status/density decisions live (2026-06-12) |

## Exit (already cleared)

All criteria met; the foundation is tokenized, documented (`design-bridge/design-system/`), shipped, and live.
The charter is **archived**. Further work runs as **refinement LINEs** off this foundation per
`ROUNDTRIP.md`. First line: `../round4/PROMPT-LINE-reports.md` (apply the calm-instrument language to the
Reports surface — the one major surface still without a design treatment).
