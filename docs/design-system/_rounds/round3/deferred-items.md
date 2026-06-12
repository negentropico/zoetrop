# Deferred items — round3-5 design-return integration

Out-of-scope discoveries logged during wave execution. Do NOT fix in the
discovering wave; route to the owning wave or a follow-up.

## W4a (2026-06-12)

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
