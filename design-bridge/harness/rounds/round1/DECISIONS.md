> Status legend: ☐ open · ◑ in session · ☑ closed (date).

## S1.0 · Foundation — brand language, token system, first screens (prior round1) — ☑ closed (2026-06-07)

- **(a) Selected direction:** The Zoetrop language: three metric hue families — Energy (amber --energy), Vital (teal --vital), Focus (periwinkle --focus, the default action colour) — over warm Paper/Mist/Ink neutrals (never blue-grey); Space Grotesk display / Hanken Grotesk body / Space Mono data (tabular figures, UPPERCASE micro-labels); large-radius "frame" cards, pill controls, soft warm ink-tinted shadows; spiral + phyllotaxis brand motifs. Shipped the full token system (tokens/*.css) + 11 core components (Button/Badge/Avatar/Card/IconButton/Input/Switch/SegmentedControl/MetricRing/ProgressBar/Stat) + first screens (dashboard, metrics, protocol, correlations, detail, import).
- **(b) Rejected + why:** Gradients (banned); blue-grey neutrals (warm-tinted only); emoji. No data-density forking yet.
- **(c) Token delta:** Established the foundation vocabulary in tokens/*.css: metric ramps (energy/vital/focus 50–600), warm neutral ramp --n-0…--n-950, semantic surface/text/border/accent aliases, status (--success/--warning/--danger), Fibonacci spacing, radii (xs→2xl + pill), warm ink-tinted shadows, motion (--ease-*, --dur-*). Dark via html[data-theme="dark"] warm-dark remap; Tailwind v4 @theme inline bridge.
- **(d) AA-contrast notes:** Warm neutral ramp tuned for AA body text on paper; dark = warm-dark (never blue-grey), color-scheme: dark.
- **(e) Reduced-motion / JS-off:** Brisk, eased, never bouncy; metric rings sweep on mount; reduced-motion collapses to instant via the global rule.
- **(f) Next-session constraints:** Brand language + token families LOCKED. Navigation / IA to be resolved next (becomes S1.1).

---

## S1.1 · IA spine — consolidated left sidebar (prior round2, BAKED) — ☑ closed (2026-06-10)

- **(a) Selected direction:** One consolidated left sidebar replacing top-nav + bottom-tab + 5 per-section sub-navs: 264px expanded / 64px collapsed icon rail (cookie-persisted collapse); single-open accordion for section groups (re-opens the active group on nav); flyout on the collapsed rail (hover, viewport-clamped, Escape to close); mobile (≤760px) off-canvas drawer + 56px sticky top bar; unified PageHeader (meta row eyebrow-left / crumb-right, then title row). Landed via nav-tree.ts + Sidebar/SidebarAccount/MobileTopBar + AppShell, routes.ts flattened.
- **(b) Rejected + why:** The prior chrome — top-nav + bottom-tab + per-section sub-navs. BAKED: the interaction model is no longer up for redesign in later rounds.
- **(c) Token delta:** Added the zn-* sidebar-geometry CSS section in app.css (shell geometry only; no brand-token changes).
- **(d) AA-contrast notes:** Inherited the locked S1.0 palette; no new colour.
- **(e) Reduced-motion / JS-off:** Accordion + flyout transitions; reduced-motion respected; off-canvas drawer on mobile.
- **(f) Next-session constraints:** Chrome BAKED. Refine the screen-level instrument language next — charts, status, density (becomes S1.2).

---

## S1.2 · Calm-instrument screen language (prior rounds 3+4+5, FINAL) — ☑ closed (2026-06-12)

- **(a) Selected direction:** North star: every screen reads as one calm instrument — neutral structure, ink data, status carried only by the four canonical status colours, at a compact data-dense rhythm. Chart language = "frames" (ringed ink dot + hairline frame tick; thin connecting line; optimal band as a quiet vital tint at 50% with a mono band tag; milestones not dates; linear-fit projections; ONE app-wide frame-card tooltip). Status maps through canonical tokens on bands/dots/badges only — never the trend line. Populated states: ingest-review split-view (review decision IS the status language; commit gates on pending=0; field→source-line linkage), public register (landing/login on dot-grain), WHOOP/Vault direct-write imports (only lab PDFs are review-gated), settings invites flow. Dark full sweep + mobile ≤760px sweep both reconciled.
- **(b) Rejected + why:** Airy/cozy density exploration (→ compact default; the data-density attribute mechanism removed). Correlation heatmap (built, reviewed, DROPPED — the table reads better at sparse pair counts). % MetricRing for status share (→ frame strip; rings reserved for true completion metrics only).
- **(c) Token delta:** 14 new tokens (all extending existing families): --optimal/--borderline/--deficient (+ -bg), --surface-low/--surface-low-2, --gap-card/--gap-section/--gap-row, --zn-page-top/--zn-brand-pad/--zn-brand-gap. 3 changed (deliberate, flagged): --dur-ring 900→1600ms; --vital-500/--energy-500 dark-only one step brighter. New zt-* component class layer + the ztPulse keyframe.
- **(d) AA-contrast notes:** Dark sweep: --vital-500/--energy-500 used as text on dark cards lifted one step (variable remap only, no per-component dark selectors). Body/title 11–16:1 (AAA); status tags ~4.5:1 (AA).
- **(e) Reduced-motion / JS-off:** Ring sweep mount-only at --dur-ring 1600ms, 60ms stagger; data updates at --dur-base; reduced-motion → instant. Mobile sweep verdict taken from real layout geometry (screenshot artifacts noted).
- **(f) Next-session constraints:** FINAL — foundation frozen. Open carry-overs become refinement LINEs: Reports surface has NO design treatment (deferred 3×); landing/login marketing copy is placeholder; real extraction sample pending.
