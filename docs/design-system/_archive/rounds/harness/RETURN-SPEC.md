# RETURN-SPEC — what the design side returns

> Master copy lives at `docs/design-system/_rounds/harness/RETURN-SPEC.md`; a
> byte-identical copy ships in every outbound `roundN/package/`. This is the
> contract that keeps returns mechanically integrable.

## 1. Deliverables — loose source files, not only a bundle

Return **loose source files**, not only a standalone bundle:

- `app/*.jsx` — one file per screen/component touched.
- **ONE `new.css`** containing **ONLY** rules and custom properties **not already
  present** in the `app.css` snapshot included in the package. Specifically:
  - **No token redefinitions** — do not re-declare `--n-*`, `--paper*`, `--ink`,
    status colors, etc. that already exist in app.css.
  - **No dark-remap duplication** — do not re-emit the existing
    `html[data-theme="dark"]` variable remap block.
  - **No radius re-declarations** — `--radius-xs` … `--radius-2xl` exist; use them.

## 2. `CHANGES.md` — required

A `CHANGES.md` accompanying the return, covering:

- **Per screen:** what changed and why.
- **Every new or changed token** (name, value, which naming family it extends).
- **Any new icon names** used (lucide names).
- **Interaction-model decisions** — anything you consider "baked" (settled,
  not to be relitigated in later rounds) must be called out explicitly.

## 3. Tokens

- Use **existing token names** from the provided `app.css` snapshot.
- New tokens must follow the **existing naming families**
  (`--n-*` neutrals, `--radius-*`, `--shadow-*`, `--zn-*` shell geometry,
  status names `optimal/borderline/deficient/excess`, families `energy/vital/focus`).

## 4. Idiom mapping (prototype → app)

Prototypes must stay mechanically translatable. Use these idioms — the
integration side maps them as follows:

| Prototype idiom | App equivalent |
|---|---|
| `NLink href="#/x"` | react-router `NavLink` / `Link to="/x"` |
| `Icon name="x"` | direct `lucide-react` import (PascalCase component) |
| `window.ZD.categories` | `CATEGORY_INFO` — 9 ids: `vitamins`, `minerals`, `inflammatory`, `metabolic`, `hormones`, `autonomic`, `bodyComposition`, `lipids`, `hematology` |
| local theme hooks / toggles | existing `ThemeToggle` + `data-theme` plumbing — **never reimplement theming** |
| `zt-` / `zn-` class prefixes | reserved, as used in app.css (`zt-` app-level, `zn-` shell/nav) |

## 5. Standalone HTML

A standalone (bundler) HTML is **welcome as a viewing artifact only** — useful
for review in a browser. It must **never be the sole source**; the loose files
in §1 are the deliverable of record.

## 6. Fixed constraints

- **Breakpoint:** `760px` (single mobile breakpoint).
- **Dark theme:** via `html[data-theme="dark"]` **variable remap only** — no
  per-component dark selectors, no duplicate rule blocks.
