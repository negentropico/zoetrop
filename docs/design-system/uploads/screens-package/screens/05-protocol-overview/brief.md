# 05 · Protocol overview

- **Route:** `/protocol` (`app/routes/protocol/index.tsx`, wrapped by
  `app/routes/protocol/layout.tsx`)
- **Archetype:** Tabbed section landing + stat tiles + timeline + two-column lists
- **Screenshots:** `desktop.png` · `mobile.png`
- **Informs:** Phase 4

## Purpose
The protocol section's home: current protocol version, supplement load, where
cessation stands, and quick entry into version history and supplements.

## Data shown
- **Section sub-nav tabs:** Overview · Versions · Supplements · Cessation ·
  Compare (the Protocol layout's tab strip).
- **4 stat tiles:** Current Protocol (P6, 7 versions) · Active Supplements (15,
  Tier breakdown) · Cessation Progress (Day 167, phase) · Latest Milestone.
- **FAAH Cessation Timeline:** gradient bar + 4 phase markers + labels +
  "167 / 150 days".
- **Version History** list (P6 "Current" badge … P2, dates).
- **Supplements by Tier:** Tier 1 / Tier 2 / Tier 3 / As Needed (colored labels
  + counts).

## Current structure
Tab strip (underline-active) → 4-col stat grid → timeline card → 2-col (version
history | tiers). Cool-grey frame cards, blue links, gradient timeline.

## Screen-specific violations
- **Gradient** FAAH timeline bar → V3 (reuse the segmented phase bar from the
  cessation redesign — these two timelines should share one component).
- Tier labels use raw color classes (`info.color`) → V8; map to Badge tones.
- Tab strip + "View all" / "Manage" in blue → V4.
- Stat tiles are bespoke divs → use the brand **Stat** component.

## Redesign goals
- Section tabs → brand **SegmentedControl**, or an underline nav in periwinkle.
- Stat tiles → brand `Stat`; numbers tabular + Space Grotesk.
- Timeline → the shared **segmented 4-phase bar** (no gradient), consistent with
  the cessation screen (06) and the dashboard.
- Supplement tiers → brand `Badge` tones (consider mapping Tier 1/2/3 to a
  brand ramp; "As Needed" neutral).
- Version history rows → frame list; "Current" → brand success Badge.
