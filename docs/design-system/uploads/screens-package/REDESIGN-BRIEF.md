# Global Redesign Brief

Applies to **every** screen in this package. Per-screen `brief.md` files add
screen-specific notes on top of this.

The job: take the shipped Zoetrop screens (cool-grey/blue Tailwind dashboard,
Inter, emoji, gradient bars) and **re-express them in the Zoetrope brand** —
warm Paper, the Energy/Vital/Focus palette, Space Grotesk / Hanken / Space Mono
type, frame cards, pill controls, soft warm shadows, Lucide icons, and the calm
"quiet coach" voice. Keep the information architecture and data; change the skin,
the type, the color semantics, the iconography, the copy tone, and the
responsive behavior.

---

## 1. Brand-violation checklist (fix on every screen)

Each of these is present in the current screenshots and contradicts
[`../../readme.md`](../../readme.md):

| # | Current (violation) | Brand rule | Redesign |
|---|---------------------|-----------|----------|
| V1 | **Inter** font everywhere | Space Grotesk (display) · Hanken Grotesk (body) · Space Mono (data) | Headings/readouts → Space Grotesk; body/UI → Hanken; units/labels/timestamps → Space Mono UPPERCASE w/ `0.12em` tracking |
| V2 | **Emoji** category icons (💊💎🔥⚡🧪💓🏋️🩸🧬) | "No emoji"; Lucide stroke icons | Replace with Lucide (mapping in §3) |
| V3 | **Gradient** progress bars (`from-red-500 via-yellow-500 to-green-500`) on dashboard, cessation, protocol | "No gradients in product UI" | Solid fills / **segmented** phase bars using status or metric-family tokens |
| V4 | **Blue** accent (`blue-600`) for links/active/CTAs | Focus **periwinkle** `#8070FF` is the default action color | All actions/links/active states → periwinkle (white text on it) |
| V5 | **Cool grey** neutrals (`gray-50…gray-950`), white page bg | Warm **Paper** `#F5F2F0` bg; white reserved for raised cards; warm Mist/Ink neutrals | Swap the whole neutral ramp to the warm tokens |
| V6 | **Hard/blue** shadows & flat `border` cards, `rounded-lg` (8px) | Large-radius "frame" cards (`--radius-xl` 28px), 1px warm hairline, soft **warm ink-tinted** shadow | Re-shape cards to the frame style |
| V7 | **Title/var casing**, generic copy ("Need Attention", "Comprehensive wellness tracking…") | Sentence case; ALL-CAPS only for mono micro-labels; calm "you"-voice; numbers-as-heroes | Rewrite copy (§4) |
| V8 | Status colors `green/yellow/red/orange-500` raw Tailwind | Brand status tokens (`--success` teal, `--warning` amber, `--danger` `#e5484d`, + a defined 4th) | Map the 4 statuses to brand tokens (§3) |
| V9 | **No mobile nav** — header nav overflows (~449px), no collapse | App-first brand; touch targets ≥44px | Responsive nav (collapse / bottom-tab / drawer) — propose a system |
| V10 | Numbers in Inter, not tabular | Tabular numerals everywhere numbers update | `font-variant-numeric: tabular-nums` on all readouts (`.zt-tnum`) |

---

## 2. What to preserve

- **Information architecture** and route structure (16 routes; 4 sections:
  Metrics, Protocol, Insights, Import).
- **The data and every number** shown — this is a real dataset.
- **Chart semantics** on metric detail (actual vs target vs optimal/reference
  bands) — restyle to brand colors, keep the meaning.
- **Density** appropriate to a practitioner instrument — this is a serious
  clinical tool, not a consumer toy. Calm and precise, per the voice.

---

## 3. Open design questions (please resolve in the roundtrip)

These are the genuinely hard, unsettled decisions. **A recommended direction is
given; treat it as a starting point, not a mandate.**

### Q1 — The 9-category → 3-family color problem ⭐ (most important)
The brand ships **three metric families**: Energy (amber, activity/movement),
Vital (teal, heart/recovery/breath), Focus (periwinkle, mind/sleep/calm). But
Zoetrop's real domain is **nine clinical categories**, each currently a
different saturated Tailwind color:

| Category | Current color | Domain |
|----------|---------------|--------|
| Vitamins | amber | blood (B / fat-soluble) |
| Minerals | slate | blood (Zn/Mg/Fe/trace) |
| Inflammatory | red | hs-CRP, homocysteine |
| Metabolic | yellow | glucose, kidney, electrolytes |
| Hormones | purple | sex, thyroid, cortisol |
| Autonomic | pink | HRV, RHR, sleep (WHOOP) |
| Body Composition | blue | DEXA, lean mass |
| Lipids | orange | cholesterol, triglycerides |
| Hematology | rose | CBC, WBC, hemoglobin |

