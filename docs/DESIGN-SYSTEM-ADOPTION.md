# Design System Adoption

> Narrative companion to the GSD roadmap (alongside `docs/PLATFORM.md` and
> `docs/PRINCIPLES.md`). How the generated **Zoetrope** brand design system
> (`docs/design-system/`) lands in the product and binds future UI work.
>
> **Status:** Phase 04.1 **complete** · design roundtrip delivered · brand shipped
> in-app · binding contract in `04.1-UI-SPEC.md` · warm-dark theme live ·
> all 16 routes retrofit. D3 "defer dark" superseded by D-09 (see §2 and §8).

*Created 2026-06-07. Last updated 2026-06-08 (Phase 04.1 complete).*

---

## 1. Why this exists

`docs/design-system/` is a fully-realized brand — warm Paper palette, the
Energy / Vital / Focus metric families, Space Grotesk / Hanken / Space Mono type,
frame cards, Lucide icons, a signature **MetricRing**, and a calm "quiet coach"
voice. The shipped app is a **cool-grey/blue Tailwind dashboard in Inter** with
emoji icons and gradient bars. The brand has not been applied to the product.

This doc plans that application **without derailing the engine-first roadmap**.

## 2. Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Roadmap placement | **Contract now, build later.** Codify the brand as a binding UI contract; defer the build. Keeps DS adoption off the engine-first critical path. |
| D1b | Roundtrip gate | The contract is **finalized only after** a claude.ai/design roundtrip revises the key screens. Build follows revisions. |
| D2 | Fidelity | **Foundations + signature parts.** Adopt all tokens + the high-value signature components (MetricRing, Card, Stat, Badge, SegmentedControl); re-skin incrementally rather than a wholesale UI-kit clone. |
| D3 | Dark mode | ~~**Light-first; dark deferred.** The brand ships no dark tokens. Keep the dark toggle as a later task; design light faithfully without foreclosing a future warm-dark theme.~~ **SUPERSEDED by D-09 (Phase 04.1, 2026-06-08).** The claude.ai/design roundtrip delivered a full warm-dark token remap; dark mode was shipped in Phase 04.1 — `html[data-theme]` attribute, no-flash inline theme script, warm-dark `@theme` token block, and `ThemeToggle`. Do not relitigate. See CONTEXT D-09 and UI-SPEC § Dark Theme. |

## 3. Sequence

```
[done] Build screens package  →  docs/design-system/uploads/screens-package/
          │   (8 archetype screens: current-state screenshots + redesign briefs)
          ▼
[NOW ] Design roundtrip  →  hand package + brand DS to claude.ai/design
          │   returns: revised screens + resolutions to the open questions
          ▼
[next] Finalize contract  →  UI-SPEC.md via /gsd-ui-phase (revision-informed)
          │   + foundations pass (tokens/fonts wired into the app)
          ▼
[then] Build  →  retrofit existing screens; all new UI (Phases 5–6) born in-brand
```

Nothing is built in `remix-app/` until the roundtrip returns. The package is the
gating artifact; this doc + the eventual UI-SPEC are the contract.

## 4. The package (input to the roundtrip)

`docs/design-system/uploads/screens-package/` — see its `README.md`. Eight
archetypes (dashboard, grouped list, section+nav, detail+chart, tabbed section,
signature timeline, data table, upload/form) chosen to cover every pattern the
product needs through M1. Each has desktop + mobile current-state screenshots and
a `brief.md`. The `REDESIGN-BRIEF.md` carries the global violation checklist and
the **open design questions** the roundtrip must resolve (below).

## 5. Open questions the roundtrip resolves (recorded, not pre-decided)

1. **9 categories → 3 metric families** (the hard one). The brand's three
   families (Energy/Vital/Focus = activity/heart/mind) were designed for an
   activity app; Zoetrop's domain is 9 clinical lab categories + autonomic.
   *Leaning:* demote per-category color, drive UI by **status**, reserve the 3
   families for the autonomic/activity domain — but the roundtrip decides and
   documents the category color/icon spec.
2. **4-status palette.** The app has 4 statuses (optimal/borderline/deficient/
   excess); the brand defines ~3 status tokens. The roundtrip defines the 4th.
3. **Responsive/nav system.** The current header doesn't collapse (overflows
   ~449px on mobile). The roundtrip proposes a real responsive nav + dense-table
   reflow.
4. **Emoji → Lucide** mapping for the 9 categories (proposed table in the brief).
5. **Wordmark.** "Zoetrop" (app) vs "zoetrope." (brand). Internal codename;
   public brand deferred — flag, don't relitigate.

## 6. Integration architecture (as-built — Phase 04.1)

> *This section was originally a recommendation; it now records what shipped.*

The DS ships **raw CSS-variable tokens** + **inline-style `.jsx` components**.
The app is **React Router 7 + TS strict + Tailwind 4 (`@theme`)**. Implemented
path (D-01, D-02, D-03 from CONTEXT):

**Token bridge into Tailwind `@theme` inline + signature components ported to typed TSX.**

- DS token files (`tokens/colors.css`, `typography.css`, `spacing.css`,
  `base.css`) are **mapped into Tailwind's `@theme inline`** in `app/app.css`.
  The app writes utilities (`bg-paper`, `text-ink`, `font-display`,
  `shadow-warm-md`, `rounded-frame`, `text-vital`) that resolve to brand tokens.
  Re-skinning = class swaps, not a rewrite. (D-01)
