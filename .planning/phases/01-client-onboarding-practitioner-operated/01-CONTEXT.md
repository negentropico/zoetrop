# Phase 1: Client Onboarding (practitioner-operated) - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

A practitioner can create a **real client as a second subject** in their practice tenant, capture intake basics, invite the client so their account links to that subject, **select the active subject (owner or client)** so every PHI surface (ingest, report, protocol) scopes to whoever is active, and see a **per-client onboarding checklist** of what inputs are still missing. Phase 03.1 residual UAT (invite-redemption end-to-end in a private window + client-role 403 with a real client account) closes here.

**Requirements:** ONB-01, ONB-02, ONB-03, ONB-04.

**Explicitly NOT this phase (stay thin):** the v1.2 at-scale subject-switcher UX; multi-practitioner management; per-practitioner feature-level permissions; client self-service; the generalized phased-program engine; WR-02/WR-03 security fixes (Phase 5). Data *ingest* itself (genetics/WHOOP/manual) is Phase 2 — Phase 1 only needs the subject to exist and the checklist to read ingest state.
</domain>

<decisions>
## Implementation Decisions

### Invite → subject link flow
- **D-01:** **Create the subject first, then invite.** The practitioner creates the client subject at intake (ONB-01); data entry (genetics/labs/WHOOP) can proceed immediately against that subject without waiting on the client. The invite is **bound to that existing `subjectId`**; redeeming it links the client's account to the subject. → The `invites` table needs a **nullable `subjectId` column** (today it carries only `role` + `tenantId`).
- **D-02:** **One practice tenant.** The tenant IS the practice (an org), not a person. Owner + clients are **subjects** within the one tenant; RLS already isolates by `subject_id` within a tenant and owner role has tenant-wide access (`assertSubjectAccess` Gate 4). Practitioners are users scoped to a **subset of client-subjects** via the existing `practitioner_subject_assignments` table. Do **not** build tenant-per-client. (Matches every existing assumption: invites carry inviter's `tenantId`, `getOwnerSubject` lists by tenant.)
- **D-03:** **Invite redemption is optional / non-blocking** for v1.1. The subject + all their data are fully usable whether or not the client ever redeems (no self-service in v1.1; practitioner does all data entry). The invite path must still **work** — it's exercised for ONB-02 and the 03.1 residual UAT — but onboarding "completes" on subject + data + report + protocol, not on account link.

### Active-subject selection
- **D-04:** **Server-set `httpOnly` cookie** holds `activeSubjectId`. Introduce a `getActiveSubject(ctx)` resolver: `id = cookie ?? ownerSubject.id`, validated through the **existing `assertSubjectAccess`** helper (owner → any subject in the tenant; practitioner → only assigned subjects), with owner-subject fallback if the cookie is unset/invalid. **Swap `getOwnerSubject` → `getActiveSubject`** across the ~13 PHI loaders so they all inherit scoping from one place. Do NOT thread `subjectId` through routes/URLs (that's the heavier v1.2 path).
- **D-05:** **Persistent identity chip + switcher in the app shell** — an always-visible `Viewing: <name> ▾` control on every screen; the dropdown lists owner + assigned subjects. This is the PHI-safety affordance (never edit the wrong person's record).
- **D-06:** **Default to owner on each fresh login; session-scoped cookie.** Closing the browser resets to owner; the switch is remembered within a session. Safest PHI default — the practitioner never resumes "inside a client" unexpectedly.

### Client intake fields (subjects schema today ≈ `{ id, tenantId, displayName, timestamps }`)
- **D-07:** Capture, beyond `displayName`: **(a) DOB + biological sex** (clinical core — drives age/sex-specific lab reference ranges and likely engine rules); **(b) contact** (email + optional phone — email is informational since invite delivery is out-of-band, token shown once); **(c) goals + intake notes** (free text — practitioner narrative); **(d) program start date**.
  - ⚠ Planner: confirm what `engine.ts` / reference-range logic actually consumes (sex/age) so the schema matches real use, not assumption.
- **D-08:** **Program is type-aware, not cessation-only.** Intake records a **program type** (e.g., cessation / substance-taper / lifestyle-modification / general) alongside the start date, so the subject model never hardcodes "cessation." The **adaptive phased-gate engine** (generalizing `CESSATION_PHASES`, per-subject program rendering on the dashboard) is **deferred** — see Deferred Ideas. This came from the user's insight that cessation is one instance of a phased program; the model must stay flexible/adaptive.

### Onboarding checklist
- **D-09:** The checklist tracks the **full onboarding-to-first-protocol loop**: Intake + consent → Genetics + Labs + WHOOP → Report + Protocol v1 → Account status (invite sent/redeemed, informational).
- **D-10:** **"Done" = honest 3-state** (missing / in-progress / done). Approval-gated where a review step exists: **genetics and labs are "done" only when review-APPROVED** (both have parse→review→approve gates); **WHOOP is "done" when present** (direct import, no review gate); report = generated; protocol = v1 authored. Matches the engine's honest-uncertainty ethos — no false "done" while extractions sit unreviewed.
- **D-11:** **Dedicated `/clients` page** is the home for client management + onboarding visibility: lists client subjects with their checklist status at a glance, and hosts **create-client + intake form + invite generation**. Clicking a client → detail (+ switch). The app-shell chip (D-05) handles active-subject switching; the page handles management. This gives "create client" a clear home **without** building the v1.2 at-scale switcher.

### Claude's Discretion
- Exact schema column shapes (enum vs varchar for program type / biological sex; DOB as date), cookie name/flags, and the resolver's file placement — planner's call, within the decisions above.
- Visual styling of the chip and `/clients` page beyond the safety requirement (D-05) — defer to the Zoetrop design system (UI phase / `gsd-ui-researcher`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — v1.1 Phase 1 entry, goal, success criteria (incl. SC-5: close 03.1 residual UAT).
- `.planning/REQUIREMENTS.md` — ONB-01..04 + the "Carried-Forward Verification & Tech Debt" section (03.1 residual UAT).
- `.planning/STATE.md` — Accumulated Context: carried decisions, pending todos, Phase-1 blockers/concerns.

### Identity / tenancy / subject machinery (the surfaces this phase extends)
- `remix-app/db/schema.ts` — `subjects` (~L241), `invites` (~L96), `practitioner_subject_assignments` (~L270), `tenants`, `consent_log`, `subject_genotypes`, `lab_documents`/`lab_extractions`, `metrics`, `protocol_versions`, `supplements`; `appRoleEnum`.
- `remix-app/app/lib/invites.server.ts` — `generateInvite` / `resolveInviteByToken` / `consumeInviteByToken` / `listInvites` / `revokeInvite`. **Extend to carry `subjectId` (D-01).**
- `remix-app/app/lib/db.server.ts` — `withTenantDb(ctx, fn)` + `TenantCtx { userId, tenantId, subjectId }`; `SET LOCAL` GUC + `app_user` role pattern.
- `remix-app/app/lib/data.server.ts` — `getOwnerSubject(tenantId)` (the resolver to replace with `getActiveSubject`, D-04) + `TenantCtx` bootstrap.
- `remix-app/app/lib/authz.server.ts` — `requireUser`, `requireRole`, `assertSubjectAccess`, `requireSubjectCtx`, `CAPABILITIES`, `can`. **Reuse `assertSubjectAccess` for cookie validation (D-04).**

### Existing practitioner-facing surfaces to learn from / connect to
- `remix-app/app/routes.ts` — explicit route table; register `/clients` here.
- `remix-app/app/routes/_app/settings/assignments.tsx` — owner-only subject/practitioner/assignment admin (closest analog for create + list patterns).
- `remix-app/app/routes/_app/settings/index.tsx` + `settings/invites.ts` — invite generation/revocation UI + resource route.
- `remix-app/app/routes/_app/ingest/consent.tsx` — consent flow (consent_log) + houses **WR-02** (Phase 5, not this phase).

### Auth integration
- `remix-app/app/lib/auth.server.ts` — Better-Auth hooks: `beforeSignUp` (resolve invite), `user.create.before` (burn invite + inject role/tenant), `user.create.after` (audit). The redemption→subject-link wiring lands here/adjacent.

> Note: `.planning/codebase/*.md` maps are dated 2026-06-07 (pre-v1.0 build) and are **stale** (they describe a no-auth, static-data, 8-table app). Trust the live code above over those maps.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Invite system** (`invites.server.ts`): full generate/resolve/consume/list/revoke, SHA-256-hashed single-use 7-day tokens, role policy (owner→practitioner|client, practitioner→client). Reuse as-is; only add `subjectId` binding.
- **`assertSubjectAccess` / `requireSubjectCtx`** (`authz.server.ts`): already enforces client-role 403, cross-tenant IDOR block, and practitioner→assigned-subject gating. The active-subject cookie validates through this — no new authz logic needed.
- **`withTenantDb` + GUC RLS** (`db.server.ts`): the proven scoping mechanism. New `/clients` loaders and checklist queries run inside it.
- **`practitioner_subject_assignments`** (schema): already supports "practitioner sees a subset of clients" — the v1.1 owner case is the trivial (tenant-wide) case of it.

### Established Patterns
- **One resolver, many loaders:** every PHI loader funnels subject resolution through `getOwnerSubject` today → replacing it with `getActiveSubject` propagates scoping everywhere with one change. Lowest-risk integration point.
- **Parse→review→approve gates** exist for genetics + labs → the checklist's 3-state (D-10) reads real pipeline status, not a boolean.
- **Explicit route registration** (`routes.ts`, not file-convention) — add `/clients` (+ children) there.

### Integration Points
- **App shell / `_app/layout.tsx`** — host the persistent active-subject chip (D-05); needs a loader that lists subjects the user may switch to.
- **Subject resolver** (`data.server.ts`) — swap point for `getActiveSubject` (D-04).
- **`invites` schema + `invites.server.ts` + `auth.server.ts` redemption hooks** — the subjectId-binding seam (D-01).
- ⚠ **Dashboard cessation tracker** reads a **hardcoded owner start date** (`protocol-data.ts`, `2025-12-23`) duplicated across `home.tsx` / `protocol/index.tsx` loaders. Once subject scoping goes live, a client subject has no cessation data → the dashboard needs a sane **per-subject empty / non-cessation state**. Planner: handle this when wiring active-subject scoping (don't let it crash/mislead for a client).
</code_context>

<specifics>
## Specific Ideas

- The active-subject chip should make "I'm operating on CLIENT X" unmistakable — the user explicitly chose the persistent always-visible chip over a quieter dropdown for PHI safety.
- The checklist should be **truthful** — green only when data is genuinely approved/present, mirroring the PROOF-01 sequence (create → genetics+labs+WHOOP → report → protocol).
- The `/clients` row should show the full loop at a glance (e.g., `intake✓ gen• lab∘ whp✓ report∘ protocol∘`).
- **User framing on programs:** "cessation is a specific type of program. Some clients may be tapering substances, or making other major lifestyle modifications. same principle with phased gates etc. but needs to be flexible and adaptive to not only cessation of substance." → Phase 1 takes the *seed* (program type field); the engine is deferred.
- **User framing on the practice:** "practice will also have other practitioners, with permissions access to subset of clients, subset of features. This will come later in rounds plan." → confirms the one-tenant/multi-subject/assignment model; feature-level perms are v1.2+.
</specifics>

<deferred>
## Deferred Ideas

- **Generalized adaptive phased-program engine** — cessation as one program type among substance-taper, lifestyle-modification, general optimization, etc.; per-subject phased gates replacing the hardcoded `CESSATION_PHASES`; per-subject program rendering on the dashboard. *Likely near Phase 4 (per-client protocol authoring) or a dedicated future phase — flag to roadmap.* Phase 1 captures only the `programType` + start-date seed (D-08).
- **Per-practitioner feature-level permissions** — a practitioner sees a subset of *features*, not just a subset of clients (granular RBAC). User's "rounds plan" → **v1.2+**.
- **Invite email delivery** — invites are currently out-of-band (raw token shown once). Wiring actual email/SMS delivery is later.
- **v1.2 at-scale subject-switcher UX, multi-practitioner management, client self-service** — already parked in `v1.2-OPERATIONS-PLAN.md`; the `/clients` page here is deliberately a thin management surface, not that switcher.

### Carried verification (satisfy in this phase, not a design decision)
- **Phase 03.1 residual UAT** — invite-redemption end-to-end in a private window + client-role 403 with a real client account. Gets real traffic via ONB-02/ONB-03; close it here.

</deferred>

---

*Phase: 1-Client Onboarding (practitioner-operated)*
*Context gathered: 2026-06-14*
