# zoetrop — round4 (Refinement line — current-state foundation snapshot) Package

> **Purpose.** Outbound package for round4: the input to a design roundtrip via claude.ai/design.
> The output flows back per [`RETURN-SPEC.md`](./RETURN-SPEC.md) — read it before producing anything.

## How to use this package
1. **Read the brand first** — the design skill bundle is the source of truth; nothing here overrides it.
2. **Read the brief** — [`BRIEF.md`](./BRIEF.md).
3. **Ground in current state** — [`current-state/`](./current-state/) snapshots the shipped tokens; your
   returned new rules must contain only what is **not** already there.
4. **Return per** [`RETURN-SPEC.md`](./RETURN-SPEC.md) — loose source files + one new-rules-only stylesheet + CHANGES.md.
