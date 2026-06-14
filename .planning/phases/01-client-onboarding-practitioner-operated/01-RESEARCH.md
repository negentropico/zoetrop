# Phase 1: Client Onboarding (practitioner-operated) — Research

**Researched:** 2026-06-14
**Domain:** Multi-subject tenancy extension — invite flow, active-subject resolver, schema intake fields, onboarding checklist, PHI-loader scoping
**Confidence:** HIGH (all findings are from live code reads, not training assumptions)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Create the subject first, then invite. Invite is bound to an existing `subjectId`; the `invites` table needs a nullable `subjectId` column.

**D-02:** One practice tenant. Owner + clients are subjects within the tenant. `practitioner_subject_assignments` handles practitioner→subject scoping. Do NOT build tenant-per-client.

**D-03:** Invite redemption is optional / non-blocking for v1.1. The subject and all data are fully usable whether or not the client redeems.

**D-04:** Server-set `httpOnly` cookie holds `activeSubjectId`. Introduce `getActiveSubject(ctx)` resolver: `id = cookie ?? ownerSubject.id`, validated through the existing `assertSubjectAccess`. Swap `getOwnerSubject` → `getActiveSubject` across the PHI loaders. Do NOT thread `subjectId` through URLs.

**D-05:** Persistent identity chip + switcher in the app shell — always-visible `Viewing: <name> ▾` on every screen.

**D-06:** Default to owner on each fresh login; session-scoped cookie. Closing the browser resets to owner.

**D-07:** Intake fields: DOB + biological sex (clinical core), contact (email + optional phone), goals + intake notes (free text), program start date.

**D-08:** Program is type-aware, not cessation-only. Intake records a `programType` field (cessation / substance-taper / lifestyle-modification / general). Adaptive phased-gate engine is deferred.

**D-09:** Checklist tracks the full onboarding-to-first-protocol loop: Intake + consent → Genetics + Labs + WHOOP → Report + Protocol v1 → Account status.

**D-10:** "Done" = honest 3-state (missing / in-progress / done). Genetics and labs done only when review-APPROVED. WHOOP done when present. Report done when generated. Protocol done when v1 authored.

**D-11:** Dedicated `/clients` page: lists client subjects with checklist status, hosts create-client + intake form + invite generation.

### Claude's Discretion

- Exact schema column shapes (enum vs varchar for program type / biological sex; DOB as date vs timestamp)
- Cookie name/flags
- Resolver file placement
- Visual styling of chip and `/clients` page (defer to Zoetrop design system)

### Deferred Ideas (OUT OF SCOPE)

- Generalized adaptive phased-program engine (deferred Phase 4+)
- Per-practitioner feature-level permissions (v1.2+)
- Invite email delivery (later)
- v1.2 at-scale subject-switcher UX, multi-practitioner management, client self-service
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ONB-01 | A practitioner can create a client (subject) record with intake basics | Schema delta (`subjects` table extension), `/clients` route, create-client action |
| ONB-02 | A practitioner can invite/provision a client account linked to that subject | `invites` table `subjectId` column, `generateInvite` extension, redemption seam in `auth.server.ts` |
| ONB-03 | A practitioner can select the active subject and all PHI surfaces scope to it | `getActiveSubject` resolver, cookie read/write pattern, swap across 13 call-sites enumerated below |
| ONB-04 | An onboarding surface tracks each client's required inputs as a checklist | Approval-state queries against `lab_documents`/`lab_extractions`, `subject_genotypes`, `reports`, `protocol_versions`; `consent_log` |
</phase_requirements>

---

## Summary

Phase 1 extends the v1.0 single-subject app to support a second subject (a real client). Every mechanism already exists — the invite system is fully built, `practitioner_subject_assignments` is already in the schema, `assertSubjectAccess` already handles per-assignment practitioner gating — this phase wires them together with three new pieces: (1) a `subjectId` column on `invites` so an invite can bind to an existing subject; (2) a `getActiveSubject` resolver + httpOnly cookie so every PHI loader scopes to whichever subject the practitioner has selected; (3) an intake schema extension on `subjects` and a `/clients` management page.

The critical implementation insight is that `requireSubjectCtx` in `authz.server.ts` is the single swap point for active-subject scoping: it calls `getOwnerSubject` today (line 135). Replacing that one call with `getActiveSubject` propagates correct scoping to all 13 PHI loaders simultaneously. However, `requireSubjectCtx` currently hard-codes `getOwnerSubject` — the new resolver must be threaded in carefully because `requireSubjectCtx` needs the cookie from the Request to read `activeSubjectId`.

The cessation dashboard is the main landmine: `dashboard.tsx` reads cessation data from the DB (correctly scoped) but renders a phasing hero card that will show "Day 0 · Acute" with no-data for a client who has no cessation log. This is not a crash but is misleading. A safe empty-state guard is needed.

**Primary recommendation:** Build in this order — (1) schema migration, (2) `getActiveSubject` + cookie resource route, (3) swap `requireSubjectCtx` to use `getActiveSubject`, (4) invites `subjectId` extension + redemption wiring, (5) `/clients` page + create-client action, (6) onboarding checklist queries, (7) app-shell chip.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Active-subject cookie write | API / Backend (resource route action) | — | httpOnly cookie must be set via Set-Cookie header from the server — client JS cannot read it |
| Active-subject cookie read | API / Backend (layout loader + data resolvers) | — | Read on every request in `requireSubjectCtx` / layout loader |
| PHI scoping | API / Backend (`data.server.ts` + `withTenantDb`) | Database RLS | All data reads are already RLS-governed; scoping changes stay in the resolver layer |
| Identity chip / switcher UI | Browser / Client (AppShell component) | Frontend Server (layout loader populates subject list) | Chip is client-rendered but seeded by layout loader data |
| Subject creation (intake form) | API / Backend (action in `/clients` route) | — | Writes to `subjects` table via server action |
| Invite generation | API / Backend (resource route action) | — | Existing pattern in `settings/invites.ts` |
| Invite redemption → subject link | API / Backend (`auth.server.ts` hooks) | — | Better-Auth `user.create.before` is the atomic write point |
| Onboarding checklist queries | API / Backend (loader in `/clients` detail or index) | Database | Reads approval state from `lab_documents`, `lab_extractions`, `subject_genotypes`, `reports`, `protocol_versions` |
| Consent gate | API / Backend (`consent_log`) | — | Already implemented in `ingest/consent.tsx`; checklist reads it |

