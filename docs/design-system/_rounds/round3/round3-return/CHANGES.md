# CHANGES.md — Round 3 return (+ rounds 4–5) — **FINAL** (closing session 2026-06-12)

> **Round goal** (BRIEF TODO was unfilled; proposed and applied): *Every
> screen reads as one calm instrument — neutral structure, ink data, status
> carried only by the four canonical status colors — at a compact, data-dense
> default rhythm.*
>
> All round-3 decisions below were reviewed live and **baked** (owner pick,
> 2026-06-12): chart direction **frames**, tooltip **frame card**, grid
> **sparse**, band intensity **50%**, status mapping **standard**, density
> **compact**, ring sweep **1600ms**.

## Deliverables

| File | What |
|---|---|
| `new.css` | Additions only, plus ONE flagged token change (`--dur-ring`, see Tokens) |
| `app/lib.jsx` | Shell (unchanged, baked round 2) + primitives: PageHeader rhythm, status atoms, DataTable density |
| `app/charts.jsx` | **NEW** — the entire Part B chart language in one layer |
| `app/screens.jsx` | All Part A screens, polish pass |
| `app/main.jsx` | Router; review-only chart-state preview tweak (not for integration) |
| `app/data.js` | Sample-data extensions (see "Data" below) — design artifact only |
| `index.html` | Viewing artifact (RETURN-SPEC §5); not the deliverable of record |

## Part B — the chart language (baked)

1. **Structure is neutral.** Grids, tracks, axis labels: `--n-100/150`,
   horizontal hairlines only, never vertical gridlines. Grid is sparse
   (4 Y ticks); axis bounds round to a clean step.
2. **Data is Ink.** Trend lines, sparklines, value markers draw in `--ink`.
   Judgment is never encoded in the line itself.
3. **Status maps through canonical tokens** — `--optimal / --borderline /
   --deficient / --excess` (new in `new.css`, extending the existing status
   family; `--excess` already existed). Applied only to bands, dots, badges,
   band tags. Every component reads these tokens, so a future remap is one edit.
4. **Every reading is a "frame"** (TrendChart direction): ringed ink dot +
   hairline frame tick to the baseline; thin (1.25px) connecting line.
   Optimal band as a quiet vital tint (50% intensity) with a mono band tag;
   reference bounds as dashed neutral hairlines.
5. **Milestones, not dates.** The trend x-axis counts milestones (M1…Mn);
   draw dates live in the tooltip + history table. Two future milestones
   are **projected from the trend** (linear fit of the last ≤4 readings):
   dashed ink continuation, hollow dashed "ghost" frames, dashed baseline
   ticks, a faint neutral wash + mono PROJECTED tag over the future zone.
   Projections are never colored by status; projected values read `~`.
6. **Axis labels:** Space Mono 10px uppercase, muted; `axisLine`/`tickLine`
   off. **Units appear once** (header readout + tooltip), never on ticks.
7. **One tooltip app-wide: the frame card** — white surface, hairline border,
   `--shadow-md`; mono date eyebrow, display value + quiet unit, status dot +
   mono status word.
8. **Empty state:** dot-grain motif + mono caption + one calm sentence.
   **Loading:** three pulsing hairlines. Both in `charts.jsx` + `new.css`,
   reused by non-chart empty states (ingest review, vault).
9. **Ring/progress sweep:** once on mount, `--dur-ring` (now **1600ms**)
   `--ease-out`, 60ms stagger in grids; data updates transition at
   `--dur-base`. Reduced motion collapses to instant via the existing
   global rule.

## Part A — per screen

- **Card structure fix (all link-card grids)** — removed `height:100%`
  inside grid-item anchors (it made cards overflow their grid rows and
  swallow the gaps); anchors are now flex containers and cards `flex:1`.
  Category cards (dashboard + metrics overview) condensed to single-row
  layouts — icon/ring left, label + mono count, status dots — no dead
  bottom space.
