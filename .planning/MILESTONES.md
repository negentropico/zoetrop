# Milestones

## v1.0 — M1 Foundations (Shipped: 2026-06-14)

**Scope:** 9 phases (1–7 + inserted 3.1/4.1), 50 plans, 116 tasks.
**Delivered:** The engine-first platform foundation — an authenticated, tenant-scoped, RLS-isolated app that takes a lab PDF through extraction → grounded review → approval and produces a confidence-graded (K1–K4) lab→protocol report, running live on the owner's own data (n=1 pilot) at https://zoetrop.vercel.app.

**Requirements:** 27/29 satisfied. The 2 unsatisfied (COMP-02 BAA coverage, COMP-03 pgAudit/SELECT-logging) are deferred by design to the pre-external-client compliance gate, carried into v1.1.

### Key accomplishments (by phase)

- **P1 — Foundations:** Committed Drizzle migrations baseline applied to live Neon; Vitest harness with the pure-engine boundary suite (status classification, injectable-`now` cessation math, Pearson); Better-Auth↔Neon spike resolved on the `SET LOCAL` + RLS + NOBYPASSRLS-role pattern.
- **P2 — Deploy baseline:** Netlify→Vercel cutover (`@vercel/react-router` preset), unpooled Neon for migrations, live single-user production deploy at zoetrop.vercel.app.
- **P3 + P3.1 — Identity & tenancy:** Better-Auth email/password + owner/practitioner/client roles; `tenants`/`subjects` spine + `tenantId`/`subjectId` on all 8 data tables (expand-contract migration on live Neon, composite index, per-subject protocol-version uniqueness); public landing + `/login` gate; account menu, `/settings`, and per-invite role-scoped tokens.
- **P4 — Live data layer:** All route loaders read Neon (no static `*-data.ts` at runtime, ESLint-gated); owner's M0 data migrated into real tables; PHI removed from client bundle; sync vestiges + `as any` casts retired.
- **P4.1 — Design system:** Zoetrop brand tokens bridged into Tailwind `@theme`, signature components ported to typed TSX, all M0 screens retrofit in-brand, binding `UI-SPEC.md` + `ds-audit` gate.
- **P5 — Lab ingest:** Upload → `waitUntil` async LLM extraction (claude-sonnet-4-6 forced tool-use) → grounding/range/dictionary validation → side-by-side per-field review (approve/edit/reject, no bulk) → only-approved metrics written with PHI-free audit log; consent captured at intake. Owner E2E UAT passed.
- **P6 — Engine + reports:** Pure `engine.ts` (no Drizzle/Remix imports, ESLint+test enforced); `geneticVariants`/`variantProtocolMap` promoted to first-class tables with non-null K1–K4 evidence tier (30 variant + 22 metric rules on Neon); deterministic confidence-graded report generator with inline K badges + locked K4 disclaimer.
- **P7 — RLS + isolation:** Host-portable GUC-based RLS enabled + forced on all 16 PHI tables under a NOBYPASSRLS `app_user`; `withTenantDb` `SET LOCAL` wrapper + pool-non-leak test; cross-tenant isolation tests on live Neon; practitioner→subject assignments (AUTH-03); immutable auth/access audit log (AUTH-04).

### Verification at close
- Gates green: typecheck ✓, vitest 296 passed/80 skipped ✓, build ✓ (no `.server` leaks).
- Cross-phase integration: 5/5 core flows wired end-to-end, 0 broken (see archived `milestones/v1.0-MILESTONE-AUDIT.md`).
- Prod healthy: `/` 200, `/login` 200, `/dashboard` 302→/login.

### Known deferred items at close (carried into v1.1)
- **COMP-02 / COMP-03** — the compliance envelope & host gate (Vercel HIPAA add-on + BAAs, LLM-provider BAA, host cost/BAA comparison + possible migration, pgAudit + PHI SELECT-logging). Trigger preserved: before the first external client's PHI. Becomes v1.1's final gate (current Phase 8).
- **Phase 03.1 residual UAT (2):** invite-redemption end-to-end (private window) and client-role 403 with a real client account — both deferred-with-approval; get real traffic in v1.1.
- **4 Phase-7 review warnings (tech debt):** audit-log `?? 'owner'` role fallback (WR-01), open redirect via unvalidated `next` in consent.tsx (WR-02), `document.tsx` pdfBytes read via BYPASSRLS before authz (WR-03), `assignSubject` idempotency dead code (CR-01). Recommend folding the two security items into the compliance gate.
- **Nyquist coverage:** partial/missing VALIDATION.md for phases 02/03/04.1/05/03.1/07 (discovery only; tests + VERIFICATION green).

**Next milestone:** v1.1 — "M1 Operations: a practitioner runs a real client" (subject lifecycle, per-client genotype/metric entry, protocol authoring + 4-week cadence, WHOOP persistence, E2E proof slice, then the compliance gate). Defined via `/gsd:new-milestone`.

---
