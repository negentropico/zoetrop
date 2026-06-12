# Zoetrop — Platform History

> Canonical historical record of the platform's full work cycle and evolution — from the
> personal wellness protocol that seeded it, through every product era and name, to the
> current M1 build. Companion to `docs/PLATFORM.md` (direction) and `.planning/ROADMAP.md`
> (active roadmap). Synthesized 2026-06-11 from the zoetrop git history (342 commits,
> 2026-01-03 → 2026-06-11), the `ngtops` operations repo, and the `#Bwell` protocol vault.

**Naming lineage:** the effort has carried several names — the **#Bwell** vault (personal
protocol knowledge base), the **Tracker / Wellness Tracker** codename (product, Jan–May 2026),
**Zoetrope** (transitional spelling), and **Zoetrop** (internal codename, formalized
2026-05-20; spelling standardized repo-wide 2026-06-11). "Wellie" circulated informally;
no documentary trace survives in the repos. The public brand is deferred
(`docs/NAMING.md` — Sanskrit/Eastern survivors recorded; do not relitigate).

**Disambiguation:** the vault's protocol phases (vault-M1…M6) are *personal protocol
milestones* and predate the product. The product's milestones are **M0–M3**
(`docs/PLATFORM.md`). They are unrelated numbering systems.

---

## 1. Origins — the personal protocol substrate (Oct 2023 → Dec 2025)

The platform is grounded in a real n=1 health-optimization effort:

- **Oct 2023** — WHOOP biometric collection begins (the eventual 27-month dataset:
  426 physiological cycles, 414 sleeps, 328 workouts).
- **Pre-Jan 2025** — catalyst: chronic NSAID damage (1600mg ibuprofen daily over months)
  compounded by 98th-percentile NAFLD genetic risk and ASD-baseline gut dysfunction.
- **Jan–Feb 2025 (vault-M1)** — baseline protocol established; first DEXA (Feb 6, 2025:
  27.3% BF, 153 lb lean, VAT 993g).
- **Mar 8, 2025** — the **#Bwell** Obsidian vault begins (Plan1: KPU + autism-management
  protocol design). The KPU hypothesis is tested ("ACT AS IF", 30 days) and **ruled out
  April 2025**.
- **Mar–Sep 2025 (vault-M2/M3)** — protocol iterations P0 → P9.1 → M4M5-v2;
  peak optimization at the May 1, 2025 DEXA (22.6% BF, 166 lb lean);
  **cessation attempt 1** (May 5 – Jul 20, 2025, 76 days) ends incomplete —
  the FAAH lower-activity variant needs 120+ days, not the standard 30–60.
- **Sep–Dec 2025 (vault-M4/M5)** — consolidation; ASD+ADHD comprehensive protocol
  (M4M5-v2) becomes the operating reference.
- **Dec 23, 2025** — **cessation protocol 2 begins**: FAAH-informed, 120-day minimum
  (Acute → Stabilization → Clearing → Optimization). This is the live protocol the
  product's cessation tracker models.
- **Jan 1–3, 2026** — vault consolidated into `602/` (13 authoritative docs) + `603/`
  (active phase). Days later, ~7,480 metrics from this vault are extracted into the
  brand-new product.

The vault remains the protocol's knowledge base; the product is external to it.

## 2. Era 1 — Astro / LocalStorage "Wellness Tracker" (Jan 3–5, 2026)

**Name: Tracker / Wellness Tracker · Stack: Astro 5 + React 19 islands, LocalStorage +
SQLite adapter, Netlify · Governance: spec-kit constitution (ratified 2026-01-03).**