- **Import + Ingest combined (this round, owner-directed)** — one nav
  section **Ingest**: Overview · Lab PDFs · WHOOP · Vault · Review. The two
  old overviews were pure link hubs (redundant with the sidebar); they're
  replaced by ONE surface: a Sources list (Lab PDFs / WHOOP / Vault, each
  with mapping + mono status) and the Review gate row with pending count.
  Routes unchanged — `/import/whoop` and `/import/vault` stay as aliases
  under the Ingest group; `/import` now renders the combined overview
  (recommend a redirect to `/ingest` at integration, plus the nav-tree.ts
  restructure). Import/Vault/Upload sub-screens keep their crumbs under
  Ingest.
- **Redundant-surface review (findings)** — *Insights overview* is also a
  pure link hub (two cards mirroring the sidebar); recommend folding
  headline correlation stats into it or redirecting to Correlations next
  round. *Protocol overview* earns its keep as a section dashboard (active
  version + phasing state), retained.
- **Logotype alignment** — expanded sidebar only: spiral mark optically
  centers on the nav icon column, wordmark left-aligns with row labels
  (head padding-left 19.5px, brand gap 8.5px). Collapsed rail untouched.
- **Masthead (all screens)** — condensed: eyebrow/crumb meta row now
  top-aligns with the sidebar logo row (desktop `.zn-page` padding-top
  23px); title drops to `--text-xl`; `sub` sits inline on the title
  baseline and the `right` slot shares the title row — no dead band top
  right. Meta-row-then-title-row pattern itself unchanged.
- **Card separation** — grid gaps step up to `--gap-xl` so stacked frame
  corners read as separate cards; rows inside frame cards get straight
  corners (`.zt-card .zt-mrow { border-radius: 0 }`).
- **Nav chrome** — rail + mobile topbar pushed back to a lower surface via
  NEW level tokens `--surface-low` / `--surface-low-2` (surface family):
  light `n-100`/`n-150`, dark `#0e0b0a`/`#261f1c`. Elevation ladder in both
  themes: **nav 0 < canvas 1 (paper) < cards 2 (surface)**. Popovers
  (flyout, account menu) stay raised. Interaction model untouched.
- **Dashboard** — cessation hero rebuilt: day readout leads (`zt-readout`),
  phase bar with current-day marker; category cards simplified (icon tile +
  count dots, removed redundant per-card badge + progress duplication);
  highlights lead with the figure + delta-since-last + status sparkline.
- **Metrics overview** — linear bars replaced with **MetricRing** (sweep +
  stagger showcase); optimal share as ring label.
- **Category detail** — row rhythm on the density tokens; mono values bolder,
  units a shade quieter.
- **Metric detail** — chart card leads with readout + delta; legend matches
  band treatment; ranges consolidated into ONE card (range bar with
  endpoints + optimal/reference figures); history statuses via shared
  `statusOf`.
- **Protocol overview** — version chip + cleaned copy; quick links as pills.
- **Versions** — cards merged into one frame-card list, newest first, active
  row tinted `--surface-2` + focus chip.
- **Supplements** — tier label with color dot (left-border accent dropped);
  rationale now visible under each name; mono doses.
- **Phasing (was "Cessation", renamed this round)** — screen title, nav
  child label, dashboard eyebrow and protocol links all read "Phasing";
  route + nav-tree structure unchanged (label-only — update `nav-tree.ts`
  label at integration). Phase cards replaced with a **stacked sequential
  timeline list** in one frame card: rail dots + connectors, name · days
  eyebrow · state pill per row, current phase tinted `--surface-2` with an
  ink-ring node. Phase bar with day marker unchanged above it.
- **Compare** — placeholder replaced with a working diff: base/compare pill
  pickers, +/−/~ glyph rows, dose-change highlighting, mono summary counts.
- **Correlations** — stat cards merged into one stat-strip card (hairline
  dividers); filters as `zt-pill`; **r column gets a diverging micro-bar**
  (neutral track, sign carries optimal/deficient color).