---

## PHI Loader Call-Site Inventory (Open Question 1 — ANSWERED)

The call-site audit distinguishes two patterns in use today:

**Pattern A: `requireSubjectCtx(request)` (via `authz.server.ts` L127)**
These call one function; swapping `getOwnerSubject` → `getActiveSubject` inside `requireSubjectCtx` fixes all of them simultaneously.

| Route file | Loader line |
|-----------|-------------|
| `routes/_app/dashboard.tsx` | L107 |
| `routes/_app/insights/correlations.tsx` | L27 |
| `routes/_app/insights/genetics.tsx` | L57 |
| `routes/_app/insights/index.tsx` | L32 |
| `routes/_app/metrics/category.tsx` | L61 |
| `routes/_app/metrics/detail.tsx` | L41 |
| `routes/_app/metrics/index.tsx` | L55 |
| `routes/_app/protocol/cessation.tsx` | L23 |
| `routes/_app/protocol/compare.tsx` | L26 |
| `routes/_app/protocol/index.tsx` | L28 |
| `routes/_app/protocol/supplements.tsx` | L32 |
| `routes/_app/protocol/version-detail.tsx` | L21 |
| `routes/_app/protocol/versions.tsx` | L22 |

**Total Pattern A: 13 loaders — all fixed by one change to `requireSubjectCtx`.**

**Pattern B: `getOwnerSubject(user.tenantId!)` called directly (NOT through `requireSubjectCtx`)**
These are NOT PHI data read loaders — they are management/action surfaces that need manual scoping changes:

| Route file | Lines | Context |
|-----------|-------|---------|
| `routes/_app/import/vault.tsx` | L58 | Import loader — Phase 2 scope; defer |
| `routes/_app/import/whoop.tsx` | L94 | Import loader — Phase 2 scope; defer |
| `routes/_app/ingest/consent.tsx` | L35, L60 | Consent loader + action — active-subject aware post-switch |
| `routes/_app/ingest/index.tsx` | L53 | Ingest index loader |
| `routes/_app/ingest/review.tsx` | L59 | Ingest review loader |
| `routes/_app/ingest/upload.tsx` | L70 | Upload action |
| `routes/_app/reports/detail.tsx` | L55 | Report detail loader |
| `routes/_app/reports/generate.tsx` | L46 | Report generate loader + action |
| `routes/_app/reports/index.tsx` | L33 | Reports list loader |
| `routes/_app/settings/assignments.tsx` | L72, L121 | Admin — owner-only, intentionally owner-scoped; do NOT swap |

