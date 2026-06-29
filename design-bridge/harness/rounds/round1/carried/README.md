# carried/ — ZOETROP-R1 foundation state carried into every refinement line

This charter is FROZEN, so the carried state is the **whole shipped foundation** — a refinement line
loads it, never re-derives it:

- **Token truth:** `remix-app/app/app.css` (`:root` light + `html[data-theme="dark"]` dark; Tailwind v4
  `@theme inline` bridge). The `current-state/app.css` snapshot in each line's `package/` is a copy taken
  at seed time.
- **DS source + reference:** `design-bridge/design-system/` (`_ds_manifest.json` namespace
  `ZoetropDesignSystem_48aebc`; 11 core components; guidelines; brand marks; `_adherence.oxlintrc.json`).
- **Closed decisions:** `../CHARTER.md` (the LOCK) + `../DECISIONS.md` (S1.0–S1.2 ☑).
- **The `zt-*` / `zn-*` class layers** in `app.css` (the calm-instrument component vocabulary + the
  shell geometry) — extend with new namespaced classes, never reuse a claimed word.

No per-session carried-data files are needed (the foundation is the carry).
