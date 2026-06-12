# prompt-r4 — round 4 prompt (next session)

> Paste this (or attach this file) at the start of the next session.
> Package context: `uploads/round3/` (BRIEF.md, RETURN-SPEC.md, current-state/).
> Working return: `round3-return/` — open `index.html` to view. Read
> `round3-return/CHANGES.md` first; it is the decision log of record.

---

## Prompt

Continue the Zoetrop round-3 return in `round3-return/`. Read
`round3-return/CHANGES.md` for everything already baked — do **not**
relitigate: frames chart direction, frame-card tooltip, milestone x-axis +
trend projections, canonical status tokens, compact density defaults,
1600ms ring sweep, surface ladder (nav 0 / canvas 1 / cards 2, both themes),
condensed masthead, Import+Ingest consolidation, "Phasing" rename,
sequential phase timeline.

This session, work the **unfinished brief surface**, in priority order:

### 1. Ingest review — the heaviest screen, still a placeholder
BRIEF lists `/ingest/review` as "PDF viewer + per-field approve/edit/reject".
The return currently shows only its empty state. Design the populated state:
split view (document on one side, extraction fields on the other), per-field
status (approve/edit/reject) using the canonical status tokens, mono
field-confidence readouts, and how the review gate count flows back to the
Ingest overview row. Mobile (≤760px) behavior needs an answer too.
Related missing screens in the same flow: `/ingest/consent` (consent gate)
and `/ingest/documents/:id` (document viewer).

### 2. Public surfaces — landing + login
`/` and `/login` are in the BRIEF route table but absent from the prototype.
They must read as the same brand at marketing register: spiral mark, paper
surface, mono eyebrows, frame-card language. Ask the owner for variation
count before building.

### 3. Version detail — `/protocol/versions/:version`
In the BRIEF table, never prototyped. Likely composition: version masthead
(chip + date + status), supplement stack at that version, diff-vs-previous
reusing the Compare screen's glyph-diff rows.

### 4. Insights overview — resolve the flagged redundancy
CHANGES.md flags it as a link hub duplicating the sidebar. Owner decision
needed: fold headline correlation stats + genetics counts into it (make it a
real section dashboard like Protocol overview), or redirect `/insights` →
`/insights/correlations`.

### 5. Correlation heatmap — approved but unexplored
Owner approved "other new chart types if justified" (round-3 scoping).
The correlations screen is table-only; explore an n×n heatmap or matrix
view as a Tweak-toggleable alternative, using the chart-language rules
(neutral structure, status only in cells, frame-card tooltip).

### 6. Dark-theme full sweep
Surface levels are settled, but no screen-by-screen dark pass happened
(round 3 optimized light-first by owner pick). Walk every route in dark;
check chart band tints, tinted rows (`--surface-2`, `--focus-50`,
`--optimal-bg`) and dropzones against the dark remap.

### Housekeeping
- Integration asks pending from this round (keep in CHANGES.md): `--dur-ring`
  900→1600ms token change; nav-tree.ts restructure (Ingest group + Phasing
  label); `/import` → `/ingest` redirect.
- Design-lint nudges about raw px values in shell-adjacent CSS were left
  deliberately (consistent with shipped shell idiom) — confirm or clean.
- RETURN-SPEC still governs: loose `app/*.jsx` + ONE additions-only
  `new.css` + CHANGES.md; 760px breakpoint; dark via variable remap only;
  `zt-`/`zn-` prefixes; idiom mapping table for integration.

### Open questions to ask the owner up front
1. Ingest review: real extraction-field sample data available, or synthesize?
2. Landing/login: how many variations, and what marketing copy exists?
3. Insights overview: fold-in stats vs redirect?
4. Heatmap: explore now or defer to round 4?
5. Is round 3 closing after this (finalize CHANGES.md + ship), or does a
   round 4 brief follow?
