# 06 · Cessation tracker

- **Route:** `/protocol/cessation` (`app/routes/protocol/cessation.tsx`)
- **Archetype:** **Signature** progress / multi-phase timeline
- **Screenshots:** `desktop.png` · `mobile.png`
- **Informs:** Phase 4 — and it's the **best showcase for the brand**

## Purpose
Track the FAAH-informed 150-day cessation protocol through four phases. The most
emotionally meaningful, identity-defining screen in the product — and the one
where the brand's frame/sequence metaphor fits most naturally.

## Data shown
- "Day 167" + current phase + days-in; Target 150 days.
- **Overall progress bar** (gradient) with phase markers.
- **4 key-stat tiles:** Current Day · Days Remaining · Until Next Phase · %
  Complete.
- **4 phase cards** (Acute · Stabilization · Clearing · Optimization): status
  (completed / current / upcoming), per-phase progress bar, day range, focus,
  description.
- **Timeline:** Started · Current Phase End · Projected Completion.
- Notes; "Why 150 Days?" info card.
- (Also has an **empty state**: "No Active Cessation Protocol" + phase overview.)

## Current structure
Big progress card → 4 stat tiles → 2-col phase cards → timeline → notes → blue
info card. Status colors: completed=green, current=blue (+ring), upcoming=grey.

## Screen-specific violations
- **Gradient** main progress bar → V3.
- Current phase = **blue** ring/fill, info card = **blue** → V4.
- completed=green / upcoming=grey raw → V8/V5.

## Redesign goals — lean into the brand here
- **MetricRing** for "% Complete" — the brand's signature sweep, sized large.
- Overall progress → **segmented 4-phase bar** (the literal "sequence of frames"
  metaphor), current segment emphasized with the **Ink outline** ("blueprint"
  accent), **no gradient**. Share this component with screens 01 + 05.
- Phase cards → metric-family **tones** to distinguish phases (e.g. acute→focus,
  …→energy/vital), current card carries the Ink 2px outline; completed gets a
  Vital check; upcoming muted on Mist.
- "Why 150 Days?" → brand info card (`--focus-50` tone), not blue.
- **Empty state** copy → brand voice (§4): calm, "you", frame metaphor.
- Stat tiles → brand `Stat`, tabular Space Grotesk numbers.
