# Phase 04.1 — Design System Adoption (inserted)

**Status:** Not planned — **gated on a claude.ai/design roundtrip.**

Do not plan this phase until revised screens + resolved design questions return
from the roundtrip. Then:

1. `/gsd:ui-phase 04.1` — produce the binding `UI-SPEC.md` from the brand DS +
   revised screens + the package below.
2. `/gsd:plan-phase 04.1` — break into plans.

## Inputs (already prepared)

- **Brand design system:** `docs/design-system/` (tokens, components, guidelines,
  assets, UI kit, voice).
- **Screens package (roundtrip input):**
  `docs/design-system/uploads/screens-package/` — 8 archetype screens with
  current-state desktop + mobile screenshots and redesign briefs, plus
  `REDESIGN-BRIEF.md` (global violation checklist + open design questions).
- **Adoption strategy / decisions / integration architecture:**
  `docs/DESIGN-SYSTEM-ADOPTION.md`.

## Scope (see ROADMAP.md Phase 04.1 for full success criteria)

Bridge brand tokens into Tailwind `@theme`, swap fonts, port signature
components to typed TSX (+ DataTable / SegmentedPhaseBar / UploadDropzone),
retrofit the M0 screens in-brand, resolve the 9-category→3-family color system +
the 4-status palette, ship a responsive nav, and commit `UI-SPEC.md` for
Phases 5–6 to build against.

**Requirement:** UI-01.