- **Genetics** — five cards merged into one frame-card list.
- **Import / Ingest sub-screens** — shared `zt-dropzone` pattern; empty
  states use the chart-empty language.
- **Settings** — chip → pill; spacing on the density tokens.
- **Landing, login, ingest consent, document viewer** — not present in the
  package prototype surface; untouched this round (flag if wanted).

## Tokens

**New (no collisions):**

| Token | Value | Family |
|---|---|---|
| `--optimal` / `--borderline` / `--deficient` | `var(--success)` / `var(--warning)` / `var(--danger)` | status names |
| `--optimal-bg` / `--borderline-bg` / `--deficient-bg` | `var(--vital-50)` / `var(--energy-50)` / `var(--danger-bg)` | status names |
| `--surface-low` | light `var(--n-100)` · dark `#0e0b0a` | `--surface-*` |
| `--surface-low-2` | light `var(--n-150)` · dark `#261f1c` | `--surface-*` |
| `--gap-card` | `1rem` | `--gap-*` |
| `--gap-section` | `1.5rem` | `--gap-*` |
| `--gap-row` | `0.5625rem` | `--gap-*` |

**Changed (ONE, deliberate — flagged in new.css):**

| Token | Was | Now | Why |
|---|---|---|---|
| `--dur-ring` | 900ms | **1600ms** | Owner pick this round — slower, calmer sweep. Integration: change the value in app.css and drop the new.css override. |

The airy/cozy density exploration was reviewed and **rejected** in favor of
compact; the `data-density` attribute mechanism was removed — the compact
values above are plain `:root` defaults.

New classes (all `zt-`): `zt-card`, `zt-card-hover`, `zt-section`,
`zt-stat-strip`, `zt-stat`, `zt-pill`, `zt-tip-frame`, `zt-chart-empty`,
`zt-chart-skel`, `zt-dropzone`, `zt-link`, `zt-hero-grid`, `zt-ranges-grid`.
One keyframe: `ztPulse`.

## Icons

New lucide names used: `arrow-right`, `timer`. (`upload-cloud`, `git-branch`
were already in use.)

## Data (design-artifact only — do not integrate)

- Extended `vitd` (8 points) and `hrv` (12 points) histories so the frames
  direction could be judged at realistic cadences.
- Added `versionStacks` (per-version supplement lists) to power the compare
  screen; doses synthesized from the protocol descriptions — replace with
  real per-version stacks at integration.

## Interaction-model decisions BAKED this round

- **TrendChart direction = "frames"**; tooltip = **frame card**, app-wide.
- **Status colors never color a trend line** — only bands/dots/badges.
- **One canonical status token set** consumed by every chart element;
  standard mapping (success/warning/danger/excess as shipped).
- **Units once per surface** (readout + tooltip), never on axis ticks.
- **Ring sweep is mount-only at 1600ms**; data changes never re-sweep.
- **Compact density is the product default** (gap-card/section/row above).
- Compare screen's base/compare pill-picker + glyph-diff pattern.

---

# Round 4 session (2026-06-12) — unfinished brief surface

> Owner picks this session: ingest-review sample data **synthesized from
> the ZD catalog** · landing/login **one direction, polished** (copy is
> PLACEHOLDER — no marketing copy exists) · insights overview **fold-in**
> (not redirect) · heatmap **explored now** as Tweak toggle · version
> detail **as proposed** (masthead + stack + diff-vs-previous) · lint px
> **cleaned to tokens** · dark sweep **fix everything, log each** ·
> round 3 **stays open** — a round-4 brief follows.

## New deliverable files (RETURN-SPEC §1 still governs)

