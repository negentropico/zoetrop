# round5 return — LINE-signature

> Refinement line off the **frozen** ZOETROP-R1 foundation. Makes Zoetrop read as
> *unmistakably itself* by activating the locked **spiral + phyllotaxis** motif and
> instrument craft — **without changing one locked token.** See
> [`CHANGES.md`](./CHANGES.md) for the full decision ledger (a–f) and per-screen log.

> **Provenance:** pulled via `DesignSync get_file` from the **ZTP1 prototype project**
> (`f200a4ef-34c4-4d73-9e03-c210e759225a`), path `round3-return/round5/return/`, and
> persisted here as the on-disk source of truth for Phase-5 integration. The prototype
> `index.html` + the unchanged round-3/4 `app/*.jsx` are viewing-only and were not
> pulled — `CHANGES.md` (spec) + `new.css` (styles) + `app/sig.jsx` (logic) are the
> integration inputs.

## View (in the prototype project)
Open `index.html` in the ZTP1 project. Prove the character on the three archetypes:

- **Dashboard** — `#/dashboard`
- **Metric detail** (frames chart at full size) — `#/metrics/vitamins/vitd`
- **Metrics catalog** (data-dense) — `#/metrics`

Toggle the theme from the sidebar footer (both themes pass via the variable remap).
The **Tweaks** panel exposes the signature levers — *Spiral / phyllotaxis motif*,
*Motion — the settle*, *Paper grain* — and the chart-state preview (data / empty /
loading).

## Deliverables (per `../package/RETURN-SPEC.md`)
| Class | Files |
|---|---|
| New-rules-only stylesheet | [`new.css`](./new.css) — `zt-sig-*` only, **zero** token redefinitions |
| Loose source | [`app/sig.jsx`](./app/sig.jsx) + edits to `app/screens.jsx`, `app/charts.jsx`, `app/main.jsx` (prototype-only; not pulled) |
| Decision log | [`CHANGES.md`](./CHANGES.md) |

**Token delta: none.** Both themes · reduced-motion → instant · every base state
renders with JS off. **Gate PASSED 2026-06-20** (see `../../../NEXT-LINE-PLAN.md` Phase 4).