**Decision on Pattern B:** Import routes (vault, whoop) are Phase 2 scope — leave them on `getOwnerSubject` for now (they only ingest owner's data, which is valid for v1.1 single-client pilot). Ingest pipeline routes (consent, review, upload, ingest index, document) and report routes SHOULD be swapped to `getActiveSubject` so a practitioner can upload/review labs for a client subject. `settings/assignments.tsx` is intentionally owner-context and must NOT be changed.

**Revised total: 13 Pattern-A loaders via one `requireSubjectCtx` change + 7 Pattern-B ingest/report loaders manually updated. 2 import routes deferred. `settings/assignments.tsx` unchanged.**

---

## Engine / Reference-Range Analysis (Open Question 2 — ANSWERED)

`engine.ts` (`app/lib/engine.ts`) contains four functions:

1. `classifyMetricStatus(metric: Metric)` — classifies a metric against `optimalRange` and `referenceRange` properties already stored **on the metric row itself** in the `metrics` table (`referenceMin`, `referenceMax`, `optimalMin`, `optimalMax` columns in `schema.ts` L118–121). It does NOT read biological sex or age.

2. `getCessationDay(startDateIso, now)` — pure date math, no demographics.

3. `getCessationPhase(day)` — pure lookup in `CESSATION_PHASES`, no demographics.

4. `mapVariantToProtocol(genotypes, variantMaps)` — pure corpus join, no demographics.

**Finding:** The engine does NOT currently consume biological sex or age. Reference ranges are stored per-metric-row (embedded at import time from the lab report) and are NOT computed from demographics. The `metricProtocolMap` triggers on status strings (`deficient`/`excess`/`borderline`/`any_non_optimal`) with no sex/age filter.

**Implication for D-07/D-08 schema:** DOB + biological sex fields on `subjects` are forward-looking infrastructure — they are NOT required by any current engine consumer. The schema should add them (they will be needed once reference ranges are personalized), but Phase 1 does not need to wire them into any engine call. Capture them at intake; engine use is Phase 3+.

---

## Cessation State Analysis (Open Question 3 — ANSWERED)

The hardcoded `CESSATION_START_DATE = "2025-12-23T00:00:00.000Z"` lives in `app/lib/protocol-data.ts` (L28). The comment in that file states explicitly: "It is NOT a runtime input to `getCessationDay` — the day calculation reads the `startDateIso` parameter passed from the DB `cessation_log` row."

**Current runtime flow in `dashboard.tsx` (L177–185):**
```typescript
const cessation = cessationRows[0] ?? null;
const cessationDay = cessation
  ? getCessationDay(cessation.startDate.toISOString(), now)
  : 0;
const cessationPhase = getCurrentCessationPhase(cessationDay);
```

When `cessation` is null (no `cessation_log` row for the active client subject), `cessationDay = 0` and `cessationPhase = CESSATION_PHASES[0]` (Acute phase), and `targetDay = 150`. The dashboard renders: "Day 0 / 150 DAYS — Acute Phase" with a phase bar showing day 0.

**The same null-cessation path exists in `protocol/index.tsx` (L63–71):**
```typescript
const cessationDay = cessation ? getCessationDay(...) : 0;
const cessationPhase = getCurrentCessationPhase(cessationDay);
```

**What the planner needs to handle:** For a client subject who has no cessation log (which will be true for all new clients in Phase 1), the dashboard shows "Day 0 · Acute" and the phasing hero card is rendered with day 0 markers. This is not a crash, but it is misleading for a client on a non-cessation program. The correct empty state is: **conditionally hide or replace the phasing hero card** when `cessation === null` and the active subject is not the owner.

A minimal approach: when `cessation === null`, return `cessationDay: null` from the loader and add a guard in the component: show an "No program started" placeholder instead of the Phase Bar. The `protocol/cessation.tsx` route should also guard on null cessation.

`CESSATION_START_DATE` constant itself is only used as documentation and as an export from `protocol-data.ts`. It is not referenced in any loader; no grep hit surfaces it in routes. Safe to ignore for Phase 1.

---

## Invite → Subject Link Seam (Open Question 4 — ANSWERED)

**Current `invites` table schema (`db/schema.ts` L96–110):**
```typescript
export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  role: appRoleEnum('role').notNull(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  createdBy: text('created_by').notNull().references(() => user.id),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  consumedBy: text('consumed_by').references(() => user.id),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, ...)
```

**Schema delta required (D-01):** Add `subjectId text('subject_id').references(() => subjects.id)` — nullable, no `.notNull()`. An owner-bootstrap invite has no subject; a client invite is bound to one.

**`invites.server.ts` — what to extend:**

- `GenerateInviteOpts` interface: add `subjectId?: string` to the options struct and pass it to the `db.insert(invites).values({...})` call.
- `resolveInviteByToken` currently returns `{ role: string; tenantId: string }`. Extend return to `{ role: string; tenantId: string; subjectId: string | null }` so auth hooks can retrieve it.
- `consumeInviteByToken` similarly — extend return type to include `subjectId`.

**Redemption → subject-link wiring in `auth.server.ts`:**

The `user.create.before` hook (L167–196) currently:
1. Reads `pending` (the `PendingInvite` request-state slot)
2. Calls `consumeInviteByToken(pending.rawToken)` → returns `{ role, tenantId }`
3. Injects `role` + `tenantId` onto the new user row

**What needs to change:** After redemption, the hook has the `subjectId` from the burned invite. It needs to write a `practitioner_subject_assignments` row (or simply update the `invites.consumedBy` field — that already happens). But actually, the subject link is *not* about adding the user to an assignment table — it's about linking the user's account to the subject. The v1.1 model: the client's user account has `role: "client"` and `tenantId`. The subject already exists. The practitioner can then optionally create a `practitioner_subject_assignments` row for themselves → the client subject (but this may already be done at subject creation time).

**Correct v1.1 wiring:** At subject creation, the owner automatically has access (owner → all subjects). The invite is `role: "client"` and `subjectId: <id>`. When the client redeems, their user account gets `role: "client"`, `tenantId`. The `invites.subjectId` is informational — it records which subject the client account is meant to correspond to. A follow-up step in `user.create.after` can log the `subjectId` association to the audit log. No additional table write is strictly needed for v1.1 (the practitioner operates on subjects directly; the client cannot log in and do anything in v1.1). The `invites.subjectId` column primarily serves the invite UI (shows "linked to: Client X") and future self-service.

**`PendingInvite` interface extension:** Add `subjectId: string | null` alongside `role`, `tenantId`, `rawToken`, `breakGlass`. Thread through `beforeSignUp` → `pendingInvite.set({..., subjectId: invite.subjectId})` → `user.create.after` for audit logging.

---

## Active-Subject Cookie + Resolver (Open Question 5 — ANSWERED)

**Existing cookie pattern in this repo:**

The repo uses raw cookie header parsing via regex (not React Router's `createCookie` utility). Proof in `_app/layout.tsx`:
```typescript
const cookie = request.headers.get("Cookie") ?? "";
const navCollapsed = /(?:^|;\s*)zt-nav=1(?:\s*;|$)/.test(cookie);
```

The `zt-nav` cookie is written client-side by `AppShell.tsx`:
```typescript
document.cookie = "zt-nav=" + (next ? "1" : "0") + "; Path=/; Max-Age=31536000; SameSite=Lax";
```

**The `activeSubjectId` cookie is different:** it must be `httpOnly` (no client JS write) and session-scoped (no `Max-Age` / `Expires` so it clears on browser close per D-06). It must be set by a server action and read in loaders.

**Recommended pattern — resource route approach:** Create `app/routes/_app/subject-switch.ts` as a resource route (POST action, no loader). The action: (1) validates the requested `subjectId` via `assertSubjectAccess`, (2) sets a `Set-Cookie: zt-subject=<subjectId>; Path=/; HttpOnly; SameSite=Lax` header on a redirect back. The cookie has no `Max-Age`/`Expires` → session-scoped per D-06.

**Reading the cookie:** In `getActiveSubject(request, tenantId)`:
```typescript
export async function getActiveSubject(request: Request, tenantId: string) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const match = /(?:^|;\s*)zt-subject=([^;]+)/.exec(cookieHeader);
  const activeSubjectId = match?.[1] ?? null;
  
  const db = getDb();
  
  if (activeSubjectId) {
    const [candidate] = await db
      .select().from(subjects)
      .where(and(eq(subjects.id, activeSubjectId), eq(subjects.tenantId, tenantId)))
      .limit(1);
    if (candidate) return candidate; // validated: same tenant
  }
  // Fallback: owner subject (first in tenant)
  const [owner] = await db.select().from(subjects)
    .where(eq(subjects.tenantId, tenantId)).limit(1);
  if (!owner) throw new Response("Subject not found", { status: 404 });
  return owner;
}
```

**Placement:** `app/lib/data.server.ts` — alongside `getOwnerSubject`. It uses the admin db path for the same reason `getOwnerSubject` does (bootstrapping before TenantCtx exists).

**`requireSubjectCtx` swap:** Change `authz.server.ts` L135:
```typescript
// Before:
const subject = await getOwnerSubject(user.tenantId!);
// After:
const subject = await getActiveSubject(request, user.tenantId!);
```
Add `request` to the call since `requireSubjectCtx` already receives `request: Request` (L127).

**Build gate risk:** `getActiveSubject` uses `getDb()` (not `withTenantDb`), same as `getOwnerSubject`. It stays on the admin path correctly. The function must live in `data.server.ts` (`.server.ts` suffix) to prevent leaking into the client bundle — critical given the known build-gate landmine.

**`assertSubjectAccess` for cookie validation:** The cookie-based switch POSTs to the resource route, which calls `assertSubjectAccess(user, candidate, user.tenantId!, assignedSubjectIds)` before setting the cookie. This reuses the existing Gate 2 (cross-tenant) and Gate 3 (practitioner→assignment) checks. No new authz logic needed.

---

## Subjects Schema Today vs. Intake Delta (Open Question 6 — ANSWERED)

**Current `subjects` table (`db/schema.ts` L241–247):**
```typescript
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Drizzle enum convention in this repo:** The schema uses `pgEnum` for constrained sets (see `appRoleEnum`, `metricCategoryEnum`, `cessationPhaseEnum`). New enum columns follow the pattern:
```typescript
export const someEnum = pgEnum('some_name', ['val1', 'val2']);
// Usage:
someField: someEnum('some_field').notNull()
```

**Proposed additions (D-07/D-08 intake fields):**

```typescript
// New enum (add to enums block at top of schema.ts)
export const biologicalSexEnum = pgEnum('biological_sex', ['male', 'female', 'intersex']);
export const programTypeEnum = pgEnum('program_type', [
  'cessation',
  'substance_taper',
  'lifestyle_modification',
  'general',
]);

// Additions to subjects table
dob: timestamp('dob'),                                   // nullable — DOB as DATE (stored as timestamp)
biologicalSex: biologicalSexEnum('biological_sex'),      // nullable — drives future reference-range personalization
contactEmail: varchar('contact_email', { length: 255 }), // nullable — informational; invite token shown out-of-band
contactPhone: varchar('contact_phone', { length: 50 }),  // nullable
goals: text('goals'),                                    // nullable — free text
intakeNotes: text('intake_notes'),                       // nullable — free text
programType: programTypeEnum('program_type'),            // nullable — cessation | substance_taper | lifestyle_modification | general
programStartDate: timestamp('program_start_date'),       // nullable — when the program began
```

**House style notes:**
- Use `timestamp` not `date` for DOB and programStartDate — consistent with every other date column in the schema.
- Use `varchar` for contact fields — consistent with `displayName`, `fileName`, etc.
- Use `pgEnum` for `biologicalSex` and `programType` — consistent with `appRoleEnum`, `cessationPhaseEnum`.
- All new columns are nullable (no `.notNull()`) — not all subjects will have all fields.

**Migration workflow:**
```bash
cd remix-app
npm run db:generate   # generates migration SQL from schema.ts changes
npm run db:migrate    # applies to Neon (uses DATABASE_URL_UNPOOLED for direct connection)
```

The invites schema change (add `subjectId`) goes in the same migration batch:
```typescript
// In invites table definition:
subjectId: text('subject_id').references(() => subjects.id),  // nullable
```

---

## Onboarding Checklist 3-State Logic (Open Question 7 — ANSWERED)

**Checklist dimensions and their approval signals:**

**Intake + consent:**
- Source: `consent_log` table (`db/schema.ts` L386–397). One row per subject consent.
- Query: `SELECT COUNT(*) FROM consent_log WHERE subject_id = ?`. Count > 0 → consent done.
- Intake "done": all required intake fields on `subjects` row are non-null (displayName + dob + biologicalSex minimum).

**Genetics:**
- Source: `subject_genotypes` table. But D-10 says "done when review-APPROVED" — genetics come in via the ingest pipeline (Phase 2: ING-01). In Phase 1, the checklist state for genetics is: `subject_genotypes` rows exist → "in progress" (data uploaded but not review-gate complete if we treat it as needing a review step). However, `subject_genotypes` has no `status` column — it stores the final approved genotypes directly. The review gate for genetics is the practitioner uploading and approving the PureInsight report (ING-01, Phase 2).
- **For Phase 1 checklist:** genetics "done" = `subject_genotypes` count > 0 (pragmatic — the review gate is a Phase 2 concern). The checklist can show "pending" when 0 rows exist and "done" when rows exist. Flag this as a simplification; Phase 2 can refine.

**Labs:**
- Source: `lab_documents` + `lab_extractions` tables. Approval state lives in `lab_extractions.status` (`labExtractionStatusEnum`: `pending_review | approved | rejected`).
- "Done" when at least one `lab_extractions` row has `status = 'approved'` for this subject.
- "In progress" when `lab_documents` rows exist but no approved extractions.
- "Missing" when no `lab_documents` for this subject.
- Query (simplified): 
  ```sql
  SELECT 
    COUNT(*) FILTER (WHERE ld.subject_id = ?) AS doc_count,
    COUNT(*) FILTER (WHERE le.status = 'approved' AND le.subject_id = ?) AS approved_count
  FROM lab_documents ld
  LEFT JOIN lab_extractions le ON le.lab_document_id = ld.id
  WHERE ld.subject_id = ? AND ld.tenant_id = ?
  ```

**WHOOP:**
- Source: `metrics` table, `category = 'autonomic'` and `source = 'whoop'`.
- "Done" when at least one metric row with `source = 'whoop'` and `subject_id = ?` exists.
- Query: `SELECT COUNT(*) FROM metrics WHERE subject_id = ? AND source = 'whoop'`.

**Report:**
- Source: `reports` table.
- "Done" when `SELECT COUNT(*) FROM reports WHERE subject_id = ? AND tenant_id = ?` > 0.

**Protocol:**
- Source: `protocol_versions` table.
- "Done" when `SELECT COUNT(*) FROM protocol_versions WHERE subject_id = ? AND tenant_id = ?` > 0.

**Account status (informational):**
- Source: `invites` table. Find the invite where `tenant_id = ?` AND `subject_id = ?`.
- States: no invite (not sent), invite exists + `consumedAt IS NULL` + `revokedAt IS NULL` (sent, pending redemption), `consumedAt IS NOT NULL` (redeemed).

**Checklist loader location:** The `/clients` page loader runs all these queries for each client subject and returns a `ChecklistStatus` object per subject. Run them in a single `Promise.all` per subject or batch across subjects.

---

## 03.1 Residual UAT (Open Question 8 — ANSWERED)

From `REQUIREMENTS.md` (L40–41) and `STATE.md` (L87):

**What was left open:**
1. **Invite-redemption end-to-end in a private window:** The flow is: generate invite → copy raw token → open private/incognito window → navigate to `/signup?token=<raw_token>` → complete signup form → verify the new user gets `role: "client"`, `tenantId` injected (not the default `role: "client"`, `tenantId: null`).
2. **Client-role 403 with a real client account:** Log in as the newly-created client user → attempt to navigate to any PHI route (e.g., `/dashboard`, `/metrics`) → verify `assertSubjectAccess` Gate 1 fires and returns 403.

**Why this gets closed in Phase 1:** Once a real client subject exists and a real invite is generated with `subjectId` bound to it, the existing invite machinery (which was already correct — the 03.1 UAT was flagged as "gets real traffic" not "broken") runs through its full path. The redemption hooks in `auth.server.ts` are already implemented. The client-role 403 is enforced by `requireSubjectCtx` → `assertSubjectAccess` Gate 1 (client → always 403). Both flows are exercised when a real second user exists.

**Manual test protocol for SC-5:**
1. As owner: create client subject → generate invite → copy token.
2. Private window: `GET /signup?token=<raw_token>` → sign up → verify user row in DB has `role: "client"`, `tenantId: <same>`.
3. As client: attempt `GET /dashboard` → verify 403 response (not a redirect, not 200).
4. Verify invite row has `consumedAt` set and `consumedBy` = new user's id.

---

## Standard Stack

No new packages required. All implementation uses existing dependencies:

| Component | Existing Dependency | Version |
|-----------|---------------------|---------|
| Cookie parsing | Raw regex on `request.headers.get("Cookie")` — repo pattern | — |
| Cookie setting | `Set-Cookie` header on Response — React Router 7 idiom | react-router 7.12.0 |
| DB queries | `drizzle-orm` + `@neondatabase/serverless` | 0.45.1 / 1.0.2 |
| Schema | `drizzle-kit` for migration generation | 0.31.8 |
| Auth hooks | `better-auth` | 1.6.15 |
| Type safety | TypeScript strict mode | 5.9.2 |

**Package Legitimacy Audit:** No new packages. Section not applicable.

---

## Architecture Patterns

### Active-Subject Resolver Data Flow

```
Request → _app/layout.tsx loader
         ├─ auth.api.getSession() → user { role, tenantId }
         ├─ parse "zt-subject" cookie → activeSubjectId | null
         └─ resolve subject list for chip → [ownerSubject, ...clientSubjects]

Request → any PHI loader (dashboard, metrics, etc.)
         └─ requireSubjectCtx(request)
              ├─ requireUser(request) → user { id, role, tenantId }
              ├─ getActiveSubject(request, user.tenantId!) → subject
              │    ├─ parse "zt-subject" cookie
              │    ├─ SELECT from subjects WHERE id = cookie AND tenantId = tenant
              │    └─ fallback: SELECT first subject WHERE tenantId = tenant
              ├─ assertSubjectAccess(user, subject, user.tenantId!) → void | 403
              └─ return { user, subject, ctx: { userId, tenantId, subjectId } }

POST /subject-switch (resource route)
         ├─ requireUser(request)
         ├─ assertSubjectAccess(user, candidate, tenantId, [assigned ids if practitioner])
         ├─ Set-Cookie: zt-subject=<subjectId>; Path=/; HttpOnly; SameSite=Lax
         └─ redirect(back)
```

### Project Structure Additions

```
remix-app/app/
├── lib/
│   ├── data.server.ts        # ADD: getActiveSubject(), listSubjectsForTenant()
│   └── subjects.server.ts    # NEW: createSubject(), getSubjectById(), listClientSubjects()
├── routes/
│   └── _app/
│       ├── layout.tsx        # EXTEND: load activeSubject + subjectList for chip
│       ├── subject-switch.ts # NEW: resource route — POST sets zt-subject cookie
│       └── clients/
│           ├── index.tsx     # NEW: client list + checklist status
│           └── new.tsx       # NEW: create client + intake form (or inline in index)
└── components/
    └── shell/
        └── SubjectChip.tsx   # NEW: "Viewing: <name> ▾" switcher component
```

### Cookie Write Pattern (React Router 7 resource route)

```typescript
// app/routes/_app/subject-switch.ts
import { redirect } from "react-router";
import { requireUser } from "~/lib/authz.server";
import { assertSubjectAccess } from "~/lib/authz.server";
import { getDb } from "~/lib/db.server";
import { subjects } from "../../../db/schema";
import { eq, and } from "drizzle-orm";

export async function action({ request }: { request: Request }) {
  const { user } = await requireUser(request);
  const form = await request.formData();
  const subjectId = String(form.get("subjectId") ?? "");
  
  const db = getDb();
  const [candidate] = await db.select().from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.tenantId, user.tenantId!)))
    .limit(1);
  
  if (!candidate) throw new Response("Subject not found", { status: 404 });
  assertSubjectAccess(user, candidate, user.tenantId!);
  
  const referer = request.headers.get("Referer") ?? "/dashboard";
  return redirect(referer, {
    headers: {
      "Set-Cookie": `zt-subject=${subjectId}; Path=/; HttpOnly; SameSite=Lax`,
    },
  });
}
```

### subjects.server.ts Pattern

```typescript
// app/lib/subjects.server.ts
import { getDb } from "./db.server";
import { subjects } from "../../db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function createSubject(data: {
  id: string; tenantId: string; displayName: string;
  dob?: Date; biologicalSex?: string; contactEmail?: string;
  contactPhone?: string; goals?: string; intakeNotes?: string;
  programType?: string; programStartDate?: Date;
}) {
  const db = getDb();
  const [row] = await db.insert(subjects).values(data).returning();
  return row;
}