| File | What |
|---|---|
| `app/data-r4.js` | Sample-data extensions: `ZD.ingest` (document pipeline), `ZD.extractions` (9 synthesized fields mapping into the real metric catalog), `ZD.docPages` (lab-report facsimile lines). Design artifact only. |
| `app/screens-ingest.jsx` | Ingest review (populated), consent gate, document viewer, shared `DocPanel` + review-state store |
| `app/screens-public.jsx` | Landing + login (public register) |
| `app/screens-r4.jsx` | Version detail, Insights section dashboard |

## Per screen

- **Ingest review (`/ingest/review`) — populated state.** Split view:
  document facsimile left (mono lines on a raised page, page pager),
  extraction fields right. Selecting a field jumps the document to its
  source page and highlights the source line (accent wash + 2px accent
  edge). Per-field decision maps through the canonical status tokens:
  **approved → optimal · edited → borderline · rejected → deficient ·
  pending → neutral** (left edge bar + action buttons). Mono confidence
  readout per field (`CONF 0.98`); conf < 0.80 renders in borderline +
  `CHECK SOURCE`. Edit opens an inline numeric input; edited values carry
  a `*` with the extracted original in the title. Masthead right slot:
  mono decision counts (✓ ~ ×) + ink commit button **disabled until every
  field is decided**. The round-3 empty state remains the zero-pending
  design. **≤1080px** the panels stack (fields first); **≤760px** a
  Document / Fields pill toggle shows one panel at a time, full fidelity.
- **Gate-count flow-back.** Decisions live in `window.ZD.reviewState`
  (in-memory store, design artifact); the Ingest overview's Lab-PDF row
  (`1 doc pending`) and Review-gate row (`N fields pending`, borderline
  tint while > 0) read it live. A document row (filename · source · drawn
  date · pages → `/ingest/documents/:id`) was added under the review gate.
- **Consent gate (`/ingest/consent`).** One card: three plain statements
  (model reads the doc / nothing written until review / original stored,
  consent revocable), a single consent checkbox row (accent when on),
  Continue disabled until checked → upload. Upload masthead gained a
  Consent pill link.
- **Document viewer (`/ingest/documents/:id`).** Filename masthead;
  meta stat-strip (source · draw date · uploaded · extraction state);
  full-width facsimile with pager; right slot is `Review N pending`
  (ink button) or an optimal badge once reviewed.
- **Landing (`/`).** Marketing register, one direction: public topbar
  (mark + wordmark + Sign-in pill), mono eyebrow, display hero
  ("Your bloodwork, one frame at a time."), one REAL frame card (Vitamin D
  TrendChart at shadow-lg) + centered mono stat row, three numbered
  capability rows on hairlines, quiet footer. Dot-grain paper background
  (`--n-150` dots, works in both themes). **All copy is placeholder.**
- **Login (`/login`).** Centered frame card on the grain: mark, OWNER
  ACCESS eyebrow, email/password fields (`zt-field`, accent focus border),
  full-width ink button, one quiet invite note. Submits to `/dashboard`.
- **Version detail (`/protocol/versions/:version`).** Masthead: version
  chip + name, sub = date · description, right = status pill. "Stack at
  Pn" frame-card list (name + mono dose; P0 gets the calm empty state).
  "Changes vs P(n−1)" reuses the Compare glyph-diff rows (shared
  `diffStacks`/`DIFF_GLYPHS`, same-rows filtered out) + link to full
  Compare. Versions list rows now link through (hover + chevron).
- **Insights overview (`/insights`).** Link hub → section dashboard:
  stat strip (pairs · high significance · strongest pair with mono
  sub-eyebrow · variants), strongest-correlations card (top 4 by |r|,
  significance + mono r), genetics card (status-dot counts header +
  per-gene rows). All rows link into the detail screens.
- **Correlation heatmap — explored, then DROPPED (owner, same session).**
  An n×n matrix view was built to chart-language rules and reviewed live;
  verdict: not useful (sparse pair set reads better as the table). All
  heatmap code/CSS and the "Correlations view" tweak were removed; the
  table remains the only correlations view. Do not revisit without new
  density (many more pairs).
