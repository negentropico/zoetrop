# 01 · Dashboard

- **Route:** `/` (`app/routes/home.tsx`)
- **Archetype:** Overview — hero heading + stat tiles + mixed insight cards + category grid
- **Screenshots:** `desktop.png` (1440w) · `mobile.png` (393w)
- **Informs:** all screens — this sets the brand language for the product

## Purpose
The at-a-glance "today's frame" of the whole instrument: how many metrics are
tracked, what needs a look, where the cessation protocol stands, the strongest
correlations and highest-impact genetic insights, and the 9 categories as entry
points.

## Data shown
- **4 stat tiles:** Metrics Tracked (38) · Need Attention (3) · Active
  Supplements (15) · Protocol Version (P6).
- **Cessation Protocol card:** "Day 167 of 150", Optimization phase, gradient
  phase bar w/ 4 phase labels.
- **Top Correlations:** 3 rows (supplement → metric, lag, signed r value).
- **Genetic Insights:** 3 variants w/ confidence badges (Confirmed/Inferred),
  "2 K3 variants need verification".
- **Metric Status:** counts (optimal 20 / borderline 15 / deficient 1 /
  excess 2) + a segmented status bar.
- **Metric Categories:** 9 cards (emoji, label, description, tracked count +
  status dots).

## Current structure
`space-y-8` column: header → 4-col stat grid → 2-col (cessation | correlations)
→ 2-col (genetics | status) → 3-col category grid. All cards are
`rounded-lg border bg-white` with cool-grey neutrals and blue links.

## Screen-specific violations (on top of the global checklist)
- **Gradient** cessation phase bar (`from-red via-yellow to-green`) → V3.
- **Emoji** on all 9 category cards → V2.
- "Comprehensive wellness tracking across 9 metric categories" + "Need
  Attention" → V7 (copy/voice).
- Blue "View all (10)" / "View details" links → V4.
- Big numbers (38, Day 167, +0.82) not tabular, in Inter → V1/V10.

## Redesign goals
- Frame cards on warm **Paper**; white only for the raised cards.
- **MetricRing** is a natural fit for cessation %-complete and/or the
  status summary (the brand's signature component).
- Cessation bar → **segmented** 4-phase bar (Acute · Stabilization · Clearing ·
  Optimization), current phase emphasized, **no gradient**.
- Section titles ("Top Correlations", "Metric Categories") → mono ALL-CAPS
  **eyebrows** (`zt-eyebrow`).
- Category cards → Lucide icons (§3 mapping), category-color treatment per the
  resolved Q1 decision.
- Correlation values → mono tabular, positive in Vital teal / negative in
  Danger (or the chosen diverging scale).
- Rewrite hero + "Need Attention" copy to the calm "you"-voice (§4).
- Numbers lead, tabular, Space Grotesk readouts.