export async function listClientSubjects(tenantId: string, ownerSubjectId: string) {
  const db = getDb();
  return db.select().from(subjects)
    .where(and(eq(subjects.tenantId, tenantId), ne(subjects.id, ownerSubjectId)));
}
```

### Anti-Patterns to Avoid

- **Do NOT set `zt-subject` cookie from client JS:** httpOnly requirement means only server-set headers. The `zt-nav` cookie is client-JS-writable because it is non-sensitive preference state. `zt-subject` is PHI-context selection and must be server-set.
- **Do NOT put `subjectId` in the URL:** D-04 decision. The v1.2 path uses URLs; v1.1 uses the cookie.
- **Do NOT call `getActiveSubject` inside `withTenantDb`:** It uses the admin db path (`getDb()`) intentionally — the same reasoning as `getOwnerSubject`. It bootstraps the `subjectId` needed to construct `TenantCtx`.
- **Do NOT skip `assertSubjectAccess` in the subject-switch action:** A client role user must not be able to switch to another client's subject even within the same tenant.
- **Do NOT import `data.server.ts` functions in client-only components:** Build gate enforces this. Any function calling `getDb()` must stay in `.server.ts` files.
- **Do NOT render the cessation phasing card for a subject with no cessation log without a null guard:** It will not crash (cessationDay defaults to 0) but it is misleading and will show "Day 0 · Acute" for every non-cessation client.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie parsing | Custom cookie parser | Raw regex pattern — already established in this repo (`zt-nav` pattern in `layout.tsx`) | Repo has a consistent cookie-read idiom; consistency matters more than library overhead |
| Token generation | Custom UUID/random | `crypto.randomUUID()` (already used for subject IDs), `randomBytes` (already used in `invites.server.ts`) | Already standardized |
| Subject access gate | Custom role check | `assertSubjectAccess` in `authz.server.ts` | It already handles 5 cases correctly including Gate 3 per-assignment |
| Invite token lifecycle | Custom token | Existing `generateInvite` / `consumeInviteByToken` / `resolveInviteByToken` | SHA-256, single-use, race-safe — don't re-implement |
| Assignment lookup | Custom query | `listAssignments` / `assignSubject` in `assignments.server.ts` | Already exists with RLS wrapper |

---

## Common Pitfalls

### Pitfall 1: `requireSubjectCtx` does NOT receive Request today — but it does

**What goes wrong:** Developer assumes `requireSubjectCtx` only takes `request` (which it does, L127 signature), then tries to read the cookie inside `requireSubjectCtx` without passing request — but `requireSubjectCtx` already has `request: Request` as its parameter. This is fine.

**The real risk:** `requireSubjectCtx` currently calls `getOwnerSubject(user.tenantId!)` (L135) without passing `request`. The new `getActiveSubject` needs `request` as its first argument. The swap is straightforward — just pass `request` through.

### Pitfall 2: Session cookie vs. httpOnly cookie — client JS cannot read httpOnly

**What goes wrong:** Developer tries to write `zt-subject` cookie from client JS (like `zt-nav`) to avoid a round-trip server action. httpOnly cookies are not accessible via `document.cookie`.

**How to avoid:** The subject-switch action is a `POST` to a resource route. The `SubjectChip` component submits a `<Form method="post" action="/subject-switch">` with a hidden `subjectId` field.

### Pitfall 3: The Pattern-B `getOwnerSubject` callers in ingest/reports will still scope to owner

**What goes wrong:** After swapping `requireSubjectCtx`, the 13 Pattern-A loaders correctly scope to the active client. But ingest/upload, ingest/review, ingest/consent, and report routes still call `getOwnerSubject` directly — so a practitioner operating on a client subject uploads to the *owner's* subject row.

**How to avoid:** Update Pattern-B ingest and report loaders in the same wave as the Pattern-A swap. The `settings/assignments.tsx` pattern-B caller is intentionally owner-scoped and must NOT be changed.

### Pitfall 4: Schema migration order — `invites.subjectId` references `subjects.id`

**What goes wrong:** If the migration file adds `subject_id` to `invites` before the FK target (`subjects`) is updated, the migration fails (FK to non-existent column — actually `subjects.id` already exists, so this is not a real risk; the FK is to `subjects.id` which exists in the baseline schema).

**How to avoid:** Both schema changes (`subjects` new columns + `invites.subjectId`) can be in the same `npm run db:generate` run. They generate into a single migration file with correct ordering because Drizzle analyzes the dependency graph.

### Pitfall 5: Cookie expiry — session scope vs. persistent

**What goes wrong:** Developer adds `Max-Age=31536000` to `zt-subject` (copying from `zt-nav`), making the active-subject selection persistent across browser restarts. D-06 requires session-scope (clears on browser close = no `Max-Age` or `Expires`).

**How to avoid:** The `Set-Cookie` header for `zt-subject` must NOT include `Max-Age` or `Expires`. Session cookies in modern browsers clear when the session ends (tab/window close — behavior varies by browser's "continue where left off" settings, which is acceptable).

### Pitfall 6: Dashboard cessation card with null cessation log

**What goes wrong:** A practitioner switches to a client subject. `dashboard.tsx` calls `getCessationLog(ctx)` → returns `[]`. `cessationRows[0] ?? null` → null. `cessationDay = 0`. The phasing hero card renders "Day 0 / 150 DAYS — Acute Phase". The practitioner is confused.

**How to avoid:** Add a `hasCessationProgram: boolean` flag to the loader return. In the component, conditionally replace the phasing hero card with a "No program started" message when `hasCessationProgram === false`. Same guard needed in `protocol/cessation.tsx` and `protocol/index.tsx`.

### Pitfall 7: Build gate — `.server.ts` module leaking into client bundle

**What goes wrong:** `getActiveSubject` or any cookie-related server logic is accidentally imported by a client component. `npm run build` fails with "server-only module in client bundle" even when `typecheck` and `vitest` pass.

**How to avoid:** Keep all cookie-reading logic in `data.server.ts` (already `.server.ts` suffix). The `SubjectChip` component submits a plain HTML form — it does NOT import any server module. The layout loader (server-only) provides the subject list to the chip via `useLoaderData`.

### Pitfall 8: `getActiveSubject` with a stale/deleted subjectId in the cookie

**What goes wrong:** The cookie holds a `subjectId` that was deleted or belongs to a different tenant (e.g., after a reassignment or account change). The DB lookup returns no row. Without a fallback, `getActiveSubject` throws 404.

**How to avoid:** Implement the owner-subject fallback in `getActiveSubject`: if the cookie-specified subject is not found in the tenant, silently fall back to the owner subject (first subject in tenant). This makes the resolver self-healing.

---

## Runtime State Inventory

> Phase 1 adds new schema columns and a new route — it is not a rename/refactor. No runtime state inventory required.

However, one existing runtime record is relevant:

| Category | Items | Action Required |
|----------|-------|-----------------|
| Stored data | `subjects` table: 1 existing owner-subject row. No `dob`, `biologicalSex`, etc. columns yet. | Schema migration adds nullable columns — existing row unaffected (all NULL). |
| Stored data | `invites` table: any existing invite rows. No `subjectId` column yet. | Migration adds nullable column — existing rows get NULL (correct for owner-bootstrap invites). |
| Live service config | None relevant | — |
| OS-registered state | None relevant | — |
| Secrets/env vars | No new env vars needed | — |
| Build artifacts | None affected | — |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neon Postgres (DATABASE_URL) | Schema migrations | Assumed available (prod is live) | — | — |
| drizzle-kit | `npm run db:generate` + `npm run db:migrate` | Installed in devDependencies | 0.31.8 | — |
| better-auth | Auth hooks | Installed | 1.6.15 | — |
| Node.js crypto | `invites.server.ts` token generation | Built-in | — | — |

No missing dependencies.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `cd remix-app && npm test` |
| Full suite command | `cd remix-app && npm test && npm run typecheck && npm run build` |

Default test environment: `node`. Component tests use `// @vitest-environment jsdom` pragma per-file.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ONB-01 | `createSubject` writes row with all intake fields | unit | `npm test -- tests/lib/subjects.test.ts` | ❌ Wave 0 |
| ONB-01 | Schema migration: `subjects` has `dob`, `biologicalSex`, `programType` etc. | integration (schema lint) | `npm test -- tests/lib/schema-integrity.test.ts` | ❌ Wave 0 |
| ONB-02 | `generateInvite` with `subjectId` writes correct row | unit | `npm test -- tests/auth/invites-server.test.ts` | ✅ (extend) |
| ONB-02 | `resolveInviteByToken` returns `subjectId` when set | unit | `npm test -- tests/auth/invites-server.test.ts` | ✅ (extend) |
| ONB-02 | Client-role 403 after invite redemption | manual (SC-5/03.1 UAT) | Private window test — manual only | — |
| ONB-03 | `getActiveSubject` falls back to owner when cookie unset | unit | `npm test -- tests/lib/active-subject.test.ts` | ❌ Wave 0 |
| ONB-03 | `getActiveSubject` rejects cross-tenant cookie value | unit | `npm test -- tests/lib/active-subject.test.ts` | ❌ Wave 0 |
| ONB-03 | `assertSubjectAccess` Gate 1 still throws 403 for client role | unit | `npm test -- tests/lib/require-subject-ctx.test.ts` | ✅ (unchanged) |
| ONB-04 | Checklist returns `missing` when no lab_documents for subject | unit | `npm test -- tests/lib/checklist.test.ts` | ❌ Wave 0 |
| ONB-04 | Checklist returns `done` for labs only when approved extraction exists | unit | `npm test -- tests/lib/checklist.test.ts` | ❌ Wave 0 |
| ONB-04 | Checklist returns `done` for WHOOP when metrics with source=whoop exist | unit | `npm test -- tests/lib/checklist.test.ts` | ❌ Wave 0 |
| SC-5/03.1 | Invite redemption end-to-end (private window) | manual | Manual only — private window + DB verification | — |
| SC-5/03.1 | Client-role 403 on PHI route | manual | Manual — log in as client, attempt /dashboard | — |