- **Review-only public links.** The sidebar footer (expanded state) gained
  a tiny "PUBLIC · Landing · Login" mono row so the public surfaces are
  reachable in review. **NOT for integration** — public routes live
  outside the app shell.
- **Metrics overview — % ring replaced with the frame strip (owner pick
  from exploration A).** The ring read as progress toward a 100% that
  will never come, and sat frozen between draws. Category cards now show
  ONE status dot per marker (every marker a frame) + a mono
  `N markers · n optimal` readout. This supersedes the round-3 note
  "linear bars replaced with MetricRing (sweep showcase)" — the ring
  remains in use elsewhere (rings stay for true completion metrics only;
  BAKED: never use a ring for status share). The dashboard category cards
  were matched in the same pass (CountDots → frame strip, same mono
  readout; icon tiles kept as the dashboard idiom). Exploration kept at
  `explorations/metric-card-viz.html`.

## Dark-theme full sweep (every route walked, dark)

- **Verdict: the variable-remap system held.** Chart band tints, tinted
  rows (`--surface-2`, `--focus-50`, `--optimal-bg`), dropzones, doc
  highlight, heatmap cells and the public grain all read correctly.
- **One real finding, fixed:** `--vital-500` / `--energy-500` are used as
  TEXT (chart band tag, compare/diff counts, tier labels, significance
  column) and fell below comfortable contrast on dark cards. Dark remap
  added in new.css (one step brighter: `#11c29b` / `#f0ac1f`) — variable
  remap only, no per-component dark selectors.
- Process note: dark screenshots in a throttled iframe can capture the
  200ms theme transition mid-flight (light body + dark tokens). Artifact
  of the harness, not the theme system.

## Tokens

**New (extend `--zn-*` shell-geometry family) — px-lint cleanup, values unchanged:**

| Token | Value | Replaces |
|---|---|---|
| `--zn-page-top` | 23px | raw px in masthead-alignment rule |
| `--zn-brand-pad` | 19.5px | raw px in logotype-alignment rule |
| `--zn-brand-gap` | 8.5px | raw px in logotype-alignment rule |

**Dark-remap additions (existing tokens, dark values only):**
`--vital-500: #11c29b` · `--energy-500: #f0ac1f` (see sweep finding).

**New classes (all `zt-`):** `zt-btn-ink`, `zt-review-grid`, `zt-docpage`,
`zt-docline`, `zt-frow`, `zt-frow-edge`, `zt-fact`, `zt-fedit`,
`zt-consent-row`, `zt-consent-box`, `zt-field`, `zt-public`, `zt-pub-top`,
`zt-pub-main`, `zt-pub-hero`, `zt-pub-h1`, `zt-pub-sub`, `zt-pub-frame`,
`zt-pub-statrow`, `zt-pub-rows`, `zt-pub-row`, `zt-pub-foot`.

## Icons

New lucide names: `pencil`, `chevron-left`, `file-text`, `file-search`,
`archive`, `shield-check`. (`check`, `x`, `clipboard-check`,
`chevron-right` already in use.)

## Interaction-model decisions BAKED this session

- **Review decisions are the status language:** approved/edited/rejected
  map to optimal/borderline/deficient everywhere (edge bars, actions,
  counts). Pending is neutral — a field carries no judgment until decided.
- **Nothing writes until everything is decided** — the commit button
  gates on pending = 0; rejected fields are dropped, edited values win.
- **Field → source linkage:** selecting a field always reveals its source
  line in the document (split, stacked, or via the Document tab).
- **Public register = same tokens, marketing scale:** dot-grain paper,
  display-clamp hero, frame cards; no new colors or fonts.

## Integration asks (cumulative, round 3 + 4)

- `--dur-ring` 900 → 1600ms token change (round 3).
- nav-tree.ts restructure: Ingest group + "Phasing" label (round 3).
- `/import` → `/ingest` redirect (round 3).
- NEW routes to wire: `/`, `/login`, `/ingest/consent`,
  `/ingest/documents/:id`, `/protocol/versions/:version` (components in
  the round-4 files above; idiom mapping per RETURN-SPEC §4).
