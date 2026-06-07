# Zoetrop — Key Screens Package (for redesign roundtrip)

> **Purpose.** This package captures the **current state** of Zoetrop's key
> product screens so they can be **refactored and redesigned against the brand
> design system** by claude.ai/design. It is the *input* to a design roundtrip.
> The output (revised screens) flows back into the codebase via the adoption
> plan in [`docs/DESIGN-SYSTEM-ADOPTION.md`](../../../DESIGN-SYSTEM-ADOPTION.md).

This is a **derived design** exercise: the brand design system itself was
extrapolated from a single brand board. These screens are the real, shipped M0
product (an n=1 wellness instrument) that the brand now needs to be applied to.

---

## How to use this package with claude.ai/design

1. **Read the brand first.** The full design system lives one level up at
   [`../../`](../../) — start with [`../../readme.md`](../../readme.md) (brand,
   voice, visual foundations, iconography) and
   [`../../SKILL.md`](../../SKILL.md). Tokens are in
   [`../../tokens/`](../../tokens/), components in
   [`../../components/`](../../components/), the live UI kit in
   [`../../ui_kits/app/`](../../ui_kits/app/).
2. **Read the global brief.** [`REDESIGN-BRIEF.md`](./REDESIGN-BRIEF.md) — the
   redesign goals, the brand-violation checklist that applies to *every* screen,
   the unresolved design questions (the 9-category → 3-family color problem, the
   4-status palette, dark mode), and the deliverables expected back.
3. **Work screen by screen.** Each folder in [`screens/`](./screens/) has a
   `brief.md` (intent, data, structure, screen-specific violations, redesign
   goals) and the current-state screenshots.
4. **Return** redesigned screens (desktop-primary, mobile-responsive) honoring
   the brand. See "Deliverables" in the global brief.

---

## Screens in this package

Eight **archetypes** — chosen so the redesign covers every UI pattern the
product needs now and through the M1 roadmap (lab-ingest review UI, reports),
not just the home page.

| # | Screen | Route | Archetype | Informs (roadmap) |
|---|--------|-------|-----------|-------------------|
| 01 | Dashboard | `/` | Overview / hero + tiles + mixed cards | all |
| 02 | Metrics overview | `/metrics` | Filterable grouped list | Phase 4 |
| 03 | Metric category | `/metrics/:category` | List + left section nav | Phase 4 |
| 04 | Metric detail | `/metrics/:category/:metricId` | Detail + **trend chart** + tables | Phase 4, 6 |
| 05 | Protocol overview | `/protocol` | Tabbed section + stat tiles + timeline | Phase 4 |
| 06 | Cessation tracker | `/protocol/cessation` | **Signature** progress / phase timeline | Phase 4 |
| 07 | Insights · correlations | `/insights/correlations` | **Data table** + filters + stat row | Phase 6 |
| 08 | Import · WHOOP | `/import/whoop` | **Form / upload** + result state | Phase 5 (lab ingest) |

## Capture method

- **Viewports:** **desktop is primary** (1440px wide) with a **mobile**
  companion (393px). The brand DS is app-first (ships a 393px mobile kit) but
  the shipped product is a desktop web dashboard — so both are framed and the
  redesign should resolve a responsive system. (See the mobile shots: the
  current header does **not** collapse — nav overflows to ~449px.)
- **Theme:** captured in **light** mode (forced), matching the brand's
  warm-light direction. Dark mode is deferred — see the global brief.
- **Rendering:** real current data (the M0 static dataset), retina (2×),
  full-page. Charts (Recharts) and progress animations are fully settled.
- Tooling: headless Chrome via puppeteer-core against `localhost:5173`.

## Important context

- **Name.** Screens say **"Zoetrop"** (no *e*); the brand DS wordmark is
  **"zoetrope."** (with *e*, trailing period). `Zoetrop` is the internal
  codename; the public brand is deferred. **Do not** treat the wordmark as
  settled — flag, don't relitigate. See the global brief.
- **Domain mismatch.** The brand's three metric *families* (Energy/Vital/Focus
  = movement/heart/mind) were designed for an activity app. Zoetrop's real
  domain is **clinical biomarkers** across **9 lab categories** + autonomic.
  Reconciling these is the single most important design decision — see the
  global brief's "Open design questions."