### Sampling Rate

- **Per task commit:** `cd remix-app && npm test`
- **Per wave merge:** `cd remix-app && npm test && npm run typecheck && npm run build`
- **Phase gate:** Full suite green before `/gsd:verify-work`. Build gate is mandatory (typecheck + vitest can pass while build fails on `.server` module leaks).

### Wave 0 Gaps

- [ ] `tests/lib/subjects.test.ts` — covers `createSubject`, `listClientSubjects` (ONB-01)
- [ ] `tests/lib/active-subject.test.ts` — covers `getActiveSubject` fallback + cookie parse + cross-tenant rejection (ONB-03)
- [ ] `tests/lib/checklist.test.ts` — covers 3-state checklist logic for labs/genetics/WHOOP/report/protocol (ONB-04)
- [ ] Schema extension to `tests/auth/invites-server.test.ts` — add `subjectId` field assertions (ONB-02)

---

## Security Domain

`security_enforcement` is not explicitly set in `.planning/config.json` — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (invite redemption + session) | `better-auth` + existing `beforeSignUp` hook |
| V3 Session Management | Yes (active-subject cookie is session-scoped) | No `Max-Age`/`Expires` on `zt-subject` cookie |
| V4 Access Control | Yes (subject scoping, client-role 403) | `assertSubjectAccess` — reuse existing |
| V5 Input Validation | Yes (intake form fields) | Validate on server action; never trust client-supplied `subjectId` |
| V6 Cryptography | No new crypto needed | Existing `invites.server.ts` SHA-256 pattern unchanged |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client user reads another subject's PHI via cookie manipulation | Spoofing/Info Disclosure | `assertSubjectAccess` Gate 2 (cross-tenant) + Gate 1 (client → 403) in subject-switch action |
| Practitioner accesses unassigned client subject | Elevation of Privilege | `assertSubjectAccess` Gate 3 (practitioner + assignedSubjectIds) in subject-switch action |
| Invite bound to wrong `subjectId` (IDOR via form) | Spoofing/Tampering | `subjectId` at invite generation is server-resolved from `tenantId` — never from raw form input; practitioner selects from list of their own subjects |
| Client role bypasses PHI loader via direct URL | Elevation of Privilege | `requireSubjectCtx` → `assertSubjectAccess` Gate 1 is unchanged — already fires on every PHI loader |
| `zt-subject` cookie modified by client JS | Tampering | httpOnly flag prevents client JS read/write; server validates subjectId against DB + tenant on every request |

