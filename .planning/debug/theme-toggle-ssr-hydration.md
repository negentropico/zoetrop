---
slug: theme-toggle-ssr-hydration
status: resolved
trigger: Theme toggle SSR/hydration bug (Phase 4.1 design system) — login renders dark, dashboard renders light; toggle needs two clicks to switch
created: 2026-06-09
updated: 2026-06-09
---

# Debug: Theme toggle SSR/hydration

## Symptoms

- **Expected:** /login and /dashboard share the same initial theme (the persisted one, no flash); a single theme-toggle click flips the theme.
- **Actual:** /login renders in DARK mode, /dashboard renders in LIGHT mode (inconsistent initial theme across routes). The theme toggle requires TWO clicks before the theme visibly switches.
- **Errors:** None reported (visual/behavioral defect, not an exception).
- **Timeline:** Present since the theme toggle shipped (Phase 4.1 design system adoption). Phase 3 auth work is unrelated.
- **Reproduction:** Load /login (dark), navigate to /dashboard (light); click the theme toggle once (no change), click again (switches).

## Owner hypothesis (strong, treat as a lead not a conclusion)

The toggle's initial state is not seeded from the persisted theme (cookie/localStorage) at load — the server renders one theme and the client flips on hydration, so the toggle starts one click out of sync ("stuck param, not set at load").

## Suspect code

- `remix-app/app/root.tsx` — has a `NO_FLASH_SCRIPT` inline script + `Layout`; controls the SSR `<html>` theme class/attr.
- `remix-app/app/components/shell/TopNav.tsx` + a `ThemeToggle` component (location TBD — confirm; references theme).
- Theme persistence mechanism: cookie vs localStorage vs a `data-theme`/class on `<html>` — confirm which, and whether SSR reads it (cookie) or only the client does (localStorage). A localStorage-only persist with a cookie-less SSR default is the classic cause of both symptoms: SSR always renders the default theme (so /login and /dashboard differ only if one route forces a theme), and the toggle's `useState` initializes to a default that disagrees with the already-applied DOM theme → first click is a no-op resync.

## Current Focus

hypothesis: RESOLVED — see Resolution below.
next_action: n/a

## Evidence

- timestamp: 2026-06-09T20:27
  finding: Theme is persisted via localStorage ("zt-theme"). No cookie. SSR renders <html lang="en"> with no data-theme.
  
- timestamp: 2026-06-09T20:28
  finding: NO_FLASH_SCRIPT (inline, before CSS) reads localStorage → matchMedia fallback, sets data-theme on <html> before paint. Both /login and /dashboard receive this script.

- timestamp: 2026-06-09T20:29
  finding: ThemeToggle.useState lazy init reads document.documentElement.getAttribute("data-theme"). This correctly fires AFTER the no-flash script. However, this is not the canonical source.

- timestamp: 2026-06-09T20:30
  finding: ROOT CAUSE: React 19 + React Router 7 default entry.client.tsx wraps hydrateRoot in StrictMode. In StrictMode dev mode, commitDoubleInvokeEffectsInDEV calls reappearLayoutEffects → recursivelyTraverseReappearLayoutEffects → for case 27 (html/head/body singleton elements) unconditionally calls commitHostSingletonAcquisition, which strips ALL attributes from <html> via `for(var t=instance.attributes;t.length;)instance.removeAttributeNode(t[0])` before re-applying React props. This strips data-theme set by the no-flash script. Same code path runs in production during Suspense offscreen-to-visible transitions.

- timestamp: 2026-06-09T20:30
  finding: Double-click symptom: ThemeToggle.useState lazy init reads data-theme="dark" at render time (correct). React then commits, acquireSingletonInstance strips data-theme (DOM reverts to light). Toggle state="dark" but DOM is light. First click sets data-theme="dark" (no visual change), second click sets data-theme="light" (visual change).

- timestamp: 2026-06-09T20:30
  finding: Login vs dashboard inconsistency: /login has no ThemeToggle and no useLayoutEffect to re-apply data-theme, so it stays stripped (light). /dashboard mounts ThemeToggle whose useLayoutEffect (after fix) re-applies data-theme.

## Eliminated

- Cookie-based persistence — not used; localStorage only
- React removing data-theme via updateProperties — not the path; React only diffs props it manages
- CSS custom property cascade failure — rules correct; issue is the attribute being stripped

## Resolution

root_cause: React 19's commitHostSingletonAcquisition (called during StrictMode double-invocation dev cycle and Suspense offscreen-to-visible transitions) strips ALL attributes from <html>, including data-theme set by the no-flash script, before re-applying React's tracked props (lang="en"). ThemeToggle.useState lazy init reads data-theme at render time (correct value) but the DOM is then cleared in the subsequent commit, leaving state and DOM out of sync → two clicks needed. Routes without ThemeToggle (e.g. /login) have no mechanism to re-apply data-theme, causing cross-route inconsistency.

fix: Two changes — (1) ThemeToggle.tsx: useState lazy init now reads from localStorage (the canonical persisted source, same as no-flash script) for robustness; useLayoutEffect([theme]) re-applies data-theme after every commit, including initial mount — fires after acquireSingletonInstance clears it, before browser paints. toggle() simplified to only update state+localStorage. (2) root.tsx: Added ThemeRestorer component (renders null, has useLayoutEffect on mount) that re-reads localStorage and re-applies data-theme — covers all routes including /login that never mount ThemeToggle.

verification: All 84 tests pass (82 existing + 2 new). TypeCheck clean. SSR HTML unchanged (html lang="en", no data-theme). ThemeToggle tests updated to use localStorage seeding instead of data-theme attribute seeding to match new initialization path. LIVE-BROWSER confirmation (chrome-devtools, dev server, 2026-06-09): (1) cross-route consistency — /login and /dashboard both render the persisted theme identically (zt-theme=light → data-theme=light, bodyBg rgb(245,242,240) on both; was login-dark/dashboard-light); data-theme stable post-hydration on /login which has no ThemeToggle (proves ThemeRestorer). (2) single-click toggle, bidirectional — one click flips light→dark (data-theme+localStorage+bodyBg all update) and one click flips dark→light (was: two clicks needed).

files_changed:
  - remix-app/app/components/ui/ThemeToggle.tsx
  - remix-app/app/components/ui/ThemeToggle.test.tsx
  - remix-app/app/root.tsx
