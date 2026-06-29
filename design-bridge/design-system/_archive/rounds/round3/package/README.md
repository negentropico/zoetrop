# Zoetrop — Round 3 Package (whole-app polish + data-viz language)

> **Purpose.** This is the **outbound package for design round 3**: a
> whole-app polish pass under the new left-nav chrome, plus a coherent
> **data-viz/chart language** for the metric visualizations. It is the *input*
> to a design roundtrip via claude.ai/design with the **zoetrop-design** skill
> bundle. The output flows back into the codebase per
> [`RETURN-SPEC.md`](./RETURN-SPEC.md) — read it before producing anything.

Round 2 (left nav) is **landed and baked** — the sidebar interaction model is
not up for redesign. Round 3 is about refining every screen *inside* that
chrome and giving the charts a unified visual language.

---

## How to use this package

1. **Read the brand first.** The zoetrop-design skill bundle you already hold
   is the brand source of truth (brand, voice, visual foundations, tokens,
   iconography). Nothing in this package overrides it.
2. **Self-render the app.** Open [`prototype/index.html`](./prototype/index.html)
   directly in a browser (no build step, no auth, no network required — it is a
   fully static artifact). You can also serve the `prototype/` directory with any
   static server (e.g. `python3 -m http.server 8080` from that folder). The
   prototype renders every Part A screen in the real **left-nav chrome** using the
   real `app.css` tokens and seeded sample data. **This is the viewing surface for
   round 3.** The basic-auth Vercel preview is NOT required for design work.
   - Sidebar: 264px expanded with single-open accordion; toggle to 64px icon rail
   - Theme toggle in the sidebar footer flips light ↔ dark via the app.css remap
   - Metric detail shows a Recharts trend chart with optimal + reference bands
   - Insights → Correlations shows the DataTable with filters
3. **Read the brief.** [`BRIEF.md`](./BRIEF.md) — Part A (whole-app polish
   pass, route by route) and Part B (data-viz/chart language), plus the
   explicit what-NOT-to-change list.
4. **Ground in current state.** [`current-state/`](./current-state/) is a
   snapshot of the shipped app at prep time:

   | File | What |
   |------|------|
   | `app.css` | The complete shipped stylesheet — tokens, dark remap, `zn-` shell CSS. Your `new.css` must contain only what is **not** already here |
   | `nav-tree.ts` | The IA — nav groups, children, breadcrumb logic |
   | `routes.md` | Every route: file, section, UI vs resource-only, public vs authed |
   | `components.md` | Every UI + shell component: purpose + key props |

5. **Return per [`RETURN-SPEC.md`](./RETURN-SPEC.md)** — loose source files,
   ONE new-rules-only `new.css`, and `CHANGES.md`. The prototype is a VIEWING
   artifact — the return contract is unchanged (the prototype is not the deliverable).