- Signature components (MetricRing, Card, Stat, Badge, SegmentedControl,
  DataTable, PhaseBar, UploadDropzone) are **ported to typed Tailwind TSX** under
  `app/components/ui/` and shell components (TopNav, BottomTab, MobileNavDrawer)
  under `app/components/shell/`. The `.jsx`/`_ds_bundle.js` runtime was not
  shipped into the TS-strict app. (D-02)
- **No shadcn** — tooling = Tailwind `@theme` + hand-ported TSX only. (D-03)
  `docs/design-system/` stays the source of truth; the app consumes a bridged
  subset. Token→Tailwind mapping is documented in `app/app.css` comments so
  drift is visible.
- **All 16 routes** retrofitted — no half-branded app. (D-10)
- **Warm-dark theme shipped** — `html[data-theme]` attribute, no-flash inline
  script (reads `localStorage` `zt-theme`, falls back to `prefers-color-scheme`),
  warm-dark `@theme` token block, `ThemeToggle`. (D-09; see §8 note.)

*Rejected at planning:* shipping `styles.css` + the `.jsx` components as-is
(paradigm clash with Tailwind, `.jsx` in TS-strict, two styling systems
coexisting). This rejection held and shaped the implementation.

### Foundations — as landed
- **Landed (Phase 04.1):** fonts (Inter → Space Grotesk/Hanken/Space Mono),
  warm neutral ramp (Paper/Mist/Ink), 3 family ramps, spacing/radii/shadows/
  motion, `base.css` helpers (`.zt-eyebrow`, `.zt-readout`, tabular nums, warm
  focus ring), 4-status palette (optimal/borderline/deficient/excess + excess
  token D-06), category icon system (Lucide, D-05), responsive nav (TopNav +
  BottomTab at ~760px breakpoint, D-07), warm-dark theme (D-09).
- **Still deferred:** replacing substitution-flagged Google-Font stand-ins with
  licensed grotesque; swapping placeholder clinical reference ranges for real
  assay ranges (data task); Lucide → licensed icon set.

## 7. How this plugs into `.planning` / the roadmap

Incorporated into `ROADMAP.md` as **Phase 4.1 — Design System Adoption**
(inserted between Phase 4 and Phase 5), with requirement **UI-01** added to
`REQUIREMENTS.md` and Phases 5 & 6 wired to depend on its `UI-SPEC.md`. The
insertion is logged under STATE.md → Roadmap Evolution. The phase carries an
explicit **gate** (the claude.ai/design roundtrip) and is **not planned** until
revisions return.

### Phase 4.1 — Design System Adoption (inserted, gated)

> *(sequenced between Phase 4 and Phase 5 — see `ROADMAP.md` for full success
> criteria)*
> **Goal:** The Zoetrope brand is a working, typed foundation in the app, the M0
> screens are re-skinned in-brand, and a binding `UI-SPEC.md` governs all
> subsequent UI — so Phases 5 & 6 build in-brand from the first commit.
> **Depends on:** Phase 4 (live data — reskin once, on the live screens, not the
> static ones).
> **Gate:** the design roundtrip (revised screens + resolved questions).
> **Why between 4 and 5:** new UI (lab-ingest review, reports) should be *born*
> in-brand; the contract + foundations must exist before Phase 5 starts.
> **Likely plans:**
> 1. Bridge tokens into Tailwind `@theme` + fonts + `base.css` helpers.
> 2. Port signature components to typed TSX (`MetricRing`, `Card`, `Stat`,
>    `Badge`, `SegmentedControl`) + a new **DataTable** + **SegmentedPhaseBar**
>    + **UploadDropzone** (gaps the brand DS doesn't yet cover).
> 3. Retrofit screens 01–07 to brand (class swaps + component substitution).
> 4. Resolve the category color/icon + 4-status palette in code.
> **Mechanism:** run `/gsd:ui-phase 04.1` once revisions land — feed it this
> package, the revised screens, and `docs/design-system/` to produce `UI-SPEC.md`,
> then `/gsd:plan-phase 04.1`.

### Done as part of this incorporation
- **Phase 5 (Lab Ingest)** now depends on Phase 4.1 — the upload→review→approve
  UI builds against `UI-SPEC.md`. Screen 08's brief sketches the two-pane review
  pattern.
- **Phase 6 (Reports)** now depends on Phase 4.1 — the confidence-graded report
  UI builds against `UI-SPEC.md`; reuse the restyled `TrendChart` + the DataTable
  pattern from screen 07.
- **`UI-01`** added to `REQUIREMENTS.md` (UI conformance), mapped to Phase 4.1.
- Phase directory seeded: `.planning/phases/04.1-design-system-adoption/`.

## 8. Out of scope / deferred

- ~~Warm **dark theme** (no brand tokens yet) — later task (D3).~~ **SHIPPED in
  Phase 04.1** — the claude.ai/design roundtrip delivered full warm-dark tokens
  and the `ThemeToggle`; D3 "defer dark" is superseded (see D-09 in CONTEXT and
  the updated D3 row in §2 above). Dark mode is live.
- Marketing/poster surfaces, slides, the mobile-app 393px kit as a *product*
  direction (vs responsive endpoint) — pending Q3/Q4 resolution.
- The public **brand/wordmark** decision — deferred per project naming policy.
- Replacing the **substitution-flagged** assets (Google Font stand-ins for the
  proprietary grotesque; Lucide for a licensed icon set) — when licensed assets
  exist.
