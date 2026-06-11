# Zoetrop — Round 3 Package (whole-app polish + data-viz language)

> **Purpose.** This is the **outbound package for design round 3**: a
> whole-app polish pass under the new left-nav chrome, plus a coherent
> **data-viz/chart language** for the metric visualizations. It is the *input*
> to a design roundtrip via claude.ai/design with the **zoetrope-design** skill
> bundle. The output flows back into the codebase per
> [`RETURN-SPEC.md`](./RETURN-SPEC.md) — read it before producing anything.

Round 2 (left nav) is **landed and baked** — the sidebar interaction model is
not up for redesign. Round 3 is about refining every screen *inside* that
chrome and giving the charts a unified visual language.

---

## How to use this package

1. **Read the brand first.** The zoetrope-design skill bundle you already hold
   is the brand source of truth (brand, voice, visual foundations, tokens,
   iconography). Nothing in this package overrides it.
2. **Work from the live preview.** There are **no screenshots in this package
   by design** — review the actual deployed app:
   **https://zoetrop-git-003-remix-foundation-negentropico.vercel.app**
   The preview sits behind pilot basic-auth; **credentials are supplied
   out-of-band** (never written into this package).
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
   ONE new-rules-only `new.css`, and `CHANGES.md`. A standalone bundle is
   welcome as a viewing artifact only.