Born in a single-day burst (10 commits on 2026-01-03, from `9767622` "Initial commit from
Astro"): the 9-category metric system and 4-state status taxonomy (`770f21a`), the MVP
dashboard (`b4e8fa8`), direct WHOOP CSV import (`bab34cb`), the Obsidian vault importer
extracting **7,480 metrics from #Bwell** (`8c6e7aa`), trend charts, and a SQLite adapter
for local persistence (`9c8f84c`, wired 2026-01-05). The spec-kit constitution codified
component-first, local-first, strict TypeScript, test-first, WCAG 2.1 AA. K1–K3 genetic
confidence levels first appear 2026-01-21 (`cac91e9`) — the seed of the K1–K4 engine.

## 3. Era 2 — React Router 7 + Neon migration (Jan 21 – Feb 5, 2026)

**Name: still Tracker · Stack: React Router 7 (Remix) + Neon Postgres, Netlify.**

`6a741ac` (2026-01-21) initializes the React Router 7 + Neon foundation; nested metric
routes, protocol evolution tracking (P0–P6 versioning), and condensed metric cards follow.
On 2026-02-05 the transition completes: shared lib extraction, live cessation data on the
dashboard, and `f1463ba` retires the Astro app to `.archive/astro/`. M0 — the n=1 personal
instrument — is effectively shipped here and lives at `zoetrop.netlify.app`.

**Feb 6 – May 19, 2026 — dormancy.** The instrument is in daily personal use; no commits.

## 4. Era 3 — Platform pivot: direction, codename, commercialization (May 20–31, 2026)

A single pivotal day, 2026-05-20, produces three durable artifacts:

- **`docs/PLATFORM.md`** (`d4d24cb`) — the product brief: M0 (shipped n=1 instrument) →
  M1 (single practitioner, multi-client: identity/tenancy, lab ingest, report gen) →
  M2 (client app) → M3 (multi-coach productization). **Engine-first inversion** locked:
  the confidence-graded protocol-decision engine is the moat; coaching-ops layers on top.
- **`docs/NAMING.md`** — the naming hunt (~45 candidates, 6 rounds) concludes the
  functional-health naming space is saturated; pauses with Sanskrit/Eastern survivors
  (Pradipa, Urja, Unmesha; Ergon as off-lean option). Hard kills: MAGA-adjacency
  (Magga/Marga), any "Zoe-" name (ZOE collision). **Zoetrop** is formalized as the
  internal codename — it keeps the *tropos*/"turning" half, not the *zoe* half.
- **`ngtops/clients/higher/PLATFORM-FOR-HIGHER.md`** — the commercialization companion:
  **HIGHER** (Tara Garrison's coaching practice, multi-coach with Coach Daria) as the M1
  proving tenant. Her bottleneck — hand-reading every blood/HTMA/DNA/gut/DUTCH panel and
  re-cutting protocols every four weeks — is exactly what the engine automates. Deal
  shape: NGT builds HIGHER's ops on the platform and retains the platform IP; HIGHER is
  Tenant #1 + reference. White-label boundary: her clients see only HIGHER's brand.

The HIGHER engagement machinery follows immediately in ngtops: pitch-deck brief
(2026-05-21), cockpit-layers tech spec and Phase 0/1 plans (2026-05-21), 3-round brand
strategy (R2 handoff 2026-05-24, positioning candidates 2026-05-29), and competitive
landscape research (2026-05-31 — InsideTracker→Terra identified as the white-label
credibility threat; defensibility = the practitioner's protocol logic, encoded and graded).

**Founder lineage** (recorded in `ngtops/PROJECTS.md`): Basis (2010–2012; physiological
data → behavior change; acquired by Intel) → Zoetrop (protocol decisions + coaching ops
on richer data) — the same diagnostic-pilot pattern, with Mac as first user and a real
protocol on the line.

## 5. Era 4 — GSD adoption and the M1 build (Jun 7, 2026 → present)

**2026-06-07** (76 commits): codename hardened repo-wide (`783f57b`), **spec-kit retired**
(`ee843ea` — durable constraints extracted to `docs/PRINCIPLES.md`; constitution archived
as the record of the Astro/LocalStorage era), and **GSD initialized**: PROJECT.md,
28 v1 requirements, and the M1 roadmap (`f6e3a9d`). `.planning/` becomes the source of
truth. The Zoetrop design system + key-screens redesign package lands the same day
(`e4f92c3`), inserting Phase 4.1.

The M1 phases then execute at high cadence (139 commits on 2026-06-10 alone):

| Phase | Scope | Completed |
|-------|-------|-----------|
| 1 | Schema baseline + engine tests + Better-Auth↔Neon-JWK spike (SET LOCAL + RLS pattern proven) | 2026-06-08 |
| 2 | Netlify→Vercel cutover + pilot deploy baseline (`zoetrop.vercel.app`); **pilot-first re-scope 2026-06-08** — PHI/BAA/HIPAA hardening deferred to new Phase 7 pre-client gate | 2026-06-08 |
| 3 | Identity (Better-Auth, owner/practitioner/client roles) + tenancy spine (tenantId/subjectId on all 8 tables, expand-contract on live Neon) | 2026-06-10 |
| 3.1 *(inserted)* | Account & roles UX — account menu/logout, per-invite role-scoped tokens, /settings hub, fail-closed authz | 2026-06-10 |
| 4 | Static-to-DB migration — 13 loaders on live Neon, M0 data seeded, PHI removed from source + bundle (CI gates) | 2026-06-10 |
| 4.1 *(inserted)* | Design system adoption — tokens→Tailwind @theme, signature components in TSX, 16 routes in-brand, warm-dark theme, binding UI-SPEC.md; gated on design **round 1** | 2026-06-08 |
| 5 | Lab ingest pipeline — upload→LLM-extract (grounded + range-validated)→side-by-side review→approved-only writes with audit + consent; owner E2E UAT passed | 2026-06-11 |
| 6 | Engine promotion + confidence-graded reports (the M1 proof slice) | in progress |
| 7 | PHI compliance hardening — pre-client gate (BAAs, RLS enforcement, pgAudit, isolation proofs) | deferred by design |

**Design roundtrips** (claude.ai/design + the zoetrop-design skill) became a standing
workstream: **round 1** (full redesign → Phase 4.1), **round 2** (consolidated left-nav
chrome, integrated 2026-06-10/11 via GSD quick tasks q56/rj2/rwg), and **round 3**
(whole-app polish + data-viz language — outbound package prepped 2026-06-11). The round-2
integration pain produced the **roundtrip harness** (`docs/design-system/_rounds/harness/`:
unbundle + css-delta + RETURN-SPEC contract).

**2026-06-11** — the rebrand completes: repo-wide **Zoetrope → Zoetrop** rename
(`1ed1ba6`, 95 files + the round1 artifact filename), wordmark simplified. Progress
tracking mirrors to Asana (NGT workspace, project "Zoetrop").

## 6. Current state and what's next

As of 2026-06-11: 7 of 9 M1 phases complete; Phase 6 (engine promotion + confidence-graded
reports) is the active proof slice; Phase 7 is the hard gate before any external client's
PHI. Production runs at `zoetrop.vercel.app` (standard-tier infra, owner data); the
long-running `003-remix-foundation` integration branch awaits its production merge.
The HIGHER Phase-1 pitch (SPEC/PLAN finalized 2026-06-10 in ngtops) is the
commercialization next step; design round 3 is staged to send.

---

## Appendix A — Name timeline

| Date | Name in use | Evidence |
|------|-------------|----------|
| Mar 2025 | #Bwell (vault) | `/Users/mac/vaults/#Bwell/` Plan1 (2025-03-08) |
| 2026-01-03 | Tracker / Wellness Tracker | Astro constitution + initial commits |
| 2026-05-20 | Zoetrop codename formalized (Zoetrope spelling in places) | `docs/NAMING.md`, PLATFORM.md `d4d24cb` |
| 2026-06-07 | Zoetrop hardened repo-wide | `783f57b` |
| 2026-06-11 | Zoetrop spelling standardized everywhere | `1ed1ba6` repo-wide rename |
| TBD | Public brand | deferred; survivors in `docs/NAMING.md` |

## Appendix B — Source documents

- This repo: `docs/PLATFORM.md`, `docs/NAMING.md`, `docs/PRINCIPLES.md`,
  `docs/DESIGN-SYSTEM-ADOPTION.md`, `docs/COMPLIANCE-RUNBOOK.md`, `.planning/`
  (PROJECT/ROADMAP/STATE + phase dirs), `.archive/specify/` (spec-kit era, gitignored),
  `.archive/astro/` (Era-1 app, gitignored), git log (342 commits).
- ngtops (`/Users/mac/Code/NGT/ngtops`): `PROJECTS.md` (venture framing, founder lineage),
  `clients/higher/PLATFORM-FOR-HIGHER.md`, `clients/higher/pitch-deck/{SPEC,PLAN}.md`,
  brand-strategy + comparables research.
- #Bwell vault (`/Users/mac/vaults/#Bwell`): `CLAUDE.md`, `602/` consolidated docs
  (esp. `11_Historical_Context.md`, `08_Cessation_Protocol.md`), `_archive/Well/Plan1/`.

*Maintained as the canonical history. Append new eras; do not rewrite settled ones.*
