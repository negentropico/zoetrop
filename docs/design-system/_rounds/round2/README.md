# Round 2 — Left Nav Prototype (archived)

> **Status:** landed and merged. The interaction model designed here is **BAKED** —
> it is no longer up for redesign in later rounds.

## What round 2 was

A focused design roundtrip (claude.ai/design + the zoetrop-design skill bundle) on a
single problem: replace the top-nav + bottom-tab + 5 per-section sub-navs with **one
consolidated left sidebar**. The return defined the interaction model the app now ships:

- **264px expanded / 64px collapsed icon rail**, cookie-persisted collapse state
- **Single-open accordion** for section groups (re-opens the active group on nav)
- **Flyout** on the collapsed rail (hover, viewport-clamped, Escape to close)
- Mobile (≤760px): off-canvas drawer + 56px sticky top bar
- Unified `PageHeader`: meta row (eyebrow left / crumb right), then title row

## Contents

| Path | What |
|------|------|
| `return/Left Nav Prototype (standalone).html` | The raw 1.6MB self-decoding **bundler HTML** as returned (viewing artifact — decodable with `../harness/unbundle.mjs`) |
| `return/nav-app.jsx`, `return/sidebar.jsx` | Loose prototype source that accompanied the bundle |
| `return/Screenshot 2026-05-19 …PM.png` (×5) | Prototype screenshots from the design session |
| `extracted/zn-proto.css` | The sidebar CSS **hand-extracted** during integration (the bundle's second template `<style>` block). Doubles as the acceptance-test reference for `unbundle.mjs` |

## How it landed

Integrated on the `left-nav-refactor` branch via three GSD quick tasks:

| Task | What it shipped |
|------|-----------------|
| `260610-q56` | Chrome refactor: `nav-tree.ts` (NAV_TREE, groupOfPath, isChildActive, crumbsForPath), `Sidebar.tsx`, `SidebarAccount.tsx`, `MobileTopBar.tsx`, AppShell rewrite, routes.ts flatten (fixed unroutable `/ingest`), `zn-*` CSS section in app.css. 7 commits |
| `260610-rj2` | Crumb meta-row (eyebrow left / crumb right) |
| `260610-rwg` | Header unification across pages (`PageHeader`) |

## Integration pain points (what motivated the harness)

The return arrived as a 1.6MB **self-decoding bundler HTML** dumped into untracked
`_notes/`, not as loose source. Integration (q56) required:

1. **Hand-decoding the bundle** — the real 40KB prototype HTML lives inside a
   `<script type="__bundler/template">` tag as a JSON-encoded *string*, alongside a
   `<script type="__bundler/manifest">` of 22 base64+gzip assets. Getting at the
   actual markup/CSS meant manually JSON-parsing script-tag innards.
2. **Sieving new CSS from token duplicates** — the template's first `<style>` block
   (~27.5K chars) is mostly a re-dump of existing design-system tokens; only the
   second block (~11.4K chars) was genuinely new sidebar CSS. Separating "port this"
   from "already have this" was done by eye, line by line.
3. **Re-mapping prototype idioms** — `NLink href="#/x"` → react-router `NavLink`,
   `Icon name="x"` → direct lucide-react imports, `window.ZD.categories` →
   `CATEGORY_INFO`, local theme hooks → existing `ThemeToggle`/`data-theme` plumbing.

The harness (`../harness/`) mechanizes 1 and 2 (`unbundle.mjs`, `css-delta.mjs`); the
return contract (`../harness/RETURN-SPEC.md`) prevents a bundler-only return from
recurring and pins the idiom mapping for 3.

## Note on `_notes/`

The main-tree `_notes/` directory (and the untracked main-tree
`docs/design-system/_rounds/round2/` files) are now **redundant copies** of what is
archived here. They are left in place as the user's working copies — this directory
is the durable record.
