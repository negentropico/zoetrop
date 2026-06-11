# Consolidated Left Nav — Integration Plan

## Context

Replace the current chrome (sticky 68px `TopNav` + mobile `BottomTab` + per-section sub-navs: metrics' 232px sidebar/pill-bar and four near-duplicate underline tab strips) with the consolidated left sidebar from the prototype in `_notes/` (`sidebar.jsx`, `nav-app.jsx`, standalone HTML). The prototype's interaction model is baked: **264px expanded / 64px icon rail collapsed, single-open accordion, parent click expands, hover flyout on the rail, account menu in the footer (owns the theme control)**. Content/pages stay unchanged — this is a chrome-only refactor.

**Approved decisions:**
- Mobile = **off-canvas drawer** (same sidebar slides in over a backdrop via hamburger); `BottomTab` removed entirely.
- Collapse state persists in a **cookie read in the loader** (SSR-safe, no flash; shadcn-sidebar pattern). Theme plumbing (`zt-theme` localStorage + no-flash script + `ThemeRestorer`) untouched.
- Scope: **Ingest** becomes a tier-1 nav group; section tab strips + metrics sidebar are **deleted**; **breadcrumbs** (existing `Crumb`) render shell-wide. Settings stays account-menu-only.

**Bug found & fixed en route:** `routes.ts:42` — `index("routes/_app/ingest/index.tsx")` sits inside two *pathless* layouts, so it registers at `/`, colliding with the public landing index; `/ingest` is currently unroutable. The flatten in Step 6 fixes it (`route("ingest", …)`).

**Verified groundwork** (read from the real files): all 5 section layouts are pure JSX (no loaders/meta) → safe to delete; `AppShell`'s `wide` prop is never passed (dead); `DropdownMenu` is only consumed by `AccountMenu` (orphaned after this); the only TopNav-coupled sticky offset is `metrics/layout.tsx` `top: 92` (dies with the file); `Crumb` already exists and is page-rendered in 3 detail routes; lucide-react has all needed icons (`PanelLeftOpen/Close`, `ChevronsUpDown`, `Menu`, `FileUp`, …); app.css already contains the prototype's token/dark-remap additions — only `--zn-*` geometry vars + `.zn-*` component rules are new. Prototype CSS extracted to `/tmp/zn-style-1.css` (re-extract if needed: line 182 of the standalone HTML is the JSON-encoded template).

All work in `remix-app/`. Reuse, don't rebuild: `ThemeToggle`, `Avatar`, `Badge`, `Wordmark`, `SpiralMark`, `Crumb`, `CATEGORY_INFO`.

---

## Step 1 — Nav tree module (new): `app/components/shell/nav-tree.ts`

Single source of truth for Sidebar, flyout, and breadcrumbs.

```ts
interface NavChild { label: string; to: string; end?: boolean; hidden?: boolean }
interface NavGroup { id: string; label: string; icon: LucideIcon; base: string; exact?: boolean; children?: NavChild[] }
export const NAV_TREE: NavGroup[]
export function groupOfPath(pathname: string): NavGroup
export function isChildActive(pathname: string, child: NavChild): boolean
export function crumbsForPath(pathname: string): CrumbItem[] | null
```

- Tree: **Dashboard** (`LayoutGrid`, `/dashboard`, exact) · **Metrics** (`Activity`: "All categories" + 9 from `CATEGORY_INFO`; move `LUCIDE_MAP` here from the dying metrics layout) · **Protocol** (`ListChecks`: Overview/Versions/Supplements/Cessation/Compare) · **Insights** (`GitCompare`: Overview/Correlations/Genetics) · **Import** (`Download`: Overview/WHOOP/Vault) · **Ingest** (`FileUp`: Overview `/ingest` /Upload/Review + `{label:"Consent", to:"/ingest/consent", hidden:true}` for breadcrumbs only).
- `isChildActive`: exact for `end`; else `path === to || path.startsWith(to + "/")` — so `/metrics/vitamins/:id` highlights Vitamins, `/protocol/versions/:v` highlights Versions.
- `groupOfPath`: `path === base || path.startsWith(base + "/")` (avoids prefix accidents).
- `crumbsForPath` (prevents double-titling): `/dashboard` → null · group base → `[zoetrop→/dashboard, Group]` · exact child → `[…, Group→base, Child]` · `/settings` → `[zoetrop, Account settings]` · **anything deeper (param routes) → null** — the 3 pages with loader-derived `Crumb`s keep owning theirs.

## Step 2 — CSS: `app/app.css`

- Layer-2 `:root`: add `--zn-side-w: 264px; --zn-rail-w: 64px; --zn-row-h: 40px; --zn-child-h: 34px;`
- Append `/* === Sidebar shell (zn-*) === */` section, porting from `/tmp/zn-style-1.css` **lines 65–233 + 238–239 only** (`.zn-side`…`.zn-menu-item.is-danger:hover`, `.zn-main`, `.zn-page`). Skip the dark remap / radii / `a`/`::selection` (already in app.css) and `.zn-ghost`/`.zn-grid-4` (prototype placeholders).
- New rules (not in prototype) — mobile drawer at the app's existing **760px** breakpoint:
  - `.zn-topbar` hidden by default; ≤760px: sticky 56px bar (hamburger + wordmark), z-40.
  - ≤760px: `.zn-side { transform: translateX(-100%) }`, `.zn-side.is-mobile-open { transform: none; box-shadow: var(--shadow-xl) }`, `.zn-collapse { display:none }`, `.zn-main { margin-left: 0 !important }`.
  - `.zn-mobile-backdrop` fixed inset-0 z-55 (ink 35% color-mix).
  - Desktop content offset **class-driven, not inline style**: `.zn-app .zn-main { margin-left: var(--zn-side-w) }`, `.zn-app.is-collapsed .zn-main { margin-left: var(--zn-rail-w) }`.
- Update the scoped theme-transition selector (~app.css:383): swap `.zt-topnav, .zt-bottomtab` for `.zn-side, .zn-topbar`.
- z-index map (prototype-preserved): topbar 40 < mobile backdrop 55 < sidebar 60 < fly-backdrop 70 < flyout 80 < account menu 90.

## Step 3 — New shell components (`app/components/shell/`)

**`Sidebar.tsx`** — `{ user, collapsed, onToggleCollapsed, mobileOpen, onMobileClose }`
Port of `_notes/sidebar.jsx`: hash links → react-router `NavLink`/`Link`; prototype `Icon` → direct lucide components; `useLocation()` for path. Single-open accordion (`open` keyed by group id, effect re-opens `groupOfPath(pathname)` on nav). Collapsed rail + **Flyout as a local component** (fixed-position, viewport-clamped `useLayoutEffect`, 180ms close timer, Escape, `zn-fly-backdrop`). `useIsMobile()` hook (matchMedia 760px, `false` during SSR): on mobile always render the **expanded** variant (rail/flyout is desktop-only). Header: `SpiralMark` + "zoetrop." wordmark → `/dashboard` + collapse toggle. Footer: `SidebarAccount`.

**`SidebarAccount.tsx`** — `{ user, collapsed }`
Replaces `AccountMenu` (DropdownMenu opens downward — wrong for a footer; popover needs the right-opening `is-rail` mode). Trigger `.zn-account`: existing `Avatar` + name/role + `ChevronsUpDown`. Popover `.zn-account-menu` (+`is-rail` when collapsed): name/email + role `Badge` (copy `ROLE_TONE`/`ROLE_VARIANT` maps from `AccountMenu.tsx`), `Link` to `/settings`, a Theme row embedding the existing **`<ThemeToggle/>`** (do NOT reimplement the prototype's `useThemeLocal`), and the **`<Form method="post" action="/logout">`** danger Sign out copied verbatim (no-JS signout preserved). Closes on backdrop/Escape/navigation.

**`MobileTopBar.tsx`** — `{ onMenu }`: `.zn-topbar` with `Menu` hamburger (≥44px target, aria-label) + existing `Wordmark`.

## Step 4 — Cookie plumbing

- Cookie `zt-nav=1` ⇒ collapsed; `Path=/; Max-Age=31536000; SameSite=Lax`.
- **Read in the existing `app/routes/_app/layout.tsx` loader** (owns the shell; keeps public routes clean): regex the `Cookie` header, return `{ user, navCollapsed }`.
- **Write client-side** on toggle: `document.cookie = …` — no fetcher/action; React state is authoritative in-session, server reads it on the next document request.
- `useState(navCollapsed)` from loader data ⇒ identical server/client render, **no hydration mismatch, no flash**.

## Step 5 — Rewrite `app/components/shell/AppShell.tsx`

Props: `{ children, user, navCollapsed }`. State: `collapsed` (init from loader; toggle writes cookie), `mobileOpen`. Effects: close drawer on `pathname` **and** `search` change (ingest review uses `?doc=`); Escape closes; body scroll-lock while open.

```tsx
<div className={"zn-app" + (collapsed ? " is-collapsed" : "")}>
  <MobileTopBar onMenu={…} />
  <Sidebar … />
  {mobileOpen && <div className="zn-mobile-backdrop" onClick={close} />}
  <main className="zn-main"><div className="zn-page">
    {crumbs && <Crumb items={crumbsForPath(pathname)} />}
    {children}
    <footer>…SpiralMark + zoetrop eyebrow…</footer>
  </div></main>
</div>
```

Delete: `wide` prop (dead), `BottomTab` render, 80px mobile spacer, inline `marginLeft` (class-driven now).

## Step 6 — `routes.ts` flatten + ingest fix

Remove the five section `layout(…)` wrappers; register all section routes flat under `_app/layout.tsx`. **`index("routes/_app/ingest/index.tsx")` → `route("ingest", "routes/_app/ingest/index.tsx")`** (fixes the `/` collision; `/ingest` becomes reachable — it's a redirect-to-upload loader).

## Step 7 — Page touch-ups

Prepend `{ label: "zoetrop", to: "/dashboard" }` to the three page-owned Crumbs: `metrics/category.tsx` (~:216), `metrics/detail.tsx` (~:117), `protocol/version-detail.tsx` (~:140). No other page edits — every page already renders its own `PageHeader`; crumb-above-header matches the prototype composition.

## Deletions

`components/shell/TopNav.tsx`, `BottomTab.tsx`, `AccountMenu.tsx`; `components/ui/DropdownMenu.tsx` (orphaned); `routes/_app/{metrics,protocol,insights,import,ingest}/layout.tsx`.
**Kept:** `Wordmark`, `ThemeToggle` (+test), `Crumb`, `SpiralMark`, `Avatar`, `Badge`, all root.tsx theme plumbing.

## Commit-sized ordering

1. `nav-tree.ts` + app.css zn-* section (inert).
2. `SidebarAccount` + `Sidebar` + `MobileTopBar`.
3. AppShell rewrite + `_app/layout.tsx` cookie loader (sidebar live; old sub-navs render harmlessly until step 4).
4. routes.ts flatten + ingest fix + delete 5 section layouts + `npm run typecheck` (regenerates `+types`).
5. Delete TopNav/BottomTab/AccountMenu/DropdownMenu + app.css theme-transition selector update.
6. Crumb prepends on the 3 detail pages.

> Concurrent-sessions note: other Claude sessions commit to `.planning/` on this tree — stage files explicitly per commit, never `git add -A`.

## Risks / edge cases

- **Ingest "Overview" never highlights** — `/ingest` redirects to `/ingest/upload`. Accepted; don't move the Dropzone (LAB-04/D-10 single-upload-surface constraint noted in `ingest/index.tsx`).
- `useIsMobile()` is `false` at SSR — harmless: sidebar is off-canvas via CSS on mobile before hydration; drawer state starts closed.
- `/ingest/consent` highlights the Ingest group (hidden child gives it a crumb) — fine.
- `prefers-reduced-motion`: app.css already kills transitions globally; ported flyout keyframe guard is redundant-but-harmless.

## Verification

```bash
cd remix-app
npm run typecheck && npm run lint && npm run test && npm run build
```

Manual (desktop 1440 + mobile 390, light + dark — chrome-devtools MCP: `resize_page`, `navigate_page`, `take_screenshot`, `list_console_messages` for hydration warnings):
- `/` and `/login`: **no sidebar/topbar**.
- `/dashboard`: no crumb; Dashboard active.
- `/metrics` → `/metrics/vitamins` → detail: group auto-opens, child highlights on deep routes, **no duplicate crumbs** on the 3 pages with page-owned Crumbs.
- All protocol/insights/import children; `/ingest` redirect now works (was 404); `/ingest/review?doc=…` selection doesn't close anything.
- `/settings` via account popover only; crumb "zoetrop / Account settings".
- Collapse → rail + hover flyout (clamped near viewport bottom), Escape closes; **reload preserves collapse with no flash** (`document.cookie` has `zt-nav=1`).
- Mobile: hamburger opens expanded drawer, backdrop/Escape/navigation closes, scroll locked, no dead 80px at bottom; popover opens upward in drawer.
- Sign-out Form POST works; ThemeToggle in popover behaves (no double-toggle).

## Execution note (GSD)

Per repo workflow enforcement, run execution through GSD — `/gsd-quick` fits this ad-hoc chrome refactor (it's not a roadmap phase). The commit ordering above maps 1:1 onto its task breakdown.
