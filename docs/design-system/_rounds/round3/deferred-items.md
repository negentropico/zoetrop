# Deferred items — round3-5 design-return integration

Out-of-scope discoveries logged during wave execution. Do NOT fix in the
discovering wave; route to the owning wave or a follow-up.

## W4a (2026-06-12)

- ✅ **RESOLVED (2026-06-12)** — the three assertions now expect the canonical
  `--optimal/--borderline/--deficient` (+ `-bg`) tokens; StatusBadge suite green
  (12/12), full suite has no remaining failures. Original note kept below.

- **`StatusBadge.test.tsx` — 3 stale assertions (owned by W2a, not W4a).**
  The W2a commit `0dde43f` ("status atoms read canonical status tokens")
  changed `StatusBadge.tsx` to emit `var(--optimal)/--borderline/--deficient`
  (+ `-bg`) instead of the old `var(--success)/--warning/--danger`. The test
  file was not updated, so 3 cases fail:
    - "renders optimal badge with --success color…" expects `var(--success)`,
      receives `var(--optimal)`
    - "renders borderline badge with --warning color…" expects `var(--warning)`,
      receives `var(--borderline)`
    - "renders deficient badge with --danger color…" expects `var(--danger)`,
      receives `var(--deficient)`
  Fix: update the three expectations in `StatusBadge.test.tsx` to the canonical
  tokens. This is a W2a follow-up (the component change is correct and baked);
  W4a did not touch `StatusBadge.tsx` or its test. Pre-existing failure,
  present on the branch before W4a started.

## W4b (2026-06-12) — WHOOP + Vault populated states, data-honesty gaps

The WHOOP/Vault screens were built ENTIRELY from real data already in the app
(autonomic metrics for WHOOP, `METRIC_TARGETS` for Vault). The `ZD.whoop` /
`ZD.vault` sample shapes in `data-r5.js` were treated as loader contract
sketches, NOT integrated. The following design states have **no real backing**
in the current data layer and were rendered as honest-empty / derived states
rather than fabricated — each is a candidate for a future ingest/sync feature:

- **No import-tracking table (WHOOP).** The design's meta strip wants a "last
  import timestamp" + imported-file metadata; the app records neither (WHOOP is
  a manual JSON import per CLAUDE.md, with no per-import provenance row). The
  meta strip derives the truthful **latest data point** ("Last reading", from
  the newest autonomic `timestamp`) and labels the source as a manual JSON
  import. Future: an `import_runs` / source-provenance table (file name, run
  timestamp, row count) would let the strip show real import history.

- **No per-day WHOOP rows (WHOOP).** The design's "Last parsed records" implies
  daily WHOOP rows. The DB stores **periodic autonomic snapshots** (4 HRV/RHR/
  recovery readings, 3 sleep — Feb 2025 → Jan 2026), not daily granularity. The
  table shows the real readings pivoted by date, with an on-screen note stating
  the row-level (daily) gap. Future: store raw daily WHOOP rows on import.

- **No TDEE / calories metric (WHOOP).** The design requires an unmapped→skipped
  demonstration via `tdee`. This is TRUE here — the app tracks no TDEE/calories
  metric — so `tdee` renders the honest "not tracked · skipped" treatment
  (faint, no link, no sparkline, "—" value). Not a gap to fix; documented so a
  future "add TDEE tracking" task knows the skip row will auto-resolve to a
  mapped row once the metric exists.

- **No vault-sync table (Vault).** The design's meta strip + "Recently synced"
  list want a vault path, last-sync timestamp, sync schedule, and per-note sync
  metadata. The app tracks NONE of these. Per the W4b constraint, the
  user-specific absolute vault path (`/Users/mac/vaults/#Bwell/602/`, CLAUDE.md)
  was deliberately NOT hardcoded into shipped UI. The meta strip renders an
  honest "manual reference import / Not tracked / no sync schedule" state and
  "Recently synced" renders the chart-empty motif ("Sync log not tracked").
  Future: a real vault connector with a sync log would populate both.

- **Vault "Metric targets" = in-app targets, not vault-lifted (Vault).** The
  design lifts targets from vault target notes (e.g. `09_Targets_2026.md`).
  There is no vault-notes ingest, so the screen renders the app's real
  `METRIC_TARGETS` (2026 Q1/Q2 goals — the in-app analog of the vault note),
  each resolved to its real metric DB id for the `→ catId/metricId` link. All
  25 targets currently resolve to a real metric reading, so the honest
  "not yet tracked" unlinked-row path (present in code) has no live rows at the
  moment; it will activate if a target ever lacks a backing reading. Future: a
  real owner-targets table sourced from the vault would replace the static
  `METRIC_TARGETS` constant.

- **Re-import / Sync-now are display affordances (both).** WHOOP keeps a real
  client-side JSON parse/preview on the re-import dropzone (the route's existing
  upload affordance), but there is no server-side commit that writes the parsed
  rows to the DB yet — "Save to tracker" was not part of W4b scope. Vault's
  "Manual sync" and the footer "Disconnect" affordance from the design were
  rendered as honest, non-functional (no sync/disconnect backend exists). Future:
  wire WHOOP re-import to a real idempotent (date-keyed) write and add a vault
  connector before these become active controls.

## W4c (2026-06-12) — Settings invites flow, data-honesty gaps

The invites flow was built onto the EXISTING real backend with no schema or auth
changes. A real invite-CREATE action already existed (`generate-invite` intent in
the settings action → `generateInvite()` in `invites.server.ts`) and a real
revoke route already existed (`/settings/invites/:inviteId/revoke`). Both were
reused as-is; no new endpoint was built. Gaps logged:

- **No `email` column on the `invites` table (the central design↔schema gap).**
  The design's invite rows lead with a mono email + "status · sent" sub-line and
  the create row has an email field + an "ink Send" button (implying send-to-email).
  The REAL model (`db/schema.ts` invites, `invites.server.ts`) is a single-use,
  role-scoped **token delivered by copy-link** — there is no email column and no
  email-send path (D-09 explicitly defers email send). Decision (no migration,
  per the W4c brief and the INTEGRATION-PLAN role-name note's "UI labels only, no
  enum migration" precedent):
    - **List rows** lead with the only stable per-invite identifier the real
      model has — a short invite id (`invite · {first 8 chars}`) — with the
      `status · sent {createdAt}` sub-line, the role chip, and revoke. They do NOT
      fabricate an email the DB never stored.
    - **The create-row email field is advisory recipient context** (the design
      idiom). It gates the Send button (parseable email) per the design contract
      but is **not persisted** — the action ignores it (no column) and mints a
      real role-scoped token. The minted **copy-link is surfaced inline** so the
      owner copies it and sends it to that recipient manually (the real delivery
      mechanism). The button is therefore NOT a dead client-only form — it posts
      to the real `generate-invite` action and produces a real, usable artifact.
  Future: an `invites.email` column + an email-send pipeline (D-09 follow-up)
  would let the rows show the real recipient and turn "Send invite" into an
  actual send; the email field is already wired to carry it (named `email` in the
  form) so the action only needs to start persisting + sending it.

- **No "sent" timestamp distinct from createdAt.** The design's "sent {date}"
  maps to `invites.createdAt` (invite creation = the only "sent" event in the
  copy-link model). Honest 1:1; documented so a future email-send adds a real
  `sentAt`.

- **Status vocabulary mapped, not invented.** The design's free-text status
  ("accepted" / "pending") maps through the real `deriveInviteStatus` lifecycle
  (active / consumed / expired / revoked): consumed → "accepted", active →
  "active", plus expired/revoked. No fabricated states.