**The 03.1 residual UAT (client-role 403) is specifically testing Gate 1 of `assertSubjectAccess`. That gate is already implemented and unchanged in this phase. The UAT closes because real traffic with a real client account flows through it.**

---

## Open Questions

1. **Does the layout loader need to list ALL subjects for the chip, or just the active subject?**
   - What we know: The chip shows "Viewing: <name> ▾" with a dropdown. The dropdown must list owner + assigned clients.
   - What's unclear: Whether to load the subject list in `_app/layout.tsx` (runs every navigation) or lazy-load it in the chip's dropdown (one extra request on open).
   - Recommendation: Load the short list (typically 1–5 subjects in v1.1) in the layout loader. It's a simple `SELECT` from `subjects` filtered by `tenantId` — negligible overhead. Keeps the chip SSR-consistent.

2. **`getActiveSubject` — should it distinguish "owner subject" from "any first subject"?**
   - What we know: `getOwnerSubject` today returns the first subject for the tenant. In v1.1, the owner IS the first subject (seeded at bootstrap). A client subject is a second row.
   - What's unclear: If the tenant has multiple subjects and the cookie is unset, does the fallback reliably return the *owner*'s subject vs. a client's?
   - Recommendation: The `subjects` table has no `isOwner` flag today. For v1.1, the fallback should return the subject whose ID is *not* the active client (i.e., the original owner subject). Since the owner subject was created first, ordering by `createdAt ASC LIMIT 1` returns it. This is a simplification; Phase 2 may add an `isOwner` boolean or use the `tenants` table to track it.