- `reviewState` is an in-memory design stand-in — back it with the real
  extraction-review API; the seeded mid-review state is demo-only.
- Dark remaps for `--vital-500`/`--energy-500` belong in the app.css
  dark block at integration (drop the new.css override).

## Open for the next round

- Marketing copy for landing/login (placeholder flagged above).
- Real extraction sample to replace the synthesized LabCorp facsimile.
- Round-3/4 log finalization — owner kept the log OPEN; a round-4 brief
  follows.

---

# Round 5 session (2026-06-12) — depth, mobile pass, CLOSING

> Owner picks this session: **WHOOP + Vault write DIRECTLY** (trusted
> sources — no review gate; only lab PDFs are gated) · WHOOP preview at
> full depth (mapping summary + sparklines + sample-rows table) ·
> invites = **multiple roles** (viewer + clinician) · create-invite =
> **inline expanding row** at the top of the list · mobile sweep =
> **fix everything, log each** · **this is the closing session** —
> finalize and ship. No marketing copy or real extraction sample was
> provided — both swaps remain outstanding (see Integration asks).

## New deliverable files (RETURN-SPEC §1 still governs)

| File | What |
|---|---|
| `app/data-r5.js` | Sample-data extensions: `ZD.whoop` (import state + field mapping + last-5 records), `ZD.vault` (path, sync meta, recent notes, metric targets), `ZD.invites` / `ZD.inviteRoles`. Design artifact only. |
| `app/screens-r5.jsx` | WHOOP populated state, Vault connected state, Settings invites flow (overrides the round-3 shallow states) |

## Per screen

