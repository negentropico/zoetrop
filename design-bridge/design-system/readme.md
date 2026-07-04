# Zoetrop — Design System

> **Every frame of you.**
> Zoetrop is a health & wellness tracking platform. It stitches small daily
> signals — movement, heart, sleep, breath — into a moving picture of how you
> actually feel over time. The name is literal: a *zoetrop* is the pre-cinema
> device that turns a sequence of still frames into motion. Your wellness is the
> sequence; Zoetrop spins it into something you can read.

This repository **is** the design system. An automated compiler reads it, bundles
the components into a runtime library (`window.ZoetropDesignSystem_48aebc`), and
indexes the tokens. Consumers link one file: **`styles.css`**.

---

## Provenance & sources

This system was **extrapolated and modeled** from a single supplied brand board
(`_archive/uploads/colors.jpg`) — originally a colorway + identity study for a developer
platform ("source.dev"). Zoetrop re-targets that visual language for health &
wellness. What was carried across:

- **The five-color palette** — warm grey, amber, teal, periwinkle, charcoal —
  re-mapped from DevOps stages (Cached/Stage/Deploy/Compile/Terminal) to wellness
  metric families (Mist / Energy / Vital / Focus / Ink).
- **Geometric-grotesque typography** with mono captions.
- **Mathematical motifs** — Fibonacci sequences, the circle + half-circle "frame"
  glyph, motion-blur frame sequences, dot grids — which map perfectly onto the
  zoetrop/animation concept.

No codebase or Figma file was provided; everything below is derived design.

---

## Brand at a glance

| | |
|---|---|
| **Name** | Zoetrop |
| **Category** | Health & wellness tracking (app-first) |
| **Wordmark** | `zoetrop.` lowercase, the period set in a metric accent |
| **Voice** | Calm, precise, encouraging — a quiet coach, never a drill sergeant |
| **Metric families** | Energy (amber) · Vital (teal) · Focus (periwinkle) |
| **Neutrals** | Mist (warm grey) · Ink (charcoal) on warm Paper |
| **Type** | Space Grotesk (display) · Hanken Grotesk (text) · Space Mono (data) |

---

## CONTENT FUNDAMENTALS

How Zoetrop writes.

- **Person & address.** Speak to the user as **"you"**; the product refers to
  itself rarely and never as "I". Data belongs to the user: *"your week," "your
  resting heart rate,"* not *"the user's."*
- **Tone.** Calm, plain, quietly encouraging. We state the signal and let the
  user decide. We never alarm, shame, or hype. *"You're 1,200 steps from your
  move goal"* — not *"You're falling behind!"*
- **Casing.** Sentence case for everything readable (headings, buttons, body).
  **ALL-CAPS only for mono micro-labels** (eyebrows, tab captions, metric names)
  with wide tracking. Never title-case headings.
- **Numbers are the heroes.** Lead with the figure, qualify after. Always tabular
  numerals; always a unit. *"6,418 steps," "58 bpm," "7:42 asleep."*
- **Brevity.** Labels are 1–2 words. Card titles are a short noun phrase.
  Encouragement is one sentence, no exclamation pile-ups (at most one "!").
- **Time is sequential.** Lean into the frame/sequence metaphor: *"today's frame,"
  "this week in motion," "your last 7 days."*
- **No emoji.** The brand expresses warmth through color and geometry, not emoji.
  Unicode is used only for true symbols (·, →, ↑↓ trend arrows).
- **Vocabulary.** Prefer *move / rest / recover / breathe / wind down* over
  clinical terms. Say *"resting heart rate,"* not *"RHR"* in body copy (mono
  readouts may abbreviate: `RHR`, `bpm`, `hrs`).

**Examples**
- Hero: *"Your week, one frame at a time."*
- Empty state: *"Nothing logged yet today. Your first frame starts when you move."*
- Nudge: *"You usually wind down around now. Lights low?"*
- Streak: *"6 days in motion."*

---

## VISUAL FOUNDATIONS

The complete look & feel. See the **Design System** tab for live specimen cards.

### Color
- **Palette:** three metric families (Energy `#FFC53D` amber, Vital `#11C29B`
  teal, Focus `#8070FF` periwinkle) over a **warm** neutral system — Paper
  `#F5F2F0` backgrounds, Mist `#DCD1D5` surfaces-grey, Ink `#272324` text.
- **Warmth rule:** neutrals are warm-tinted, **never** blue-grey or clinical.
  Backgrounds are paper, not white; white is reserved for raised cards.
- **Accent:** periwinkle "Focus" is the default brand action color. Amber and
  teal are light → they carry **dark (Ink) text**; periwinkle is dark → it carries
  **white text**.
- **Metric tints:** each family has a `-50` wash used for soft card fills and
  badge backgrounds.

### Type
- **Space Grotesk** for display, headings, and large metric readouts — geometric,
  technical, slightly mechanical (suits the math motif). Weight 500 for most
  headings, 700 for posters.
- **Hanken Grotesk** for body and UI text — a neutral grotesque, weights 300–800.
- **Space Mono** for data context: eyebrows, timestamps, units, metric names —
  always UPPERCASE with `0.12em` tracking when used as a label.
