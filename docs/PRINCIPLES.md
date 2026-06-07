# Zoetrop — Engineering Principles & Data Standards

Durable build constraints extracted from the **retired spec-kit constitution**
(`.archive/specify/memory/constitution.md`), corrected to the current stack and
annotated for the platform direction in [`PLATFORM.md`](PLATFORM.md).

**This is a GSD planning input.** When converting `PLATFORM.md` §4–§6 (M1→M3) into
phases, treat the ✅/♻️ items as standing constraints and the 🎯 items as
explicit gaps to schedule. The constitution's own governance ritual is retired
along with spec-kit — GSD planning is now the place these get amended.

Legend: ✅ durable · ♻️ corrected (constitution was stale) · 🎯 aspirational (not met today) · ➡️ changes at M1

---

## Build history (what's already done)

- Feature work shipped on spec-kit branches: `001-core-data-layer`, `002-mvp-dashboard`, `003-remix-foundation` (current).
- **M0 (n=1 instrument) is shipped.** Astro→Remix migration complete (`f1463ba`); the old Astro app is in `.archive/astro/`.
- Live at `zoetrop.netlify.app`. 8 Drizzle tables, all **single-subject** (no identity/tenancy yet — the central M1 gap).

---

## Engineering principles

### ✅ Component-first architecture
UI components render UI only; state lives in hooks, business logic in `lib/` utilities. Target ≤300 lines per component. *Today:* the app is small — `TrendChart.tsx` is the one shared component; route modules own their own view. Keep the discipline as the app grows toward the M2 client app.

### ♻️ Server-authoritative data (was "Local-First Storage")
The constitution's "LocalStorage primary, Neon optional, fully offline" model **belonged to the Astro era and is retired.** Reality: the Remix app reads/writes **Neon Postgres** via `app/lib/db.server.ts` (Drizzle). For M1, server-authoritative Postgres is required anyway — PHI + multi-tenant isolation (RLS) can't live in the browser. The vestigial `syncStatus`/`syncVersion` columns on `metrics` are **legacy** offline-sync scaffolding with no live sync behind them (PLATFORM §5.1); plan to drop or repurpose them, don't build on them.

### ✅ Type safety (NON-NEGOTIABLE)
Full TypeScript strict mode. No `any`. Explicit interfaces for all data models and API responses. Validate at system boundaries (imports, lab ingest, any future API). This is the one principle the codebase actually enforces today — keep it.

### 🎯 Tests (currently a gap)
The constitution mandates test-first + 80% coverage. **There is no test runner and no tests in the repo today** (`package.json` has no `test` script). For an n=1 instrument that was tolerable; for M1 it is not — the moment per-client PHI and a protocol-decision engine are in play, the engine and the ingest/parse path need real coverage. **Schedule "testing-as-first-class" as an early M1 phase**, don't inherit the breach.

### 🎯 Accessibility (WCAG 2.1 AA)
Keyboard nav, ARIA, screen-reader support, and **status must not rely on color alone** — the `optimal/borderline/deficient/excess` taxonomy maps to colors, so always pair with text/icon. Aspirational today; a real requirement once there's a client-facing app (M2).

### ✅ Confidence-graded decisions (K1–K4) — *the moat*
Not in the original constitution, but the **defining design principle**: every variant→protocol mapping carries a confidence grade (K1 strong/clinical … K4 speculative/single-study), and the UI shows the gap honestly rather than faking certainty. Today this lives implicitly in seed/types; PLATFORM §5.3 promotes it to first-class schema (`geneticVariants` + `variantProtocolMap` with a `confidence` + evidence field). **Every planning decision about the engine must preserve confidence-under-uncertainty as a visible, first-class concept.**

---

## Data model standards (grounded in `remix-app/db/schema.ts`)

- **Metric IDs**: `varchar(36)` UUID — app-supplied (UUID v4 intent). Other tables use integer identity (`generatedAlwaysAsIdentity`). ✅
- **Timestamps**: Postgres `timestamp`, serialized ISO 8601 at the boundary. ✅
- **Reference ranges**: `referenceMin/Max` + `optimalMin/Max` on every metric — required for the status classification. ✅
- **Status taxonomy**: `metricStatusEnum` = `optimal | borderline | deficient | excess`. ✅ (stable contract — UI, CLAUDE.md, and PLATFORM all depend on it)
- **Enums as the extension pattern**: `metricCategory`, `dataSource`, `supplementTier`, `protocolChangeType`, `cessationPhase` are all pgEnums. ➡️ M1 adds a `role` enum (`owner/practitioner/client`) and `tenantId`/`subjectId` scoping following this same pattern (PLATFORM §5.2).
- **Known drift to clean up**: protocol-version schema comments still say `601→602→603` while the app renamed protocols to **P0–P6** (`cbb46c2`); `supplements.isActive` carries a "Boolean as int for SQLite compat" comment from the pre-Postgres era. Cosmetic, but flag for the M1 schema pass.

---

## Integration constraints

- ➡️ **M0 (today): manual import only.** WHOOP = manual JSON (Whoop Analyzer); blood work = manual entry / CSV; DEXA = manual; Obsidian vault importer. No direct external API connections. (`dataSourceEnum`: manual/whoop/dexa/bloodwork/csv/vault.)
- ➡️ **M1 changes this deliberately:** a lab-ingest pipeline (LLM-assisted parse → structured `metrics`, **with human review** — never model-only) plus inbound diagnostics integrations (blood/HTMA/DNA/gut/DUTCH, CGM) per PLATFORM §5.3 / §5.5. The "no external API" rule was an M0 simplification, not a permanent law.

---

## Performance & security targets

- 🎯 **Performance**: Lighthouse > 90, no blocking renders on initial load, lazy-load non-critical views, bundle chunks < 200KB.
- ➡️ **PHI posture (new at M1, not in the constitution)**: per-client diagnostics = PHI. Tenant+subject isolation via Postgres RLS, encryption at rest/in transit, role-based access, audit trail, consent capture at intake, BAA-readiness. This is the most carefully-gated part of M1 (PLATFORM §5.7) and has no precedent in the M0 codebase.

---

## What to fold into GSD planning first (M1)

Ordered by PLATFORM §5–§6, these are the constraint-bearing items above translated into planning seeds:

1. **Identity + tenancy spine** — `tenant` / `user(role)` / `subject`, scope every table with `tenantId`+`subjectId`, enforce via RLS. (Largest migration; everything else depends on it.)
2. **Promote the engine to first-class schema** — `geneticVariants` + `variantProtocolMap` (K1–K4 + evidence), per-subject protocol lineage (P0–P6 becomes per-client). Preserve the ✅ confidence principle.
3. **Lab-ingest pipeline** — `labDocuments` + extract→review→structured-`metrics`, human-in-the-loop.
4. **Tests-as-first-class** — close the 🎯 gap before the engine carries clinical weight.
5. **PHI/security gate** — RLS, encryption, audit, consent (the ➡️ security posture above).

Full architecture detail lives in `PLATFORM.md`; this doc is the *constraints* layer that should ride alongside it into `/gsd:new-project`.