- **WHOOP import (`/import/whoop`) — populated state.** Meta stat strip
  (last import · daily records + range · fields mapped · **Writes:
  Direct, trusted source · no gate**). Field-mapping list reuses the
  review screen's `→ catId/metricId` mapping idiom: mono export key,
  point count, recent-shape sparkline (the mapped metric's own history,
  status dot on the last frame), last parsed value; mapped rows link
  into the metric detail. `tdee` demonstrates the **unmapped → skipped**
  treatment (faint, no link, no sparkline). "Last parsed records" =
  DataTable of the 5 newest daily rows (mono, unit once per column
  header). Compact re-import dropzone ("re-imports are idempotent —
  records keyed by date" is PROPOSED copy). Footer trust note mirrors
  the review-screen footer idiom.
- **Vault import (`/import/vault`) — connected state.** Meta stat strip
  (vault path · last sync + schedule · synced counts · Writes: Direct).
  Two-column: recently-synced notes (mono filename · kind · date) and
  **metric targets** lifted from vault target notes (name, mapping
  eyebrow, mono target, links to metric detail). Owner targets may
  differ from the optimal band — PROPOSED: both render on metric
  screens. Masthead right = quiet "Sync now" pill; Disconnect is a
  quiet pill in the footer note.
- **Settings (`/settings`) — invites flow.** Asymmetric split (account
  1 / invites 1.6, `zt-settings-grid`). Invite list rows: mono email +
  status·sent sub-line, role chip (neutral; Owner keeps the accent
  chip), revoke action (`zt-fact`, deficient hover) mapping to
  `/settings/invites/:inviteId/revoke`. Create = inline expanding row
  at the top: email field, role pill picker (Viewer / Clinician),
  ink Send button disabled until the email parses. PROPOSED role
  semantics (caption under the card): Viewer — dashboards and trends ·
  Clinician — adds lab documents and protocol detail.

## Mobile (≤760px) full sweep — every route walked at 390px

- **Method note:** pixel screenshots of the emulated narrow viewport
  produced phantom text-overlap artifacts (DOM-to-image re-render);
  the sweep verdict was therefore taken from **real layout geometry**
  (bounding-rect overflow + pairwise overlap scans on every route).
- **Verdict: the 760px breakpoint system held.** Grids collapse, the
  drawer + topbar work, the review tab toggle works, tables scroll
  inside their cards, stat strips go 2-col, public surfaces reflow.
- **Findings, all fixed:**
  1. `/ingest/review` masthead — the right slot (decision counts +
     commit button) could not shrink (`flex: 0 0 auto`), overflowing
     the viewport by 7px. PageHeader right slot is now `flex: 0 1 auto;
     min-width: 0` (lib.jsx) so its content wraps.
  2. **Document viewer stat strip** carried an inline 4-col
     `gridTemplateColumns` that defeated the 2-col mobile collapse —
     removed (redundant on desktop, harmful on mobile).
  3. **Genetics rows** — the fixed 200px gene column starved the impact
     column at 390px (≈40px of text width). New `zt-gene-row` /
     `zt-gene-id` hooks + a mobile rule stack the gene id above.
  4. **Meta stat-strip values** (import screens, document viewer)
     truncated filenames/paths on the 2-col mobile strip — new
     `zt-meta-val` / `zt-meta-sub` classes: nowrap-ellipsis on desktop,
     wrap on mobile.

## Review-only artifacts — STRIPPED (closing)

- Sidebar-foot "PUBLIC · Landing · Login" links removed (public routes
  live outside the app shell). For review, reach them by hash: `#/`
  and `#/login`.
- `window.__setTweak` hook removed (main.jsx).
- Seeded mid-review state removed (screens-ingest.jsx) — a fresh
  document now starts all-pending, the real post-extraction behavior.
- `explorations/` folder deleted.
- Kept: the Tweaks panel "Chart state" preview (review harness
  feature, not part of the return surface).

## Tokens / classes / icons

- **No new or changed tokens** this round.
- **New classes (all `zt-`):** `zt-settings-grid`, `zt-meta-val`,
  `zt-meta-sub`, `zt-gene-row`, `zt-gene-id`.
- **New lucide names:** `refresh-cw`, `plus`.

## Interaction-model decisions BAKED this session

- **Trust model:** WHOOP and Vault are trusted sources — writes land
  directly; ONLY lab PDFs pass the extraction-review gate. Both import
  screens state this in the meta strip ("Writes: Direct") and a footer
  note.
- **Mapping language is universal:** every source that writes metrics
  shows `→ catId/metricId` linkage (review fields, WHOOP fields, vault
  targets); unmapped fields read "not tracked · skipped", never hidden.
- **Invites:** two roles (viewer, clinician); inline expanding create
  row; revoke is the only per-invite action.

## Integration asks — FINAL cumulative list (rounds 3–5)

1. `--dur-ring` 900 → 1600ms token change in app.css (round 3).
2. nav-tree.ts restructure: Ingest group + "Phasing" label (round 3).
3. `/import` → `/ingest` redirect (round 3).
4. New routes to wire: `/`, `/login`, `/ingest/consent`,
   `/ingest/documents/:id`, `/protocol/versions/:version` (round 4).
5. `reviewState` is an in-memory stand-in — back it with the real
   extraction-review API (round 4).
6. Dark remaps for `--vital-500`/`--energy-500` into the app.css dark
   block; drop the new.css override (round 4).
7. PageHeader right-slot shrink fix (`flex: 0 1 auto; min-width: 0`)
   belongs in the app's PageHeader component (round 5).
8. WHOOP/Vault import screens expect real source state
   (`ZD.whoop` / `ZD.vault` shapes in data-r5.js are the contract
   sketch); invites expect the real invites API (round 5).
9. **Outstanding owner inputs (swap at integration):** landing/login
   marketing copy (all PLACEHOLDER) and a real extraction sample to
   replace the synthesized LabCorp facsimile.

**Log status: FINAL.** No further design rounds planned; reopen with a
new brief if needed.
