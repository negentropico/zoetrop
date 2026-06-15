# Design-source provenance — zoetrop

Inbound **Claude Design** (`claude.ai/design`) handoff bundles that seeded this repo's design
roundtrip. Preserved 2026-06-14 because the API handoff links (`…/v1/design/h/<id>`) expire.

> **Canonical cold store (not in git):** the full bundles live in
> `ngtops/.archive/design-source-projects-2026-06-14/` on Mac's machine — that path is **gitignored,
> local-only**. This file is the committed, durable pointer + integrity record. To restore a bundle,
> copy `<name>-handoff.tar.gz` from the cold store and verify the SHA-256 below.

Part of the design-roundtrip harness-unification initiative
(`ngtops/docs/superpowers/plans/2026-06-14-design-roundtrip-harness-unification.md`, Phase B0).

## Bundles for this repo

| Bundle (round/era) | Project name | Chats | Extracted | Tarball | SHA-256 |
|---|---|---|---|---|---|
| `zoetrop1` | `Zoetrop1` | 6 | 2.5M | 9,121,483 B | `1cff1b50564a701acb8d9d4687f19d3958bf1af2f2a3cbd8ba6cec5ca6b94443` |
| `zoetrope-design-system` | `Zoetrope Design System` | 1 | 960K | 1,197,386 B | `17771568c3622331a03d7e5b3844afff8bd1dcaea51e7747fa16ceb7eb677569` |

Each tarball expands to `<name>/{README.md, chats/, project/}` — chat transcripts hold the design
intent; `project/` holds the HTML/CSS/JS prototypes. `zoetrope-design-system` additionally carries a
`design-bridge/` tree.

## Restore + verify

```bash
COLD="$HOME/Code/NGT/ngtops/.archive/design-source-projects-2026-06-14"
cp "$COLD/zoetrop1-handoff.tar.gz" .
shasum -a 256 zoetrop1-handoff.tar.gz   # must match the table above
tar -xzf zoetrop1-handoff.tar.gz
```