Nine saturated category colors fight the brand's restrained 3-family system.
**Recommended direction:** *demote* per-category color — drive the UI primarily
by **status** (the 4 statuses below) in brand tokens, and use category identity
through **Lucide icon + a single neutral/ink treatment** rather than 9 hues.
Reserve the three brand families for the **Autonomic/activity** domain where
they semantically belong (HRV→Vital, sleep→Focus, strain/calories→Energy).
*Alternative if categories must stay colorful:* derive **9 brand-coherent
hues** from the warm palette and document them as a category ramp. **Please pick
and define one.**

### Q1b — Emoji → Lucide mapping (proposed, refine as needed)
| Category | Emoji | Proposed Lucide |
|----------|-------|-----------------|
| Vitamins | 💊 | `pill` |
| Minerals | 💎 | `gem` |
| Inflammatory | 🔥 | `flame` |
| Metabolic | ⚡ | `zap` |
| Hormones | 🧪 | `flask-conical` |
| Autonomic | 💓 | `heart-pulse` |
| Body Composition | 🏋️ | `dumbbell` |
| Lipids | 🩸 | `droplet` |
| Hematology | 🧬 | `dna` |

### Q2 — The 4-status palette
The app has **four** statuses; the brand defines roughly three status tokens.
Map and **define the 4th**:

| Status | Meaning | Proposed brand token |
|--------|---------|----------------------|
| optimal | within optimal range | `--success` (Vital teal `#0aa183`) |
| borderline | in reference, outside optimal | `--warning` (Energy amber `#f0ac1f`) |
| deficient | below reference | `--danger` (`#e5484d`) |
| excess | above reference | **needs a 4th** — propose a distinct warm hue (e.g. a deeper Energy `--energy-500 #c98910`) clearly separable from borderline |

Status must remain **colorblind-distinguishable** (don't rely on hue alone — the
brand's mono labels + icons help here).

### Q3 — Dark mode (deferred, but design light-first to allow it later)
The brand DS ships **no dark tokens**; the product currently has dark mode. The
decision: **light-first now, dark deferred.** Please design the light theme
faithfully, but **don't bake in choices that make a future warm-dark theme
impossible** (e.g., keep color use token-driven, avoid hardcoded light-only
values in component logic). A warm-dark palette (Ink-paper inverted) is a later
task.

### Q4 — Desktop vs mobile system
Desktop is the current product reality; the brand is app-first. Please propose a
**responsive system** (not just two fixed layouts): how the non-collapsing
header (V9) becomes a real nav at mobile, how the dense tables (correlations) and
multi-column grids reflow, and whether the 393px frame is a genuine target or a
responsive endpoint.

### Q5 — Wordmark
Screens show **"Zoetrop"**; brand shows **"zoetrope."** `Zoetrop` is the internal
codename; the public brand is **deferred** (do not relitigate naming). Use a
neutral, easily-swappable wordmark treatment; **flag** the spelling rather than
hard-committing either way.

---

## 4. Voice & copy (apply the brand's content rules)

Per [`../../readme.md`](../../readme.md) "Content Fundamentals": calm, precise,
quietly encouraging; address the user as "you"; sentence case; ALL-CAPS only for
mono micro-labels; numbers are heroes (lead with the figure + unit, tabular);
no emoji; at most one "!".

Concrete rewrites to apply where this copy appears:
- "Comprehensive wellness tracking across 9 metric categories" → calmer, e.g.
  *"Your signals, one frame at a time. 9 categories, tracked."*
- "Need Attention" tile → *"Need a look"* / *"Flagged"* (no alarm tone).
- Section labels (e.g. "Metric Categories", "Top Correlations") may become
  **mono ALL-CAPS eyebrows** (`zt-eyebrow`) above the content.
- Empty states (e.g. cessation "No Active Cessation Protocol") → brand voice:
  *"Nothing logged yet. Your first frame starts when you begin."*
- Status words (optimal/borderline/deficient/excess) stay precise; render as
  mono micro-labels or brand badges.

---

## 5. Deliverables expected back from the roundtrip

1. **Redesigned screens** — desktop-primary + mobile, for the 8 archetypes, in
   the brand. Static mockups or HTML linking [`../../styles.css`](../../styles.css)
   both fine (HTML preferred — it round-trips into code faster).
2. **Resolutions** to Q1–Q5 above, written down (even one line each).
3. **A category color/icon spec** (the output of Q1/Q1b) — the single source of
   truth for how 9 categories render in-brand.
4. **A responsive/nav pattern** (Q4) shown on at least the dashboard + one dense
   screen (correlations table).
5. Any **new components** implied that aren't yet in
   [`../../components/`](../../components/) (e.g. a data table, a tabbed section
   nav, a stat tile, a segmented phase bar, a file-upload dropzone) — noted so
   they can be added to the system.

The brand already provides: Button, IconButton, Badge, Avatar, Card, Input,
Switch, SegmentedControl, **MetricRing**, ProgressBar, Stat. Prefer composing
these; the **MetricRing** in particular is the brand's signature and is a strong
fit for status/recovery/cessation displays.