3. **`programTypeEnum` vs. `varchar` for program type?**
   - Planner's call (Claude's Discretion). Recommendation: `pgEnum('program_type', [...])` for type safety and future constraint enforcement. The enum values are known and bounded. Matches repo style (`appRoleEnum`, `cessationPhaseEnum`).

---

## Sources

### Primary (HIGH confidence — live code reads)

- `remix-app/db/schema.ts` — subjects, invites, lab_documents, lab_extractions, subject_genotypes, consent_log, reports, protocol_versions tables + all enums
- `remix-app/app/lib/data.server.ts` — `getOwnerSubject` implementation + `TenantCtx`
- `remix-app/app/lib/authz.server.ts` — `requireSubjectCtx`, `assertSubjectAccess`, `requireUser`, `requireRole`, `CAPABILITIES`
- `remix-app/app/lib/invites.server.ts` — full invite lifecycle
- `remix-app/app/lib/auth.server.ts` — `beforeSignUp` + `databaseHooks` + `PendingInvite` interface
- `remix-app/app/lib/engine.ts` — `classifyMetricStatus`, `mapVariantToProtocol` (confirmed: no sex/age consumed)
- `remix-app/app/lib/db.server.ts` — `withTenantDb`, `TenantCtx`, cookie-path patterns
- `remix-app/app/lib/protocol-data.ts` — `CESSATION_START_DATE` constant + comment
- `remix-app/app/routes/_app/dashboard.tsx` — cessation null-handling (L177–185)
- `remix-app/app/routes/_app/protocol/index.tsx` — cessation null-handling (L63–71)
- `remix-app/app/routes/_app/layout.tsx` — cookie parsing pattern (`zt-nav`)
- `remix-app/app/components/shell/AppShell.tsx` — cookie write pattern (client-side)
- `remix-app/app/routes.ts` — explicit route table
- `grep -rn requireSubjectCtx|getOwnerSubject` — exhaustive call-site enumeration

### Secondary (MEDIUM confidence)

- React Router 7 docs: `Set-Cookie` on redirect responses — standard idiomatic pattern for session cookies in server-side frameworks; pattern consistent with existing `auth/logout.tsx` which sets cookie via `asResponse`.

---

## Metadata

**Confidence breakdown:**
- PHI loader call-sites: HIGH — enumerated by grep of live code
- Engine/reference-range analysis: HIGH — read `engine.ts` directly; no sex/age consumed
- Cessation null-handling: HIGH — read `dashboard.tsx` and `protocol/index.tsx` loaders directly
- Invite seam: HIGH — read both `invites.server.ts` and `auth.server.ts` hook implementations
- Cookie pattern: HIGH — read `layout.tsx` regex pattern + `AppShell.tsx` write pattern
- Schema delta: HIGH — read live schema.ts; enum conventions directly observed
- Checklist logic: HIGH — read `lab_extractions.status` enum + `consent_log` + `reports` tables

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (stable stack; no fast-moving dependencies)