- **Tabular numerals** everywhere numbers update (`.zt-tnum` / `font-variant-numeric`).
- **Display sizing** runs large and tight (`-0.03em` tracking on hero sizes).

### Spacing & layout
- Spacing scale is **Fibonacci-derived** (2, 4, 8, 13, 21, 34, 55, 89) — a literal
  nod to the brand's mathematical motif — with even-step aliases for everyday UI
  rhythm.
- Mobile app frame is **393px** wide. Generous outer margins; content breathes.
- Stepped / notched poster compositions (offset blocks) are a signature layout
  move borrowed from the source board — use sparingly for marketing surfaces.

### Shape, border, elevation
- **Cards** are large-radius "frames": `--radius-xl` (28px), a hairline
  `--border` (1px warm grey), and a **soft warm shadow** (`--shadow-sm`/`md`).
  White surface on paper background.
- **Radii:** controls are mostly **pills** (`--radius-pill`); cards use 20–36px;
  squircle icon buttons use `--radius-md`.
- **Shadows are warm** — tinted with the Ink hue, low-contrast, light from above.
  Never pure-black, never harsh. Elevation ladder xs → xl.
- **Borders** are 1px hairlines; emphasis uses 1.5px; the Ink outline (2px) is a
  deliberate "blueprint" accent for marketing.

### Backgrounds & texture
- Default background is flat warm **Paper**. Optional faint **dot-grain**
  (`.zt-grain`) adds paper texture on hero/marketing surfaces.
- **No photographic backgrounds** in core UI. Brand **patterns** (Fibonacci
  frames, half-circle sequence, dot grid) appear as flat fills on marketing
  blocks and section headers — geometric, monochrome, confident.
- **No gradients** in product UI. (A subtle metric-tint wash is the only "fill"
  beyond solids.) Avoid the AI-slop purple-blue gradient entirely.

### Motion
- **Frame-by-frame feel:** brisk, eased, **never bouncy**. `--ease-out` for most
  transitions; `--ease-frame` (stepped) for sequence/loading moments.
- **Metric rings** sweep on mount over `--dur-ring` (900ms).
- **Hover:** cards lift `translateY(-2px)` + deepen shadow; buttons step the fill
  one shade. **Press:** scale to ~0.97 (buttons) / 0.92 (icon buttons).
- Respect `prefers-reduced-motion` (handled globally in `base.css`).

### Imagery
- When photography is used, it skews **warm, natural light, calm** — morning runs,
  still mornings, breath. Cool/clinical hospital imagery is off-brand. Keep it
  human and quiet, never stock-fitness-aggressive.

---

## ICONOGRAPHY

- **System:** Zoetrop uses **[Lucide](https://lucide.dev)** — a clean,
  open-source 24px stroke icon set whose **~1.75px geometric stroke** matches the
  grotesque type and the brand's precise, mathematical character. This is a
  **documented substitution**: no proprietary icon set was supplied. Swap for a
  licensed set later if desired.
- **Delivery:** loaded from CDN (`unpkg.com/lucide`) in cards and kits via
  `<i data-lucide="name"></i>` + `lucide.createIcons()`. Components stay
  icon-agnostic — pass the icon node in as `children` / `iconLeft` / `iconRight`.
- **Weight & size:** stroke icons only, never filled-and-stroked mixes. UI icons
  18–24px; nav icons 24px; touch target ≥ 44px.
- **Brand marks** (SVG, in `assets/`): the **golden spiral** is the primary mark
  — a logarithmic (φ) spiral anchored by an eye dot, expressing growth and the
  unfolding sequence of days. It scales to 24px. Alternates are explored on the
  Logo card (aperture, drum, orbit, pulse-ring). The motif **patterns** are
  authored brand assets, not icons — don't substitute.
- **No emoji.** Trend direction uses real arrows (↑ ↓) or Lucide
  `trending-up`/`trending-down`. The interpunct `·` separates meta.

---

## Index / manifest

**Root**
- `styles.css` — global entry (imports only). Consumers link this.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills-compatible front matter for downloadable use.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`

**`assets/`** — `mark-spiral.svg` (primary, + `-light`, `-focus`) and alternate
marks (`mark-aperture`, `mark-drum`, `mark-orbit`, `mark-pulsering`); motif
system built on the spiral & phyllotaxis families: `pattern-spiral`,
`pattern-spiral-dots`, `pattern-spiral-twin`, `pattern-spiral-arms`,
`pattern-phyllotaxis`, `pattern-phyllotaxis-dense`

**`guidelines/`** — foundation specimen cards (Colors, Type, Spacing, Brand)

**`components/`** — reusable React primitives (namespace `ZoetropDesignSystem_48aebc`)
- `core/` — Button, IconButton, Badge, Avatar, Card
- `forms/` — Input, Switch, SegmentedControl
- `data/` — MetricRing, ProgressBar, Stat

**`ui_kits/`**
- `app/` — Zoetrop mobile app (Today, Activity, Sleep, Trends)

**`slides/`** — branded sample slides (Title, Metric, Quote, Comparison)

---

*Substitution flags:* display/text/data fonts are Google Fonts stand-ins for a
proprietary geometric grotesque; UI icons are Lucide. Replace with licensed
assets when available — see notes in `tokens/fonts.css` and the Iconography
section above.
