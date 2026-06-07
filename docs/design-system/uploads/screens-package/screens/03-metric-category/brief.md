# 03 · Metric category

- **Route:** `/metrics/:category` (`app/routes/metrics/category.tsx`, wrapped by
  `app/routes/metrics/layout.tsx`)
- **Archetype:** List within a section + **left section nav** (the Metrics
  layout sidebar)
- **Screenshots:** `desktop.png` · `mobile.png` (captured at `/metrics/autonomic`)
- **Informs:** Phase 4

## Purpose
Drill into a single category (e.g. Autonomic) while keeping the other 8
categories one click away via a persistent left nav.

## Data shown
- **Left category nav:** all 9 categories (emoji + label), active one
  highlighted ("All Categories" at top).
- Category metrics list (same row pattern as screen 02), scoped to the category.

## Current structure
Two-column: a sticky-ish left nav list + the category content. Active item gets
a grey/blue treatment. This **left-nav layout** is shared by the metric detail
screen (04) via the same `metrics/layout.tsx`.

## Screen-specific violations
- Emoji in the left nav → V2.
- Active nav item / hover in blue + grey → V4/V5.
- Nav has no mobile treatment (stacks/overflows) → V9.

## Redesign goals
- Re-skin the **left section nav** as a brand nav: Lucide icons (§3),
  **periwinkle** active state (or Ink), warm hover, mono labels optional.
- This nav pattern is reused on screen 04 — design it once, coherently.
- Define the mobile collapse for the section nav (drawer / horizontal scroll /
  select) as part of the Q4 responsive system.
- Frame-card the list; carry over the brand row styling from screen 02.
