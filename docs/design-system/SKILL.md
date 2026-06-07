---
name: zoetrope-design
description: Use this skill to generate well-branded interfaces and assets for Zoetrope, a health & wellness tracking product, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Zoetrope Design System

Read the **README.md** file within this skill first — it holds the brand context,
content fundamentals, visual foundations, iconography, and a full file index.
Then explore the other files as needed.

## What's here
- `styles.css` — global entry point (link this one file). It `@import`s all tokens + fonts.
- `tokens/` — colors, typography, spacing/radius/shadow/motion, base helpers.
- `assets/` — logo/motion mark, glyph, and brand patterns (SVG).
- `guidelines/` — foundation specimen cards (Colors / Type / Spacing / Brand).
- `components/` — reusable React primitives (Button, IconButton, Badge, Avatar,
  Card, Input, Switch, SegmentedControl, MetricRing, ProgressBar, Stat).
- `ui_kits/app/` — the Zoetrope mobile app, a full interactive recreation.
- `slides/` — branded sample slide templates (1280×720).

## How to work
- **Visual artifacts** (slides, mocks, throwaway prototypes): copy the assets you
  need into your output folder and build static HTML files that link `styles.css`.
  Reference the brand colors, type, motifs and the examples in `guidelines/`.
- **Production code**: copy the tokens + components and read the rules here to
  become an expert in designing with this brand. Components read styling from the
  CSS custom properties — ship `styles.css` and use the documented props.

## Key rules (see README for the full set)
- **Palette**: Energy (amber), Vital (teal), Focus (periwinkle) over warm Paper /
  Mist / Ink neutrals. Focus periwinkle is the default action color. **No gradients.**
- **Type**: Space Grotesk (display) · Hanken Grotesk (body) · Space Mono (data,
  UPPERCASE micro-labels). Numbers use tabular figures and lead with the figure.
- **Voice**: calm, precise, encouraging. Address the user as "you". Sentence case
  everywhere except mono micro-labels. **No emoji.**
- **Shape**: large-radius "frame" cards, pill controls, soft warm ink-tinted shadows.
- **Icons**: Lucide (stroke, ~1.75px). Brand glyphs live in `assets/`.
- **Motion**: brisk, eased, never bouncy; metric rings sweep on mount.

If invoked without other guidance, ask what the user wants to build, ask a few
focused questions, then act as an expert designer who outputs HTML artifacts
**or** production code, depending on the need.
