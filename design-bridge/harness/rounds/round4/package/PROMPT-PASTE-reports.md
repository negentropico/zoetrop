# Zoetrop · LINE-reports — design the Reports surface in the calm-instrument language

> **Paste this whole message into claude.ai/design** and attach the files in "Attach" below. This is a
> *refinement line* on Zoetrop's **frozen** design foundation — you are applying the existing language to
> one surface, not inventing a new language. Everything you need is inlined here; the attachments are the
> exact token layer + reference.

## What Zoetrop is

A calm, precise health instrument: it consolidates biometrics, blood work, genetics, and a supplement
protocol for one person, and produces **confidence-graded protocol reports**. The design heart is
**confidence display under genuine uncertainty** — and the Reports surface is where that lives.

## Your job (one artifact, three views)

Design the **Reports** surface — currently functional but never given the design pass the rest of the app
got. Three views:

1. **Reports list** (`/reports`) — every report for the subject, newest first; a calm empty state that
   invites generating the first one.
2. **Generate** (`/reports/generate`) — a quiet, role-gated flow that produces a **frozen snapshot**
   report (no AI in this path; it composes existing graded findings). Range/scope selection → preview →
   generate.
3. **Report detail** (`/reports/:reportId`) — the frozen report itself: recommendations **grouped by body
   system**, each carrying an evidence tier and (where it maps to a marker) a health status; flagged
   actionable items surfaced in the body; a full-panel appendix behind a disclosure.

## The ONE hard problem — two judgment axes that must never collide

A report carries two distinct kinds of judgment. Keep them visually separate and unmistakable:

- **Evidence tier — K1–K4** (how strong the *published evidence* is for a finding→action link):
  **K1 Established · K2 Probable · K3 Emerging · K4 Speculative.** Render in **neutral + focus
  periwinkle**, as a mono pill — *never* in the status colours.
- **Health status — the four canonical colours:** **optimal · borderline · deficient · excess** (the
  reading of a marker). This is the *only* place colour carries judgment.

A reader must instantly tell "how sure are we?" (K, quiet) from "how is this marker?" (status, colour).
Don't let the two colour systems compete. A report should read as something you'd **trust** — sober,
legible, frozen.

## The frozen language you are applying (do NOT change any of this)

**Posture:** every screen reads as one calm instrument — neutral structure, ink data, status carried only
by the four status colours, at a **compact, data-dense** rhythm. No gradients. No emoji. Sentence case
except mono micro-labels. Voice: calm, precise, encouraging; address the reader as "you".

**Colour:** brand families are **Energy** (amber), **Vital** (teal), **Focus** (periwinkle — the default
action colour). Warm **Paper / Mist / Ink** neutrals (never blue-grey); warm-dark in dark mode. Status
tokens: `--optimal` (vital/green) · `--borderline` (energy/amber) · `--deficient` (red) · `--excess`
(bronze), each with a soft `-bg`. K-tier colours: K1 ink on `--n-100`, K2 `--focus-500` on `--focus-50`,
K3 `--n-600` on sunken, K4 `--n-500` on `--n-100`.

**Type:** Space Grotesk (display) · Hanken Grotesk (body) · **Space Mono** (data: figures, IDs, dates,
UPPERCASE micro-labels). Tabular figures; lead with the figure; units appear **once per surface**, never
repeated on every row.

**Shape & surface:** large-radius **"frame" cards**, pill controls, soft warm ink-tinted shadows.
Elevation ladder: nav (lowest) < canvas (paper) < cards (surface). Use the existing class vocabulary —
**frame card** (`zt-card`), **stat-strip** (`zt-stat-strip` / `zt-stat`), **pill** (`zt-pill`). New
report-only structure gets **new `zt-report-*` classes** — never reuse a claimed word.

**Charts (if a report embeds a trend):** the **"frames"** idiom — ringed ink dot + hairline frame tick to
the baseline; thin connecting line; optimal band as a quiet vital tint (50%) with a mono band tag;
**status never colours the trend line**, only bands/dots/badges; one app-wide **frame-card tooltip**;
milestones not dates on the x-axis.

**Motion:** brisk, eased, never bouncy; ring sweeps once on mount; **reduced-motion collapses to instant**
(global rule). Everything must render with **JS off**.

## Must hold

- **Both themes:** light and dark must both work via the existing `html[data-theme="dark"]` variable
  remap — **no per-component dark styling**, no `dark:` forks. Use the tokens; dark follows automatically.
- **Real content only** — use realistic graded recommendations grouped by body system (e.g. Methylation,
  Detoxification, Cardiovascular, Neurotransmitters), realistic K-tiers and statuses. No lorem.
- **Token freeze** — reuse the existing tokens. If something is structurally unavoidable, add a new token
  **in an existing family** and log it. No new colour / radius / duration / font / size otherwise.
- **One artifact**, variations as labelled frames — never forked files.

## Decisions this line must close

1. How **K-tier** and **status** sit together on a recommendation row without colour collision (the core).
2. The **report-detail** layout: body-system grouping, the recommendation block, flagged-actionable
   treatment, the appendix disclosure — as a calm frozen document.
3. The **reports list** row (date · scope · headline counts) + the calm empty state.
4. The **generate** flow shape (scope/range pick → preview → generate), quiet and reassuring.
5. Mobile (≤760px) behaviour for the detail document.

## Attach (drag these into the chat)

- `current-state/app.css` — the **token + class layer** (the foundation; your source of truth for values).
- From the repo's `docs/design-system/`: `guidelines/color-families.html`, `color-status.html`,
  `type-data.html`, `components/data/data.card.html` (the brand specimen cards — the visual reference).
- The current report code for context (optional but useful): `routes/_app/reports/detail.tsx`,
  `index.tsx`, `components/ui/KGradeBadge.tsx`, `components/ui/RecommendationBlock.tsx`,
  `components/ui/StatusBadge.tsx`, `types/report.ts`.

## Return (how to send it back — see `RETURN-SPEC.md`)

Return **loose source files** + ONE **new-rules-only stylesheet** (`new.css`) containing only rules /
custom-properties **not already in `current-state/app.css`** (no redefinitions; new classes namespaced
`zt-report-*`), plus a **`CHANGES.md`**. In `CHANGES.md`, per view: what changed and why; every new token
(name · value · family); any new icon names. Then report, for the decision ledger:

- **(a) Selected direction** · **(b) Rejected + why** · **(c) Token delta** (names + values) ·
  **(d) AA-contrast notes** (pairings + ratios, both themes) · **(e) Reduced-motion / JS-off** ·
  **(f) Next-line constraints.**
