# prompt-r5 — round 5 prompt (next session)

> Paste this (or attach this file) at the start of the next session.
> Package context: `uploads/round3/` (BRIEF.md, RETURN-SPEC.md, current-state/).
> Working return: `round3-return/` — open `index.html` to view. Read
> `round3-return/CHANGES.md` first; it is the decision log of record
> (round 3 + the round-4 session, log still OPEN).

---

## Prompt

Continue the Zoetrop return in `round3-return/`. Read
`round3-return/CHANGES.md` for everything already baked — do **not**
relitigate:

- **Round 3:** frames chart direction, frame-card tooltip, milestone
  x-axis + trend projections, canonical status tokens, compact density,
  1600ms ring sweep, surface ladder (nav 0 / canvas 1 / cards 2),
  condensed masthead, Import+Ingest consolidation, "Phasing" rename,
  sequential phase timeline.
- **Round 4 session:** ingest-review decision model (approved→optimal ·
  edited→borderline · rejected→deficient · pending→neutral; commit gates
  on zero pending; field→source linkage always visible), consent gate +
  document viewer composition, public register (same tokens, marketing
  scale), insights overview as a section dashboard (fold-in, NOT a
  redirect), version detail = masthead + stack + diff-vs-previous,
  **frame strip on category cards** (dashboard + metrics; rings are for
  true completion ONLY, never status share), correlation heatmap
  **explored and DROPPED** (don't revisit without far more pairs),
  dark remaps for text-grade `--vital-500`/`--energy-500`, shell px
  values tokenized as `--zn-page-top` / `--zn-brand-pad` / `--zn-brand-gap`.

Every route in the BRIEF table is now prototyped. This session is about
**depth, the mobile pass, and closing**:

### 1. Import flows — the last shallow surfaces
`/import/whoop` and `/import/vault` are dropzone/empty-state only.
Design the populated states: WHOOP post-upload mapping preview (fields
found → Autonomic metrics, counts, last-sync) and the Vault connected
state (path, synced notes/targets, last sync). Reuse the ingest review
language where a gate is warranted — ask the owner whether WHOOP/Vault
writes go through the same review gate or land directly.

### 2. Settings — invites flow
BRIEF lists `/settings/invites/:inviteId/revoke` as an action route, but
invite creation/listing was never designed. Compose: invite list (email ·
role · status · revoke), create-invite affordance, viewer role chip.
Keep it one screen; reuse list-row + pill idioms.

### 3. Mobile (≤760px) full sweep
Per-screen mobile answers exist (drawer, review tabs, stacked grids) but
no screen-by-screen walk happened. Walk every route at ≤760, fix and log
findings the way the round-4 dark sweep did.

### 4. Owner-input swaps (blocked on materials)
- Landing/login marketing copy is PLACEHOLDER — swap when copy arrives.
- Extraction review sample is synthesized — swap when a real extraction
  sample is provided.

### 5. Close the log
If no further round follows, finalize CHANGES.md (mark FINAL), confirm
the cumulative integration-asks list, and strip review-only artifacts.

### Housekeeping
- Integration asks (cumulative, in CHANGES.md): `--dur-ring` 900→1600ms;
  nav-tree.ts restructure (Ingest group + Phasing label); `/import` →
  `/ingest` redirect; new routes `/`, `/login`, `/ingest/consent`,
  `/ingest/documents/:id`, `/protocol/versions/:version`; dark
  `--vital-500`/`--energy-500` remaps into the app.css dark block;
  `reviewState` backed by the real extraction-review API.
- **Review-only artifacts — strip at integration, keep in prototype:**
  sidebar-foot PUBLIC · Landing · Login links (lib.jsx), `window.__setTweak`
  (main.jsx), the seeded mid-review state (screens-ingest.jsx),
  `explorations/` folder.
- RETURN-SPEC still governs: loose `app/*.jsx` + ONE additions-only
  `new.css` + CHANGES.md; 760px breakpoint; dark via variable remap only;
  `zt-`/`zn-` prefixes; idiom mapping table for integration.

### Open questions to ask the owner up front
1. WHOOP/Vault: do their writes pass through the review gate, or land
   directly (wearable/notes trusted, labs gated)?
2. Settings invites: single viewer role, or multiple roles?
3. Mobile sweep: fix everything found, or audit + log only?
4. Is this the closing session (finalize + ship), or does another round
   follow?
5. Any marketing copy / real extraction sample ready to swap in?
